// dashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Client as MQTTClient, Message as MQTTMessage } from 'paho-mqtt';
import dayjs from 'dayjs';
import { FontAwesome } from '@expo/vector-icons';



// --- ENV & CONFIG ---
const BASE        = process.env.EXPO_PUBLIC_INFLUX_URL!;
const ORG         = encodeURIComponent(process.env.EXPO_PUBLIC_INFLUXDB_ORG!);
const TOKEN       = process.env.EXPO_PUBLIC_INFLUXDB_TOKEN!;
const BUCKET      = process.env.EXPO_PUBLIC_INFLUXDB_BUCKET!;
const MQTT_SERVER = process.env.EXPO_PUBLIC_MQTT_SERVER!;
const MQTT_PORT   = process.env.EXPO_PUBLIC_MQTT_PORT!;
const MQTT_USER   = process.env.EXPO_PUBLIC_MQTT_USER!;
const MQTT_PASS   = process.env.EXPO_PUBLIC_MQTT_PASSWORD!;
const MQTT_URI    = `ws://${MQTT_SERVER}:${MQTT_PORT}/mqtt`;

console.log('[ENV]', { BASE, ORG, TOKEN: TOKEN?.substr(0,8)+'…', BUCKET, MQTT_URI });

async function influx(flux: string): Promise<string> {
  console.log('[influx] ▶ Request flux:', flux.replace(/\s+/g,' '));
  const url = `${BASE}/api/v2/query?org=${ORG}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.flux',
      Accept: 'application/csv',
      Authorization: `Token ${TOKEN}`,
      'Accept-Encoding': 'gzip, deflate',
      'X-Requested-With': 'XMLHttpRequest',
      Connection: 'keep-alive',
    },
    body: flux,
  });
  console.log('[influx] ◀ Response status:', res.status);
  const text = await res.text();
  console.log('[influx] ◀ Response length:', text.length);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return text;
}

function lastField(csv: string): string[] {
  console.log('[csv] parsing lastField:', csv.split('\n').slice(0,3));
  return csv
    .trim()
    .split('\n')
    .filter(l => !l.startsWith('#') && l.includes(','))
    .map(l => l.split(',').pop()!.trim())
    .filter(v => v !== '_value' && v !== '');
}

function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

const UNITS: Record<string, string> = {
  temperature: '°C', humidity: '%', voltage: 'V',
  temperature_dht: '°C', humidity_dht: '%', voltage_ads: 'V',
  pzem_voltage: 'V', pzem_current: 'A', pzem_power: 'W',
  pzem_energy: 'kWh', pzem_frequency: 'Hz', pzem_power_factor: '',
};

export default function DashboardScreen() {
  const [locs, setLocs]       = useState<{ name: string; count: number }[]>([]);
  const [busy, setBusy]       = useState(true);
  const [err, setErr]         = useState<string | null>(null);

  const [open, setOpen]       = useState(false);
  const [modalLoc, setModalLoc] = useState('');
  const [sensors, setSensors] = useState<string[]>([]);
  const [modalBusy, setModalBusy] = useState(false);

  const [liveOpen, setLiveOpen]     = useState(false);
  const [selSensor, setSelSensor]   = useState('');
  const [metaTxt, setMetaTxt]       = useState('');
  const [rows, setRows]             = useState<{ name: string; data: string }[]>([]);
  const [liveBusy, setLiveBusy]     = useState(false);

  const mqttRef = useRef<MQTTClient | null>(null);
  const { width } = useWindowDimensions();
  const cols = width >= 1280 ? 4 : width >= 960 ? 3 : width >= 600 ? 2 : 1;

  // --- FETCH LOCATIONS ---
  useEffect(() => {
    console.log('[Dashboard] mount, fetching locations…');
    (async () => {
      try {
        const csv = await influx(`
          import "influxdata/influxdb/schema"
          schema.tagValues(bucket:"${BUCKET}",tag:"location")`);
        const locArr = lastField(csv);
        const counts = await Promise.all(locArr.map(async loc => {
          const c = await influx(`
            import "influxdata/influxdb/schema"
            schema.tagValues(bucket:"${BUCKET}",tag:"sensor_id",predicate:(r)=>r.location=="${loc}")`);
          return { name: loc, count: lastField(c).length };
        }));
        console.log('[Dashboard] locations:', counts);
        setLocs(counts);
      } catch (e: any) {
        console.error('[Dashboard] error fetching locations:', e);
        setErr(e.message);
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  // --- OPEN SENSORS DRAWER ---
  const openModal = async (loc: string) => {
    console.log('[Drawer] open sensors for location:', loc);
    setModalLoc(loc);
    setOpen(true);
    setModalBusy(true);
    try {
      const csv = await influx(`
        import "influxdata/influxdb/schema"
        schema.tagValues(bucket:"${BUCKET}",tag:"sensor_id",predicate:(r)=>r.location=="${loc}")`);
      const list = lastField(csv);
      console.log('[Drawer] sensors list:', list);
      setSensors(list);
    } catch (e: any) {
      console.error('[Drawer] error loading sensors:', e);
      setSensors([`Error: ${e.message}`]);
    } finally {
      setModalBusy(false);
    }
  };

  // --- OPEN LIVE DATA DRAWER ---
  const openLive = (sensor: string) => {
    console.log('[LiveDrawer] opening live for:', sensor, 'at location', modalLoc);
    setSelSensor(sensor);
    setMetaTxt('');
    setRows([]);
    setLiveOpen(true);
    setLiveBusy(true);

    mqttRef.current?.disconnect();
    const topic = `iot/${modalLoc}/${sensor}/${sensor}/data`;
    console.log('[MQTT] connect to', MQTT_URI, 'topic', topic);

    const client = new MQTTClient(MQTT_URI, `expo_${Math.random().toString(16).slice(2)}`);
    mqttRef.current = client;

    client.onMessageArrived = msg => {
      console.log('[MQTT] message arrived:', msg.payloadString);
      try {
        const obj = JSON.parse(msg.payloadString);
        const ts = obj.timestamp ? dayjs.unix(obj.timestamp).format('YYYY-MM-DD HH:mm:ss') : '';
        const meta = [
          `Location: ${obj.location||'—'}`,
          `Sensor ID: ${obj.sensor_id||'—'}`,
          ts && `Time: ${ts}`,
          obj.status?.ip && `IP: ${obj.status.ip}`,
          obj.status?.mac && `MAC: ${obj.status.mac}`,
          obj.status?.net_status && `Network: ${obj.status.net_status}`,
          obj.status?.uptime_sec && `Uptime: ${fmtUptime(obj.status.uptime_sec)}`
        ].filter(Boolean).join('\n');
        console.log('[LiveDrawer] metaTxt:', meta);
        setMetaTxt(meta);

        const list = Object.entries(obj.readings||{}).map(([k,v])=>({
          name: k,
          data: v==null?'—':typeof v==='number'?`${fmtNum(v)}${UNITS[k]||''}`:String(v)
        }));
        console.log('[LiveDrawer] data rows:', list);
        setRows(list);
      } catch (e) {
        console.error('[LiveDrawer] parse error:', e);
      }
      setLiveBusy(false);
    };

    client.connect({
      userName: MQTT_USER,
      password: MQTT_PASS,
      useSSL: false,
      onSuccess: () => {
        console.log('[MQTT] connected, subscribing to', topic);
        client.subscribe(topic);
      },
      onFailure: err => {
        console.error('[MQTT] connection failed:', err);
        setLiveBusy(false);
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      {/* Sticky Header */}
      <View className="px-6 pt-4 pb-2 bg-white shadow-md">
        <Text className="text-2xl font-extrabold text-indigo-700">
          Dashboard
        </Text>
      </View>

      {/* Main Grid */}
      {busy ? (
        <ActivityIndicator className="mt-20" size="large" color="#6366F1" />
      ) : err ? (
        <Text className="text-red-600 text-center mt-8">{err}</Text>
      ) : (
        <FlatList
          data={locs}
          numColumns={cols}
          key={cols}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openModal(item.name)}
              className="flex-1 m-2 p-6 bg-white rounded-xl shadow-lg"
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
                Platform.OS === 'android' ? { elevation: 6 } : undefined,
              ]}
            >
              <Text className="text-xs font-semibold uppercase text-indigo-500 mb-1">
                {item.name}
              </Text>
              <Text className="text-2xl font-extrabold text-gray-900">
                {item.count} sensor{item.count !== 1 && 's'}
              </Text>
            </Pressable>
          )}
        />
      )}

      {/* --- SENSORS DRAWER (full-screen) --- */}
    <Modal
  visible={open}
  animationType="slide"
  onRequestClose={() => setOpen(false)} 
>
  <SafeAreaView className="flex-1 bg-white">
    <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
      {/* Left chevron to close */}
      <Pressable
        onPress={() => setOpen(false)}
        hitSlop={{ top:12, bottom:12, left:12, right:12 }}
        className="p-1"
      >
        <FontAwesome name="chevron-down" size={24} color="#333" />
      </Pressable>

      {/* Title */}
      <Text className="flex-1 text-center text-lg font-bold text-gray-800">
        {modalLoc}
      </Text>

      {/* × button */}
      <Pressable
        onPress={() => setOpen(false)}
        hitSlop={{ top:12, bottom:12, left:12, right:12 }}
        className="p-1"
      >
        <Text className="text-2xl text-indigo-600">×</Text>
      </Pressable>
    </View>

    {/* Your sensor list */}
    {modalBusy ? (
      <ActivityIndicator className="mt-8" size="large" color="#6366F1" />
    ) : (
      <FlatList
        data={sensors}
        numColumns={cols}
        key={cols}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openLive(item)}
            className="flex-1 m-2 p-4 bg-white rounded-lg shadow-md"
            style={({ pressed }) => [
              { transform: [{ scale: pressed ? 0.97 : 1 }] },
              Platform.OS === 'android' ? { elevation: 4 } : undefined,
            ]}
          >
            <Text className="text-base font-medium text-gray-800">
              {item}
            </Text>
          </Pressable>
        )}
      />
    )}
  </SafeAreaView>
</Modal>


      {/* --- LIVE DATA DRAWER (full-screen) --- */}
     <Modal
  visible={liveOpen}
  animationType="slide"
  onRequestClose={() => {
    mqttRef.current?.disconnect();
    setLiveOpen(false);
  }}
>
  <SafeAreaView className="flex-1 bg-white">
    <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
      {/* Left chevron to close */}
      <Pressable
        onPress={() => {
          mqttRef.current?.disconnect();
          setLiveOpen(false);
        }}
        hitSlop={{ top:12, bottom:12, left:12, right:12 }}
        className="p-1"
      >
        <FontAwesome name="chevron-down" size={24} color="#333" />
      </Pressable>

      {/* Title */}
      <Text className="flex-1 text-center text-lg font-bold text-gray-800">
        {modalLoc} • {selSensor}
      </Text>

      {/* × button */}
      <Pressable
        onPress={() => {
          mqttRef.current?.disconnect();
          setLiveOpen(false);
        }}
        hitSlop={{ top:12, bottom:12, left:12, right:12 }}
        className="p-1"
      >
        <Text className="text-2xl text-indigo-600">×</Text>
      </Pressable>
    </View>

    {/* Your live‐data content */}
    {liveBusy ? (
      <ActivityIndicator className="mt-8" size="large" color="#6366F1" />
    ) : (
      <>
        <ScrollView className="mx-4 my-4 p-4 border-2 border-indigo-200 rounded-lg">
          <Text className="text-xs font-mono text-gray-700">
            {metaTxt || '—'}
          </Text>
        </ScrollView>
        <FlatList
          data={rows}
          numColumns={2}
          keyExtractor={i => i.name}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View
              className="flex-1 m-2 p-4 bg-white rounded-lg shadow-md"
              style={Platform.OS === 'android' ? { elevation: 2 } : undefined}
            >
              <Text className="text-sm font-bold text-gray-700 mb-1">
                {item.name}
              </Text>
              <Text className="text-base font-medium text-gray-900">
                {item.data}
              </Text>
            </View>
          )}
        />
      </>
    )}
  </SafeAreaView>
</Modal>

    </SafeAreaView>
  );
}


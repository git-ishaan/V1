// DashboardScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  TextInput,
  useWindowDimensions,
} from 'react-native';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';

// --- ENV & CONFIG ---
const BASE   = process.env.EXPO_PUBLIC_INFLUX_URL!;
const ORG    = encodeURIComponent(process.env.EXPO_PUBLIC_INFLUXDB_ORG!);
const TOKEN  = process.env.EXPO_PUBLIC_INFLUXDB_TOKEN!;
const BUCKET = process.env.EXPO_PUBLIC_INFLUXDB_BUCKET!;

console.log('[ENV]', {
  BASE,
  ORG,
  TOKEN: TOKEN.substr(0, 8) + '…',
  BUCKET,
});

// Display labels for each Flux field
const FIELD_LABELS: Record<string, string> = {
  readings_humidity_dht:      'Humidity (%RH)',
  readings_pzem_current:      'PzemCurrent (A)',
  readings_pzem_energy:       'PzemEnergy (kWh)',
  readings_pzem_frequency:    'PzemFrequency (Hz)',
  readings_pzem_power:        'Power (W)',
  readings_pzem_power_factor: 'PzemPowerFactor',
  readings_pzem_voltage:      'PzemVoltage (V)',
  readings_temperature_dht:   'Temperature (°C)',
  readings_voltage_ads:       'VoltageADS (V)',
};

// Default threshold values
const DEFAULT_THRESHOLDS: Record<string, number> = {
  readings_humidity_dht:      60,
  readings_pzem_current:      10,
  readings_pzem_energy:       100,
  readings_pzem_frequency:    60,
  readings_pzem_power:        500,
  readings_pzem_power_factor: 1,
  readings_pzem_voltage:      240,
  readings_temperature_dht:   30,
  readings_voltage_ads:       5,
};

// Poll options
const POLL_OPTIONS = [
  { label: '10 sec', value:   10_000 },
  { label: '30 sec', value:   30_000 },
  { label: '45 sec', value:   45_000 },
  { label: '1 min',  value:   60_000 },
  { label: '5 min',  value:  300_000 },
];

async function influx(flux: string): Promise<string> {
  console.log('[influx] ▶', flux.replace(/\s+/g, ' '));
  const res = await fetch(`${BASE}/api/v2/query?org=${ORG}`, {
    method: 'POST',
    headers: {
      'Content-Type':       'application/vnd.flux',
      Accept:               'application/csv',
      Authorization:        `Token ${TOKEN}`,
      'Accept-Encoding':    'gzip, deflate',
      Connection:           'keep-alive',
    },
    body: flux,
  });
  console.log('[influx] ◀ status', res.status);
  const text = await res.text();
  console.log('[influx] ◀ length', text.length);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return text;
}

function fmtNum(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400),
        h = Math.floor((sec % 86400) / 3600),
        m = Math.floor((sec % 3600) / 60),
        s = sec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

export default function DashboardScreen() {
  // --- State for locations & sensors ---
  const [locs,              setLocs]            = useState<{name:string;count:number}[]>([]);
  const [busy,              setBusy]            = useState(true);
  const [err,               setErr]             = useState<string|null>(null);
  const [refreshingLocs,    setRefreshingLocs]  = useState(false);

  const [open,              setOpen]            = useState(false);
  const [modalLoc,          setModalLoc]        = useState('');
  const [sensors,           setSensors]         = useState<string[]>([]);
  const [modalBusy,         setModalBusy]       = useState(false);
  const [refreshingSensors, setRefreshingSensors] = useState(false);

  // --- State for live‐view & polling ---
  const [liveOpen,     setLiveOpen]     = useState(false);
  const [selSensor,    setSelSensor]    = useState('');
  const [metaTxt,      setMetaTxt]      = useState('');
  const [rows,         setRows]         = useState<{key:string;name:string;data:string;num:number|null}[]>([]);
  const [liveBusy,     setLiveBusy]     = useState(false);

  const [pollInterval, setPollInterval] = useState<number|null>(null);
  const pollRef = useRef<NodeJS.Timeout|null>(null);

  // --- State for threshold config modal ---
  const [threshOpen,   setThreshOpen]   = useState(false);
  const [thresholds,   setThresholds]   = useState<Record<string,number>>(DEFAULT_THRESHOLDS);

  const { width } = useWindowDimensions();
  const cols = width >= 1280 ? 4 : width >= 960 ? 3 : width >= 600 ? 2 : 1;

  // --- Fetch locations (reusable) ---
  const fetchLocations = useCallback(async () => {
    setErr(null);
    try {
      const csv = await influx(`
        import "influxdata/influxdb/schema"
        schema.tagValues(bucket:"${BUCKET}",tag:"location")
      `);
      const locArr = csv
        .trim().split('\n')
        .filter(l => !l.startsWith('#') && l.includes(','))
        .map(l => l.split(',').pop()!.trim())
        .filter(v => v !== '_value');
      const counts = await Promise.all(locArr.map(async loc => {
        const c = await influx(`
          import "influxdata/influxdb/schema"
          schema.tagValues(bucket:"${BUCKET}",tag:"sensor_id",
            predicate:(r)=>r.location=="${loc}")
        `);
        const ids = c
          .trim().split('\n')
          .filter(l=>!l.startsWith('#')&&l.includes(','))
          .map(l=>l.split(',').pop()!.trim())
          .filter(v=>v!=='_value');
        return { name: loc, count: ids.length };
      }));
      setLocs(counts);
    } catch (e:any) {
      console.error('[Dashboard] error', e);
      setErr(e.message);
    }
  }, []);

  // --- Initial load of locations ---
  useEffect(() => {
    (async () => {
      setBusy(true);
      await fetchLocations();
      setBusy(false);
    })();
  }, [fetchLocations]);

  // --- Pull-to-refresh handler for locations ---
  const handleRefreshLocs = useCallback(async () => {
    setRefreshingLocs(true);
    await fetchLocations();
    setRefreshingLocs(false);
  }, [fetchLocations]);

  // --- Open sensors drawer ---
  const openModal = async (loc: string) => {
    setModalLoc(loc);
    setOpen(true);
    setModalBusy(true);
    try {
      const c = await influx(`
        import "influxdata/influxdb/schema"
        schema.tagValues(bucket:"${BUCKET}",tag:"sensor_id",
          predicate:(r)=>r.location=="${loc}")
      `);
      const ids = c
        .trim().split('\n')
        .filter(l=>!l.startsWith('#')&&l.includes(','))
        .map(l=>l.split(',').pop()!.trim())
        .filter(v=>v!=='_value');
      setSensors(ids);
    } catch (e:any) {
      console.error('[Drawer] error', e);
      setSensors([`Error: ${e.message}`]);
    } finally {
      setModalBusy(false);
    }
  };

  // --- Pull-to-refresh handler for sensors list ---
  const handleRefreshSensors = useCallback(async () => {
    setRefreshingSensors(true);
    try {
      const c = await influx(`
        import "influxdata/influxdb/schema"
        schema.tagValues(bucket:"${BUCKET}",tag:"sensor_id",
          predicate:(r)=>r.location=="${modalLoc}")
      `);
      const ids = c
        .trim().split('\n')
        .filter(l=>!l.startsWith('#')&&l.includes(','))
        .map(l=>l.split(',').pop()!.trim())
        .filter(v=>v!=='_value');
      setSensors(ids);
    } catch (e:any) {
      console.error('[Drawer Refresh] error', e);
      setSensors([`Error: ${e.message}`]);
    }
    setRefreshingSensors(false);
  }, [modalLoc]);

  // --- When live opens: load saved interval & thresholds ---
  useEffect(() => {
    if (!liveOpen) return;
    const keyI = `pollInterval:${modalLoc}:${selSensor}`;
    AsyncStorage.getItem(keyI).then(v => {
      const iv = v ? parseInt(v,10) : POLL_OPTIONS[0].value;
      setPollInterval(iv);
      console.log('[Live] loaded poll interval', iv);
    });
    const keyT = `thresholds:${modalLoc}:${selSensor}`;
    AsyncStorage.getItem(keyT).then(v => {
      if (v) setThresholds(JSON.parse(v));
      else setThresholds(DEFAULT_THRESHOLDS);
      console.log('[Live] loaded thresholds', v);
    });
  }, [liveOpen, modalLoc, selSensor]);

  // --- Polling setup ---
  useEffect(() => {
    if (!liveOpen || pollInterval == null) return;
    if (pollRef.current) clearInterval(pollRef.current);
    fetchLatest();
    pollRef.current = setInterval(fetchLatest, pollInterval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [liveOpen, selSensor, modalLoc, pollInterval]);

  // --- Fetch + parse the latest point ---
  const fetchLatest = async () => {
    setLiveBusy(true);
    try {
      const flux = `
        from(bucket:"${BUCKET}")
          |> range(start:-30d)
          |> filter(fn:(r)=>r.location=="${modalLoc}" and r.sensor_id=="${selSensor}")
          |> tail(n:1)
          |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")
      `;
      const csv = await influx(flux);
      const lines = csv
        .trim().split('\n')
        .filter(l=>!l.startsWith('#')&&l.trim());
      if (lines.length < 2) {
        setMetaTxt('—');
        setRows([]);
      } else {
        const headers = lines[0].split(',').map(h=>h.trim());
        const vals    = lines[1].split(',').map(v=>v.trim().replace(/^"|"$/g,''));
        const row: Record<string,string> = {};
        headers.forEach((h,i)=>row[h]=vals[i]||'');

        // Meta text
        const ts = row['_time']
          ? dayjs(row['_time']).format('YYYY-MM-DD HH:mm:ss')
          : '';
        setMetaTxt(
          `Location: ${row.location||'—'}\n`+
          `Sensor ID: ${row.sensor_id||'—'}\n`+
          (ts?`Time: ${ts}`:'')
        );

        // Build reading cards
        const list = Object.entries(row).flatMap(([key,val]) => {
          if (!key.startsWith('readings_')) return [];
          const num = Number(val);
          const isNum = !isNaN(num);
          const label = FIELD_LABELS[key] || key.replace(/^readings_/, '');
          const unitMatch = FIELD_LABELS[key]?.match(/\((.*)\)$/);
          const dataStr = isNum
            ? `${fmtNum(num)}${unitMatch?.[1]||''}`
            : val || '—';
          return [{ key, name: label, data: dataStr, num: isNum? num: null }];
        });
        setRows(list);
      }
    } catch (e:any) {
      console.error('[Live] fetch error', e);
      setMetaTxt(`Error: ${e.message}`);
      setRows([]);
    } finally {
      setLiveBusy(false);
    }
  };

  // --- Save new thresholds ---
  const saveThresholds = async () => {
    const key = `thresholds:${modalLoc}:${selSensor}`;
    await AsyncStorage.setItem(key, JSON.stringify(thresholds));
    console.log('[Threshold] saved', thresholds);
    setThreshOpen(false);
  };

  // --- When user picks a new poll interval ---
  const onIntervalChange = async (value:number) => {
    setPollInterval(value);
    const key = `pollInterval:${modalLoc}:${selSensor}`;
    await AsyncStorage.setItem(key, value.toString());
    console.log('[Live] saved poll interval', value);
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-indigo-50 to-white">

      {/* Header */}
      <View className="px-6 pt-4 pb-2 bg-white shadow-md">
        <Text className="text-2xl font-extrabold text-indigo-700">
          Dashboard
        </Text>
      </View>

      {/* Locations Grid */}
      {busy
        ? <ActivityIndicator className="mt-20" size="large" color="#6366F1"/>
        : err
          ? <Text className="text-red-600 text-center mt-8">{err}</Text>
          : <FlatList
              data={locs}
              numColumns={cols}
              key={cols}
              contentContainerStyle={{ padding:16 }}
              refreshing={refreshingLocs}
              onRefresh={handleRefreshLocs}
              renderItem={({item})=>(
                <Pressable
                  onPress={()=>openModal(item.name)}
                  className="flex-1 m-2 p-6 bg-white rounded-xl shadow-lg"
                  style={({pressed})=>[
                    { transform:[{ scale: pressed ? 0.97 : 1 }] },
                    Platform.OS==='android'?{ elevation:6 }:undefined
                  ]}
                >
                  <Text className="text-xs font-semibold uppercase text-indigo-500 mb-1">
                    {item.name}
                  </Text>
                  <Text className="text-2xl font-extrabold text-gray-900">
                    {item.count} sensor{item.count!==1&&'s'}
                  </Text>
                </Pressable>
              )}
            />
      }

      {/* Sensors Drawer */}
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={()=>setOpen(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
            <Pressable onPress={()=>setOpen(false)} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <FontAwesome name="chevron-down" size={24} color="#333"/>
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold text-gray-800">
              {modalLoc}
            </Text>
            <Pressable onPress={()=>setOpen(false)} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text className="text-2xl text-indigo-600">×</Text>
            </Pressable>
          </View>
          {modalBusy
            ? <ActivityIndicator className="mt-8" size="large" color="#6366F1"/>
            : <FlatList
                data={sensors}
                numColumns={cols}
                key={cols}
                contentContainerStyle={{ padding:16 }}
                refreshing={refreshingSensors}
                onRefresh={handleRefreshSensors}
                renderItem={({item})=>(
                  <Pressable
                    onPress={()=>{
                      setSelSensor(item);
                      setLiveOpen(true);
                    }}
                    className="flex-1 m-2 p-4 bg-white rounded-lg shadow-md"
                    style={({pressed})=>[
                      { transform:[{ scale: pressed ? 0.97 : 1 }] },
                      Platform.OS==='android'?{ elevation:4 }:undefined
                    ]}
                  >
                    <Text className="text-base font-medium text-gray-800">
                      {item}
                    </Text>
                  </Pressable>
                )}
              />
          }
        </SafeAreaView>
      </Modal>

      {/* Live Data Drawer */}
      <Modal
        visible={liveOpen}
        animationType="slide"
        onRequestClose={()=>{
          if(pollRef.current) clearInterval(pollRef.current);
          setLiveOpen(false);
        }}
      >
        <SafeAreaView className="flex-1 bg-white">

          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
            <Pressable onPress={()=>{
              if(pollRef.current) clearInterval(pollRef.current);
              setLiveOpen(false);
            }} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <FontAwesome name="chevron-down" size={24} color="#333"/>
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold text-gray-800">
              {modalLoc} • {selSensor}
            </Text>
            <Pressable onPress={()=>{
              if(pollRef.current) clearInterval(pollRef.current);
              setLiveOpen(false);
            }} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text className="text-2xl text-indigo-600">×</Text>
            </Pressable>
          </View>

          {/* Poll-interval picker */}
          <View className="px-4 pt-4">
            <Picker
              selectedValue={pollInterval ?? POLL_OPTIONS[0].value}
              onValueChange={onIntervalChange}
            >
              {POLL_OPTIONS.map(o=>(
                <Picker.Item key={o.value} label={o.label} value={o.value}/>
              ))}
            </Picker>
          </View>

          {/* Configure thresholds button */}
          <View className="px-4">
            <Pressable
              onPress={() => setThreshOpen(true)}
              className="bg-indigo-100 px-3 py-1 rounded"
            >
              <Text className="text-indigo-700 font-medium">
                Configure Thresholds
              </Text>
            </Pressable>
          </View>

          {/* Live-data content */}
          {liveBusy
            ? <ActivityIndicator className="mt-8" size="large" color="#6366F1"/>
            : <>
                {/* Meta info */}
                <ScrollView className="mx-4 my-4 p-4 border-2 border-indigo-200 rounded-lg">
                  <Text className="text-xs font-mono text-gray-700">
                    {metaTxt || '—'}
                  </Text>
                </ScrollView>

                {/* Reading cards */}
                <FlatList
                  data={rows}
                  numColumns={2}
                  keyExtractor={i=>i.key}
                  contentContainerStyle={{ padding:16 }}
                  renderItem={({item})=> {
                    const thr = thresholds[item.key];
                    const colorClass = (item.num != null && thr != null)
                      ? (item.num <= thr ? 'text-green-600' : 'text-red-600')
                      : 'text-gray-900';
                    return (
                      <View
                        className="flex-1 m-2 p-4 bg-white rounded-lg shadow-md"
                        style={Platform.OS==='android'?{ elevation:2 }:undefined}
                      >
                        <Text className="text-sm font-bold text-gray-700 mb-1">
                          {item.name}
                        </Text>
                        <Text className={`text-base font-medium ${colorClass}`}>
                          {item.data}
                        </Text>
                      </View>
                    );
                  }}
                />
              </>
          }
        </SafeAreaView>
      </Modal>

      {/* Threshold-configuration half-page modal */}
      <Modal
        visible={threshOpen}
        animationType="slide"
        transparent
        onRequestClose={()=>setThreshOpen(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-30">
          <View className="h-1/2 bg-white rounded-t-xl p-4">
            <Text className="text-lg font-bold mb-4">
              Configure Thresholds
            </Text>
            <ScrollView>
              {Object.entries(FIELD_LABELS).map(([key,label]) => (
                <View key={key} className="mb-3">
                  <Text className="mb-1">{label}</Text>
                  <TextInput
                    className="border border-gray-300 rounded px-2 py-1"
                    keyboardType="numeric"
                    value={String(thresholds[key] ?? '')}
                    onChangeText={txt =>
                      setThresholds(prev => ({
                        ...prev,
                        [key]: Number(txt)
                      }))
                    }
                  />
                </View>
              ))}
            </ScrollView>
            <View className="flex-row justify-end mt-4">
              <Pressable
                onPress={()=>setThreshOpen(false)}
                className="mr-6"
              >
                <Text>Cancel</Text>
              </Pressable>
              <Pressable onPress={saveThresholds}>
                <Text className="text-indigo-600 font-semibold">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

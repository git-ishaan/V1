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
  Switch,
  ToastAndroid,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';

// --- ENV & CONFIG ---
const BASE               = process.env.EXPO_PUBLIC_INFLUX_URL!;              // e.g. "https://us-west-2-1.aws.cloud2.influxdata.com"
const ORG                = encodeURIComponent(process.env.EXPO_PUBLIC_INFLUXDB_ORG!);  // your org name (URL-encoded)
const ORG_ID             = "0e2101ba58a959d6";                              // your 16-hex-char org ID
const TOKEN              = process.env.EXPO_PUBLIC_INFLUXDB_TOKEN!;         // token with query+write perms
const BUCKET             = process.env.EXPO_PUBLIC_INFLUXDB_BUCKET!;        // e.g. "iot"
const THRESH_BUCKET      = process.env.EXPO_PUBLIC_INFLUXDB_THRESHOLDS_BUCKET!; // e.g. "thresholds_config"
const THRESH_MEASUREMENT = 'metric_thresholds';

// Field labels for display:
const FIELD_LABELS: Record<string,string> = {
  readings_humidity_dht:      'Humidity (%RH)',
  readings_pzem_current:      'Current (A)',
  readings_pzem_energy:       'Energy (kWh)',
  readings_pzem_frequency:    'Frequency (Hz)',
  readings_pzem_power:        'Power (W)',
  readings_pzem_power_factor: 'Power Factor',
  readings_pzem_voltage:      'Voltage (V)',
  readings_temperature_dht:   'Temperature (°C)',
  readings_voltage_ads:       'Voltage ADS (V)',
};

// Default thresholds to seed the UI:
const DEFAULT_THRESHOLDS: Record<string,number> = {
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

// Poll-interval options:
const POLL_OPTIONS = [
  { label: '10 sec', value: 10000 },
  { label: '30 sec', value: 30000 },
  { label: '45 sec', value: 45000 },
  { label: '1 min',  value: 60000 },
  { label: '5 min',  value: 300000 },
];

// --- Helper to run Flux queries ---
async function influx(flux: string): Promise<string> {
  const res = await fetch(`${BASE}/api/v2/query?org=${ORG}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.flux',
      Accept:         'application/csv',
      Authorization:  `Token ${TOKEN}`,
    },
    body: flux,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Query failed (${res.status}): ${text}`);
  return text;
}

// --- InfluxDB threshold-write helper ---
function escapeTag(v: string): string {
  return v.replace(/,/g, '\\,').replace(/ /g, '\\ ').replace(/=/g, '\\=');
}
function escapeFieldString(v: string): string {
  return `"${v.replace(/"/g, '\\"')}"`;
}
async function writeThreshold(
  metricName: string,
  scopeType: 'global' | 'location' | 'sensor_id',
  scopeValue: string,
  level: string,
  minValue: number,
  maxValue: number,
  description?: string
): Promise<void> {
  const tags = [
    `metric_name=${escapeTag(metricName)}`,
    `scope_type=${escapeTag(scopeType)}`,
    `scope_value=${escapeTag(scopeValue)}`,
    `level=${escapeTag(level)}`,
  ].join(',');

  const fieldsArr = [
    `min_value=${minValue}`,
    `max_value=${maxValue}`,
  ];
  if (description) {
    fieldsArr.push(`description=${escapeFieldString(description)}`);
  }
  const fieldString = fieldsArr.join(',');
  const line = `${THRESH_MEASUREMENT},${tags} ${fieldString}`;

  const url = `${BASE}/api/v2/write?org=${ORG}&bucket=${THRESH_BUCKET}&precision=ns`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${TOKEN}`,
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: line,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Threshold write failed (${res.status}): ${err}`);
  }
}

// --- Main Component ---
export default function DashboardScreen() {
  // Locations & sensors
  const [locs, setLocs] = useState<{name:string;count:number}[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr]   = useState<string|null>(null);
  const [refreshingLocs, setRefreshingLocs] = useState(false);

  const [open, setOpen]           = useState(false);
  const [modalLoc, setModalLoc]   = useState('');
  const [sensors, setSensors]     = useState<string[]>([]);
  const [modalBusy, setModalBusy] = useState(false);
  const [refreshingSensors, setRefreshingSensors] = useState(false);

  // Live view & polling
  const [liveOpen, setLiveOpen]       = useState(false);
  const [selSensor, setSelSensor]     = useState('');
  const [metaTxt, setMetaTxt]         = useState('');
  const [rows, setRows]               = useState<{ key:string; name:string; data:string; num:number|null }[]>([]);
  const [liveBusy, setLiveBusy]       = useState(false);
  const [pollInterval, setPollInterval] = useState<number|null>(null);
  const pollRef = useRef<NodeJS.Timeout|null>(null);

  // Threshold config
  const [threshOpen, setThreshOpen]       = useState(false);
  const [thresholds, setThresholds]       = useState<Record<string,number>>(DEFAULT_THRESHOLDS);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const { width } = useWindowDimensions();
  const cols = width >= 1280 ? 4 : width >= 960 ? 3 : width >= 600 ? 2 : 1;

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    setErr(null);
    try {
      const csv = await influx(`
        import "influxdata/influxdb/schema"
        schema.tagValues(bucket:"${BUCKET}", tag:"location")
      `);
      const locArr = csv
        .trim().split('\n')
        .filter(l => !l.startsWith('#') && l.includes(','))
        .map(l => l.split(',').pop()!.trim())
        .filter(v => v !== '_value');

      const counts = await Promise.all(locArr.map(async loc => {
        const c = await influx(`
          import "influxdata/influxdb/schema"
          schema.tagValues(bucket:"${BUCKET}", tag:"sensor_id",
            predicate: (r) => r.location == "${loc}")
        `);
        const ids = c
          .trim().split('\n')
          .filter(l => !l.startsWith('#') && l.includes(','))
          .map(l => l.split(',').pop()!.trim())
          .filter(v => v !== '_value');
        return { name: loc, count: ids.length };
      }));

      setLocs(counts);
    } catch (e:any) {
      console.error('[fetchLocations]', e);
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setBusy(true);
      await fetchLocations();
      setBusy(false);
    })();
  }, [fetchLocations]);

  const handleRefreshLocs = useCallback(async () => {
    setRefreshingLocs(true);
    await fetchLocations();
    setRefreshingLocs(false);
  }, [fetchLocations]);

  // Open sensor list
  const openModal = async (loc: string) => {
    setModalLoc(loc);
    setOpen(true);
    setModalBusy(true);
    try {
      const c = await influx(`
        import "influxdata/influxdb/schema"
        schema.tagValues(bucket:"${BUCKET}", tag:"sensor_id",
          predicate: (r) => r.location == "${loc}")
      `);
      const ids = c
        .trim().split('\n')
        .filter(l => !l.startsWith('#') && l.includes(','))
        .map(l => l.split(',').pop()!.trim())
        .filter(v => v !== '_value');
      setSensors(ids);
    } catch (e:any) {
      console.error('[openModal]', e);
      setSensors([`Error: ${e.message}`]);
    } finally {
      setModalBusy(false);
    }
  };

  const handleRefreshSensors = useCallback(async () => {
    setRefreshingSensors(true);
    try {
      const c = await influx(`
        import "influxdata/influxdb/schema"
        schema.tagValues(bucket:"${BUCKET}", tag:"sensor_id",
          predicate: (r) => r.location == "${modalLoc}")
      `);
      const ids = c
        .trim().split('\n')
        .filter(l => !l.startsWith('#') && l.includes(','))
        .map(l => l.split(',').pop()!.trim())
        .filter(v => v !== '_value');
      setSensors(ids);
    } catch (e:any) {
      console.error('[refreshSensors]', e);
      setSensors([`Error: ${e.message}`]);
    }
    setRefreshingSensors(false);
  }, [modalLoc]);

  // Load saved polling & thresholds when opening live view
  useEffect(() => {
    if (!liveOpen) return;
    AsyncStorage.getItem(`pollInterval:${modalLoc}:${selSensor}`)
      .then(v => setPollInterval(v ? +v : POLL_OPTIONS[0].value));
    AsyncStorage.getItem(`thresholds:${modalLoc}:${selSensor}`)
      .then(v => v ? setThresholds(JSON.parse(v)) : setThresholds(DEFAULT_THRESHOLDS));
  }, [liveOpen, modalLoc, selSensor]);

  // Polling setup
  useEffect(() => {
    if (!liveOpen || pollInterval == null) return;
    if (pollRef.current) clearInterval(pollRef.current);
    fetchLatest();
    pollRef.current = setInterval(fetchLatest, pollInterval);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [liveOpen, modalLoc, selSensor, pollInterval]);

  // Fetch latest data point
  const fetchLatest = async () => {
    setLiveBusy(true);
    try {
      const flux = `
        from(bucket:"${THRESH_BUCKET}")
          |> range(start: -30d)
          |> filter(fn: (r) => r.location == "${modalLoc}" and r.sensor_id == "${selSensor}")
          |> tail(n: 1)
          |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")
      `;
      const csv = await influx(flux);
      const lines = csv
        .trim().split('\n')
        .filter(l => !l.startsWith('#') && l.trim());
      if (lines.length < 2) {
        setMetaTxt('—');
        setRows([]);
      } else {
        const hdr = lines[0].split(',').map(h => h.trim());
        const vals = lines[1].split(',').map(v => v.replace(/^"|"$/g, ''));
        const rec: any = {};
        hdr.forEach((h,i) => rec[h] = vals[i] || '');

        setMetaTxt(
          `Location: ${rec.location || '—'}\n` +
          `Sensor:   ${rec.sensor_id || '—'}\n` +
          (rec._time
            ? `Time: ${dayjs(rec._time).format('YYYY-MM-DD HH:mm:ss')}`
            : ''
          )
        );

        const list = Object.entries(rec).flatMap(([k,v]) => {
          if (!k.startsWith('readings_')) return [];
          const n = Number(v), isNum = !isNaN(n);
          const label = FIELD_LABELS[k] || k.replace(/^readings_/, '');
          const unit  = FIELD_LABELS[k]?.match(/\((.*)\)$/)?.[1] || '';
          return [{
            key:  k,
            name: label,
            data: isNum ? `${n.toFixed(2)}${unit}` : v,
            num:  isNum ? n : null
          }];
        });
        setRows(list);
      }
    } catch (e:any) {
      console.error('[fetchLatest]', e);
      setMetaTxt(`Error: ${e.message}`);
      setRows([]);
    }
    setLiveBusy(false);
  };

  // Save thresholds: AsyncStorage + InfluxDB
  const saveThresholds = async () => {
    // 1) store locally
    await AsyncStorage.setItem(
      `thresholds:${modalLoc}:${selSensor}`,
      JSON.stringify(thresholds)
    );

    // 2) push to InfluxDB
    for (const [field, maxVal] of Object.entries(thresholds)) {
      try {
        await writeThreshold(
          field,
          'sensor_id',
          selSensor,
          'critical',          // you can parametrize per-field if desired
          0,                   // min_value
          maxVal,
          `Threshold for ${field}`
        );
      } catch (e:any) {
        console.error('[writeThreshold]', e);
      }
    }

    // 3) feedback
    const msg = alertsEnabled
      ? 'Thresholds saved to InfluxDB. Alerts will fire based on your configured tasks.'
      : 'Thresholds saved locally and to InfluxDB.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('Saved', msg);
    }

    setThreshOpen(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-2 bg-white shadow-md">
        <Text className="text-2xl font-extrabold text-indigo-700">Dashboard</Text>
      </View>

      {/* Locations Grid */}
      {busy ? (
        <ActivityIndicator className="mt-20" size="large" color="#6366F1"/>
      ) : err ? (
        <Text className="text-red-600 text-center mt-8">{err}</Text>
      ) : (
        <FlatList
          data={locs}
          numColumns={cols}
          key={cols}
          contentContainerStyle={{ padding:16 }}
          refreshing={refreshingLocs}
          onRefresh={handleRefreshLocs}
          renderItem={({item})=>(
            <Pressable
              onPress={() => openModal(item.name)}
              className="flex-1 m-2 p-6 bg-white rounded-xl shadow-lg"
              style={({pressed})=>[
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
                Platform.OS === 'android' ? { elevation: 6 } : undefined
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

      {/* Sensors Modal */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
            <Pressable onPress={() => setOpen(false)} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <FontAwesome name="chevron-down" size={24} color="#333"/>
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold text-gray-800">{modalLoc}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text className="text-2xl text-indigo-600">×</Text>
            </Pressable>
          </View>
          {modalBusy ? (
            <ActivityIndicator className="mt-8" size="large" color="#6366F1"/>
          ) : (
            <FlatList
              data={sensors}
              numColumns={cols}
              key={cols}
              contentContainerStyle={{ padding:16 }}
              refreshing={refreshingSensors}
              onRefresh={handleRefreshSensors}
              renderItem={({item})=>(
                <Pressable
                  onPress={() => { setSelSensor(item); setLiveOpen(true); }}
                  className="flex-1 m-2 p-4 bg-white rounded-lg shadow-md"
                  style={({pressed})=>[
                    { transform: [{ scale: pressed ? 0.97 : 1 }] },
                    Platform.OS==='android' ? { elevation:4 } : undefined
                  ]}
                >
                  <Text className="text-base font-medium text-gray-800">{item}</Text>
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Live Data & Threshold Button */}
      <Modal
        visible={liveOpen}
        animationType="slide"
        onRequestClose={() => {
          if (pollRef.current) clearInterval(pollRef.current);
          setLiveOpen(false);
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
            <Pressable onPress={() => {
              if (pollRef.current) clearInterval(pollRef.current);
              setLiveOpen(false);
            }} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <FontAwesome name="chevron-down" size={24} color="#333"/>
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold text-gray-800">
              {modalLoc} • {selSensor}
            </Text>
            <Pressable onPress={() => {
              if (pollRef.current) clearInterval(pollRef.current);
              setLiveOpen(false);
            }} hitSlop={{top:12,bottom:12,left:12,right:12}}>
              <Text className="text-2xl text-indigo-600">×</Text>
            </Pressable>
          </View>

          {/* Poll interval picker */}
          <View className="px-4 pt-4">
            <Picker
              selectedValue={pollInterval ?? POLL_OPTIONS[0].value}
              onValueChange={async v => {
                setPollInterval(v);
                await AsyncStorage.setItem(`pollInterval:${modalLoc}:${selSensor}`, v.toString());
              }}
            >
              {POLL_OPTIONS.map(o => (
                <Picker.Item key={o.value} label={o.label} value={o.value}/>
              ))}
            </Picker>
          </View>

          {/* Configure Thresholds */}
          <View className="px-4">
            <Pressable onPress={() => setThreshOpen(true)} className="bg-indigo-100 px-3 py-1 rounded">
              <Text className="text-indigo-700 font-medium">Configure Thresholds</Text>
            </Pressable>
          </View>

          {liveBusy ? (
            <ActivityIndicator className="mt-8" size="large" color="#6366F1"/>
          ) : (
            <>
              <ScrollView className="mx-4 my-4 p-4 border-2 border-indigo-200 rounded-lg">
                <Text className="text-xs font-mono text-gray-700">{metaTxt || '—'}</Text>
              </ScrollView>
              <FlatList
                data={rows}
                numColumns={2}
                keyExtractor={i => i.key}
                contentContainerStyle={{ padding:16 }}
                renderItem={({item}) => {
                  const thr = thresholds[item.key];
                  const colorClass = (item.num != null && thr != null)
                    ? (item.num <= thr ? 'text-green-600' : 'text-red-600')
                    : 'text-gray-900';
                  return (
                    <View className="flex-1 m-2 p-4 bg-white rounded-lg shadow-md" style={Platform.OS==='android'?{elevation:2}:undefined}>
                      <Text className="text-sm font-bold text-gray-700 mb-1">{item.name}</Text>
                      <Text className={`text-base font-medium ${colorClass}`}>{item.data}</Text>
                    </View>
                  );
                }}
              />
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Threshold Configuration Modal */}
      <Modal visible={threshOpen} animationType="slide" transparent onRequestClose={() => setThreshOpen(false)}>
        <View className="flex-1 justify-end bg-black bg-opacity-30">
          <View className="h-1/2 bg-white rounded-t-xl p-4">
            <Text className="text-lg font-bold mb-4">Configure Thresholds</Text>
            <View className="flex-row items-center mb-4">
              <Text className="flex-1 text-base">Enable Alerts</Text>
              <Switch value={alertsEnabled} onValueChange={setAlertsEnabled}/>
            </View>
            <ScrollView>
              {Object.entries(FIELD_LABELS).map(([key,label]) => (
                <View key={key} className="mb-3">
                  <Text className="mb-1">{label}</Text>
                  <TextInput
                    className="border border-gray-300 rounded px-2 py-1"
                    keyboardType="numeric"
                    value={String(thresholds[key] ?? '')}
                    onChangeText={txt =>
                      setThresholds(prev => ({ ...prev, [key]: Number(txt) }))
                    }
                  />
                </View>
              ))}
            </ScrollView>
            <View className="flex-row justify-end mt-4">
              <Pressable onPress={() => setThreshOpen(false)} className="mr-6">
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

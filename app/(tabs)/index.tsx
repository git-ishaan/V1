// app/(tabs)/DashboardScreen.tsx
/* ------------------------------------------------------------------
 * Dashboard – live thresholds from backend + editable Configure UI
 * ----------------------------------------------------------------- */

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
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
  Switch,
  ToastAndroid,
  Alert,
  useWindowDimensions,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';

import { apiFetch } from '../api';

dayjs.extend(relativeTime);

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type SensorInfo = {
  sensor_id: string;
  status: 'up' | 'down';
  location: string;
  last_seen?: string;
};

type Probe = {
  name: string;
  value: string | number;
  timestamp: string;
  breached: boolean;
  threshold_min?: number | null;
  threshold_max?: number | null;
};

type Range = { min: number; max: number };

const FIELD_LABELS: Record<string, string> = {
  readings_humidity_dht: 'Humidity (%RH)',
  readings_pzem_current: 'Current (A)',
  readings_pzem_energy: 'Energy (kWh)',
  readings_pzem_frequency: 'Frequency (Hz)',
  readings_pzem_power: 'Power (W)',
  readings_pzem_power_factor: 'Power Factor',
  readings_pzem_voltage: 'Voltage (V)',
  readings_temperature_dht: 'Temperature (°C)',
  readings_voltage_ads: 'Voltage ADS (V)',
  readings_door: 'Door',
  readings_temperature_ds18b20: 'Temperature (°C)',
};

const DEFAULT_THRESHOLDS: Record<string, Range> = Object.fromEntries(
  Object.keys(FIELD_LABELS).map((k) => [k, { min: 0, max: 0 }])
);

const POLL_OPTIONS = [
  { label: '10 sec', value: 10000 },
  { label: '30 sec', value: 30000 },
  { label: '45 sec', value: 45000 },
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DashboardScreen() {
  /* ---------- state ---------- */
  const [allSensors, setAllSensors] = useState<SensorInfo[]>([]);
  const [locs, setLocs] = useState<
    { name: string; count: number; up: number; lastSeen?: string }[]
  >([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshingLocs, setRefreshingLocs] = useState(false);

  const [open, setOpen] = useState(false);
  const [modalLoc, setModalLoc] = useState('');
  const [sensors, setSensors] = useState<SensorInfo[]>([]);
  const [refreshingSensors, setRefreshingSensors] = useState(false);

  const [liveOpen, setLiveOpen] = useState(false);
  const [selSensor, setSelSensor] = useState('');
  const [metaTxt, setMetaTxt] = useState('');
  const [rows, setRows] = useState<
    {
      key: string;
      name: string;
      data: string;
      num: number | null;
      breached: boolean;
      min?: number | null;
      max?: number | null;
    }[]
  >([]);
  const [liveBusy, setLiveBusy] = useState(false);
  const [pollInterval, setPollInterval] = useState<number | null>(null);
  const [intervalMenuVisible, setIntervalMenuVisible] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------- thresholds UI ---------- */
  const [threshOpen, setThreshOpen] = useState(false);
  const [thresholds, setThresholds] = useState<Record<string, Range>>(DEFAULT_THRESHOLDS);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const { width } = useWindowDimensions();
  const cols = width >= 1280 ? 4 : width >= 960 ? 3 : width >= 600 ? 2 : 1;

  /* ------------------------------------------------------------------ */
  /* Fetch sensor list                                                   */
  /* ------------------------------------------------------------------ */
  const fetchSensorList = useCallback(async () => {
    setErr(null);
    try {
      const data: SensorInfo[] = await apiFetch('/sensors?utc=false');
      setAllSensors(data);

      const grouped: Record<
        string,
        { total: number; up: number; last?: string }
      > = {};
      data.forEach((s) => {
        if (!grouped[s.location])
          grouped[s.location] = { total: 0, up: 0, last: undefined };
        grouped[s.location].total += 1;
        if (s.status === 'up') grouped[s.location].up += 1;
        if (
          s.last_seen &&
          (!grouped[s.location].last ||
            dayjs(s.last_seen).isAfter(grouped[s.location].last))
        ) {
          grouped[s.location].last = s.last_seen;
        }
      });
      setLocs(
        Object.entries(grouped).map(([name, { total, up, last }]) => ({
          name,
          count: total,
          up,
          lastSeen: last,
        }))
      );
    } catch (e: any) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setBusy(true);
      await fetchSensorList();
      setBusy(false);
    })();
  }, [fetchSensorList]);

  const handleRefreshLocs = useCallback(async () => {
    setRefreshingLocs(true);
    await fetchSensorList();
    setRefreshingLocs(false);
  }, [fetchSensorList]);

  /* ------------------------------------------------------------------ */
  /* Location → sensors modal                                            */
  /* ------------------------------------------------------------------ */
  const openModal = (loc: string) => {
    setModalLoc(loc);
    setSensors(allSensors.filter((s) => s.location === loc));
    setOpen(true);
  };

  const handleRefreshSensors = useCallback(async () => {
    setRefreshingSensors(true);
    await fetchSensorList();
    setSensors(allSensors.filter((s) => s.location === modalLoc));
    setRefreshingSensors(false);
  }, [fetchSensorList, allSensors, modalLoc]);

  /* ------------------------------------------------------------------ */
  /* Live data                                                           */
  /* ------------------------------------------------------------------ */
  const fetchLatest = useCallback(async () => {
    if (!selSensor) return;
    setLiveBusy(true);
    try {
      const data = await apiFetch<any>(`/sensor/${selSensor}/details?utc=false`);

      setMetaTxt(
        `Location: ${data.location}\n` +
          `Sensor:   ${data.sensor_id}\n` +
          `Status:   ${data.status.toUpperCase()}\n` +
          (data.latest_probes?.[0]
            ? `Time: ${dayjs(data.latest_probes[0].timestamp).format(
                'YYYY-MM-DD HH:mm:ss'
              )}`
            : '')
      );

      const list = (data.latest_probes || []).map((p: Probe) => {
        const lbl = FIELD_LABELS[p.name] || p.name.replace(/^readings_/, '');
        const unit = FIELD_LABELS[p.name]?.match(/\((.*)\)$/)?.[1] || '';
        const isNum = typeof p.value === 'number';
        return {
          key: p.name,
          name: lbl,
          data: isNum ? `${(+p.value).toFixed(2)}${unit}` : String(p.value),
          num: isNum ? +p.value : null,
          breached: p.breached,
          min: p.threshold_min ?? null,
          max: p.threshold_max ?? null,
        };
      });
      setRows(list);
    } catch (e: any) {
      setMetaTxt(`Error: ${e.message}`);
      setRows([]);
    }
    setLiveBusy(false);
  }, [selSensor]);

  /* poll interval saved per sensor/location */
  useEffect(() => {
    if (!liveOpen) return;
    AsyncStorage.getItem(`pollInterval:${modalLoc}:${selSensor}`).then((v) =>
      setPollInterval(v ? +v : POLL_OPTIONS[0].value)
    );
  }, [liveOpen, modalLoc, selSensor]);

  useEffect(() => {
    if (!liveOpen || pollInterval == null) return;
    pollRef.current && clearInterval(pollRef.current);
    fetchLatest();
    pollRef.current = setInterval(fetchLatest, pollInterval);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, [liveOpen, selSensor, pollInterval, fetchLatest]);

  /* ------------------------------------------------------------------ */
  /* Helpers – save thresholds remotely                                  */
  /* ------------------------------------------------------------------ */
  async function saveThresholdsRemote() {
    const payloadArr = Object.entries(thresholds).map(([probe, range]) => ({
      sensor_id: selSensor,
      probe_name: probe,
      min_value: range.min,
      max_value: range.max,
      string_match: null as string | null,
    }));

    const active = payloadArr.filter(
      (t) =>
        typeof t.min_value === 'number' && typeof t.max_value === 'number'
    );
    if (active.length === 0) return;

    if (active.length === 1) {
      await apiFetch('/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(active[0]),
      });
    } else {
      await apiFetch(`/sensors/${selSensor}/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(active),
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-2 bg-white shadow-md">
        <Text className="text-2xl font-extrabold text-black-700">Dashboard</Text>
      </View>

      {/* Location cards */}
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
          refreshing={refreshingLocs}
          onRefresh={handleRefreshLocs}
          renderItem={({ item }) => {
            const lastSeenText =
              item.lastSeen && dayjs(item.lastSeen).isValid()
                ? dayjs(item.lastSeen).fromNow()
                : '—';
            return (
              <Pressable
                onPress={() => openModal(item.name)}
                android_ripple={{ color: 'rgba(99,102,241,0.2)' }}
                className="flex-1 m-2 p-6 bg-white rounded-xl shadow-lg border-l-4 border-indigo-500"
                style={({ pressed }) => [
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                  Platform.OS === 'android' ? { elevation: 6 } : undefined,
                ]}
              >
                <View className="flex-row justify-between">
                  <Text className="text-sm italic font-semibold text-gray-700">{item.name}</Text>
                  <Text className="text-xs text-gray-500">{lastSeenText}</Text>
                </View>
                <View className="flex-row justify-between items-end mt-6">
                  <Text className="text-3xl font-extrabold text-gray-900">
                    {item.count} Sensor{item.count !== 1 && 's'}
                  </Text>
                  <View className="items-end">
                    <Text className="text-lg font-medium text-green-600">{item.up} Up</Text>
                    <Text className="text-lg font-medium text-red-600">{item.count - item.up} Down</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* Sensors modal */}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
            <Pressable onPress={() => setOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FontAwesome name="chevron-down" size={24} color="#333" />
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold text-gray-800">{modalLoc}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text className="text-2xl text-indigo-600">×</Text>
            </Pressable>
          </View>

          {refreshingSensors ? (
            <ActivityIndicator className="mt-8" size="large" color="#6366F1" />
          ) : (
            <FlatList
              data={sensors}
              numColumns={cols}
              key={cols}
              contentContainerStyle={{ padding: 16 }}
              refreshing={refreshingSensors}
              onRefresh={handleRefreshSensors}
              renderItem={({ item }) => {
                const lastSeenText =
                  item.last_seen && dayjs(item.last_seen).isValid()
                    ? dayjs(item.last_seen).fromNow()
                    : '—';
                const statusColor =
                  item.status === 'up' ? 'text-green-600' : 'text-red-600';
                const borderColor =
                  item.status === 'up' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500';

                return (
                  <Pressable
                    onPress={() => {
                      setSelSensor(item.sensor_id);
                      setLiveOpen(true);
                    }}
                    android_ripple={{ color: 'rgba(45,212,191,0.2)' }}
                    className={`flex-1 m-2 p-4 bg-white rounded-xl shadow-md ${borderColor}`}
                    style={({ pressed }) => [
                      { transform: [{ scale: pressed ? 0.97 : 1 }] },
                      Platform.OS === 'android' ? { elevation: 4 } : undefined,
                    ]}
                  >
                    <View className="flex-row justify-between">
                      <Text className={`text-sm italic font-semibold ${statusColor}`}>
                        {item.status.toUpperCase()}
                      </Text>
                      <Text className="text-xs text-gray-500">{lastSeenText}</Text>
                    </View>
                    <View className="flex-1 justify-center mt-6">
                      <Text className="text-2xl font-extrabold text-gray-900">{item.sensor_id}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Live data modal */}
      <Modal
        visible={liveOpen}
        animationType="slide"
        onRequestClose={() => {
          pollRef.current && clearInterval(pollRef.current);
          setLiveOpen(false);
        }}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
            <Pressable
              onPress={() => {
                pollRef.current && clearInterval(pollRef.current);
                setLiveOpen(false);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <FontAwesome name="chevron-down" size={24} color="#333" />
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold text-gray-800">
              {modalLoc} • {selSensor}
            </Text>
            <Pressable
              onPress={() => {
                pollRef.current && clearInterval(pollRef.current);
                setLiveOpen(false);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text className="text-2xl text-indigo-600">×</Text>
            </Pressable>
          </View>

          {/* Controls row: Configure + interval */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <Pressable
              onPress={() => {
                /* initialise thresholds from current rows */
                const init: Record<string, Range> = { ...DEFAULT_THRESHOLDS };
                rows.forEach((r) => {
                  if (r.min != null && r.max != null) init[r.key] = { min: r.min, max: r.max };
                });
                setThresholds(init);
                setThreshOpen(true);
              }}
              android_ripple={{ color: 'rgba(99,102,241,0.2)' }}
            >
              <View className="flex-row items-center bg-indigo-100 px-3 py-1 rounded-md">
                <FontAwesome name="cog" size={20} color="#6366F1" />
                <Text className="ml-1 text-indigo-700 font-medium">Configure Thresholds</Text>
              </View>
            </Pressable>

            <View className="flex-row items-center">
              <Text className="mr-2 text-gray-700 font-medium">Interval:</Text>
              <Pressable
                onPress={() => setIntervalMenuVisible(true)}
                className="border border-gray-300 rounded-md px-3 py-1"
              >
                <Text className="text-gray-800">
                  {POLL_OPTIONS.find((o) => o.value === pollInterval)?.label ?? 'Select'}
                </Text>
              </Pressable>
            </View>
          </View>

          {liveBusy ? (
            <ActivityIndicator className="mt-8" size="large" color="#6366F1" />
          ) : (
            <>
              <View className="mx-4 my-4 bg-white rounded-xl shadow-md border border-indigo-200 p-4 w-full">
                <Text className="font-mono text-base text-gray-800">{metaTxt || '—'}</Text>
              </View>

              <FlatList
                data={rows}
                numColumns={2}
                keyExtractor={(i) => i.key}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <View
                    className={`flex-1 m-2 p-4 rounded-xl shadow-lg ${
                      item.breached ? 'bg-red-50 border-l-4 border-red-500' : 'bg-green-50 border-l-4 border-green-500'
                    }`}
                    style={Platform.OS === 'android' ? { elevation: 2 } : undefined}
                  >
                    <Text className="text-sm font-bold text-gray-700 mb-1">{item.name}</Text>
                    <Text className={item.breached ? 'text-red-600' : 'text-green-600'}>{item.data}</Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      Min: {item.min ?? '-'}    Max: {item.max ?? '-'}
                    </Text>
                  </View>
                )}
              />
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* Interval menu bottom sheet */}
      <Modal
        visible={intervalMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIntervalMenuVisible(false)}
      >
        <View className="flex-1 justify-end bg-neutral-600 bg-opacity-30">
          <View className="bg-white rounded-t-xl p-4">
            {POLL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={async () => {
                  setPollInterval(opt.value);
                  await AsyncStorage.setItem(`pollInterval:${modalLoc}:${selSensor}`, opt.value.toString());
                  setIntervalMenuVisible(false);
                }}
                className="py-3 border-b border-gray-200"
              >
                <Text className="text-base text-gray-800">{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setIntervalMenuVisible(false)} className="py-3">
              <Text className="text-center text-red-500">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Threshold configuration modal */}
      <Modal
        visible={threshOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setThreshOpen(false)}
      >
        <View className="flex-1 justify-end bg-neutral-600 bg-opacity-30">
          <View className="h-1/2 bg-white rounded-t-xl border-t-4 border-indigo-500 p-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Configure Thresholds</Text>
              <Pressable onPress={() => setThreshOpen(false)}>
                <FontAwesome name="times" size={24} color="#333" />
              </Pressable>
            </View>
            <View className="flex-row items-center mb-4">
              <Text className="flex-1 text-base">Enable Alerts</Text>
              <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} />
            </View>
            <ScrollView className="flex-1">
              {Object.entries(FIELD_LABELS).map(([key, label]) => {
                const { min, max } = thresholds[key] || { min: 0, max: 0 };
                return (
                  <View key={key} className="mb-4">
                    <Text className="mb-1">{label}</Text>
                    <View className="flex-row space-x-2">
                      <TextInput
                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                        placeholder="Min"
                        keyboardType="numeric"
                        value={String(min)}
                        onChangeText={(txt) =>
                          setThresholds((prev) => ({
                            ...prev,
                            [key]: { min: Number(txt) || 0, max: prev[key]?.max || 0 },
                          }))
                        }
                      />
                      <TextInput
                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                        placeholder="Max"
                        keyboardType="numeric"
                        value={String(max)}
                        onChangeText={(txt) =>
                          setThresholds((prev) => ({
                            ...prev,
                            [key]: { min: prev[key]?.min || 0, max: Number(txt) || 0 },
                          }))
                        }
                      />
                    </View>
                  </View>
                );
              })}
            </ScrollView>
            <View className="flex-row justify-end mt-4 space-x-4">
              <Pressable onPress={() => setThreshOpen(false)} className="px-4 py-2">
                <Text className="text-gray-700">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  // Persist locally
                  await AsyncStorage.setItem(
                    `thresholds:${modalLoc}:${selSensor}`,
                    JSON.stringify(thresholds)
                  );
                  // Push to backend
                  try {
                    await saveThresholdsRemote();
                    const msg = alertsEnabled
                      ? 'Thresholds saved to server; alerts enabled.'
                      : 'Thresholds saved to server.';
                    if (Platform.OS === 'android')
                      ToastAndroid.show(msg, ToastAndroid.SHORT);
                    else Alert.alert('Saved', msg);
                  } catch (e: any) {
                    Alert.alert('Error', `Failed to save thresholds: ${e.message}`);
                  }
                  setThreshOpen(false);
                  fetchLatest(); // refresh display with new limits
                }}
                className="px-4 py-2 bg-indigo-600 rounded-lg"
              >
                <Text className="text-white font-semibold">Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

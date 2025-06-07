/* ------------------------------------------------------------------
 * Dashboard – Modular React Native Dashboard Screen
 * Live thresholds from backend + editable Configure UI
 * ----------------------------------------------------------------- */

import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  FlatList,
  View,
  Text,
  ActivityIndicator,
  Platform,
  ToastAndroid,
  Alert,
  useWindowDimensions,
} from 'react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import types
import { SensorInfo, Range } from '../../types/dashboard';

// Import constants
import {
  FIELD_LABELS,
  DEFAULT_THRESHOLDS,
  POLL_OPTIONS,
} from '../../constants/dashboard';

// Import hooks
import {
  useSensorList,
  useLiveData,
  useThresholds,
} from '../../hooks/dashboard';

// Import components
import {
  LocationCard,
  SensorsModal,
  LiveDataModal,
  ThresholdConfigModal,
  IntervalMenuModal,
} from '../../components/dashboard';

dayjs.extend(relativeTime);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function DashboardScreen() {
  /* ---------- state ---------- */
  const [busy, setBusy] = useState(true);
  const [refreshingLocs, setRefreshingLocs] = useState(false);
  const [open, setOpen] = useState(false);
  const [modalLoc, setModalLoc] = useState('');
  const [sensors, setSensors] = useState<SensorInfo[]>([]);
  const [refreshingSensors, setRefreshingSensors] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  const [selSensor, setSelSensor] = useState('');
  const [intervalMenuVisible, setIntervalMenuVisible] = useState(false);
  const [threshOpen, setThreshOpen] = useState(false);

  const { width } = useWindowDimensions();
  const cols = width >= 1280 ? 4 : width >= 960 ? 3 : width >= 600 ? 2 : 1;

  /* ---------- hooks ---------- */
  const { allSensors, locs, err, fetchSensorList } = useSensorList();
  const {
    rows,
    metaTxt,
    liveBusy,
    pollInterval,
    setPollInterval,
    pollRef,
    fetchLatest,
  } = useLiveData(selSensor, modalLoc, liveOpen);
  const {
    thresholds,
    setThresholds,
    alertsEnabled,
    setAlertsEnabled,
    saveThresholdsRemote,
  } = useThresholds();

  /* ---------- effects ---------- */
  useEffect(() => {
    (async () => {
      setBusy(true);
      await fetchSensorList();
      setBusy(false);
    })();
  }, [fetchSensorList]);

  /* ---------- handlers ---------- */
  const handleRefreshLocs = useCallback(async () => {
    setRefreshingLocs(true);
    await fetchSensorList();
    setRefreshingLocs(false);
  }, [fetchSensorList]);

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

  const handleSensorPress = (sensorId: string) => {
    setSelSensor(sensorId);
    setLiveOpen(true);
  };

  const handleCloseLiveModal = () => {
    pollRef.current && clearInterval(pollRef.current);
    setLiveOpen(false);
  };

  const handleConfigureThresholds = () => {
    const init: Record<string, Range> = { ...DEFAULT_THRESHOLDS };
    rows.forEach((r) => {
      if (r.min != null && r.max != null)
        init[r.key] = { min: r.min, max: r.max };
    });
    setThresholds(init);
    setThreshOpen(true);
  };

  const handleIntervalSelect = async (value: number) => {
    setPollInterval(value);
    await AsyncStorage.setItem(
      `pollInterval:${modalLoc}:${selSensor}`,
      value.toString()
    );
    setIntervalMenuVisible(false);
  };

  const handleThresholdChange = (
    key: string,
    field: 'min' | 'max',
    value: number
  ) => {
    setThresholds((prev) => ({
      ...prev,
      [key]: {
        min: field === 'min' ? value : prev[key]?.min || 0,
        max: field === 'max' ? value : prev[key]?.max || 0,
      },
    }));
  };

  const handleSaveThresholds = async () => {
    // Persist locally
    await AsyncStorage.setItem(
      `thresholds:${modalLoc}:${selSensor}`,
      JSON.stringify(thresholds)
    );
    // Push to backend
    try {
      await saveThresholdsRemote(selSensor);
      const msg = alertsEnabled
        ? 'Thresholds saved to server; alerts enabled.'
        : 'Thresholds saved to server.';
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
      else Alert.alert('Saved', msg);
    } catch (e: any) {
      Alert.alert('Error', `Failed to save thresholds: ${e.message}`);
    }
    setThreshOpen(false);
    fetchLatest(); // refresh display with new limits
  };

  /* ---------- render ---------- */
  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-2 bg-white shadow-md">
        <Text className="text-2xl font-extrabold text-black-700">
          Dashboard
        </Text>
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
          renderItem={({ item }) => (
            <LocationCard item={item} onPress={openModal} />
          )}
        />
      )}

      {/* Sensors modal */}
      <SensorsModal
        visible={open}
        modalLoc={modalLoc}
        sensors={sensors}
        cols={cols}
        refreshingSensors={refreshingSensors}
        onClose={() => setOpen(false)}
        onRefresh={handleRefreshSensors}
        onSensorPress={handleSensorPress}
      />

      {/* Live data modal */}
      <LiveDataModal
        visible={liveOpen}
        modalLoc={modalLoc}
        selSensor={selSensor}
        metaTxt={metaTxt}
        rows={rows}
        liveBusy={liveBusy}
        pollInterval={pollInterval}
        pollOptions={POLL_OPTIONS}
        onClose={handleCloseLiveModal}
        onConfigureThresholds={handleConfigureThresholds}
        onIntervalPress={() => setIntervalMenuVisible(true)}
      />

      {/* Interval menu bottom sheet */}
      <IntervalMenuModal
        visible={intervalMenuVisible}
        options={POLL_OPTIONS}
        onClose={() => setIntervalMenuVisible(false)}
        onSelect={handleIntervalSelect}
      />

      {/* Threshold configuration modal */}
      <ThresholdConfigModal
        visible={threshOpen}
        thresholds={thresholds}
        alertsEnabled={alertsEnabled}
        fieldLabels={FIELD_LABELS}
        onClose={() => setThreshOpen(false)}
        onThresholdChange={handleThresholdChange}
        onAlertsToggle={setAlertsEnabled}
        onSave={handleSaveThresholds}
      />
    </SafeAreaView>
  );
}

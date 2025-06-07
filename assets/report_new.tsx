/* ------------------------------------------------------------------
 * Report – Modular React Native Report Screen
 * REST API version (cleaned columns, formatting)
 * ----------------------------------------------------------------- */

import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';

// Import types
import { TimeRange } from '../types/report';

// Import constants
import {
  TIME_RANGE_OPTIONS,
  AGGREGATION_WINDOW_OPTIONS,
} from '../constants/report';

// Import hooks
import { useSensorData, useReport, useReportExport } from '../hooks/report';

// Import components
import { ReportForm, ReportModal, BottomSheetMenu } from '../components/report';

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Report() {
  /* ---------- Menu states ---------- */
  const [locMenu, setLocMenu] = useState(false);
  const [senMenu, setSenMenu] = useState(false);
  const [rngMenu, setRngMenu] = useState(false);
  const [aggMenu, setAggMenu] = useState(false);

  /* ---------- Hooks ---------- */
  const {
    locations,
    sensors,
    location,
    sensor,
    tagBusy,
    tagErr,
    setLocation,
    setSensor,
  } = useSensorData();

  const {
    range,
    setRange,
    aggWindow,
    setAggWindow,
    busy,
    err,
    rows,
    cols,
    open,
    setOpen,
    runQuery,
    rangeLabel,
  } = useReport();

  const { promptDownload } = useReportExport();

  /* ---------- Handlers ---------- */
  const handleLocationSelect = (value: string) => {
    setLocation(value);
    setLocMenu(false);
  };

  const handleSensorSelect = (value: string) => {
    setSensor(value);
    setSenMenu(false);
  };

  const handleRangeSelect = (value: string) => {
    const [u, n] = value.split(':');
    setRange({ [u]: +n });
    setRngMenu(false);
  };

  const handleAggWindowSelect = (value: string) => {
    setAggWindow(value);
    setAggMenu(false);
  };

  const handleSubmit = () => {
    runQuery(location, sensor);
  };

  const handleDownload = () => {
    promptDownload(cols, rows, location, sensor);
  };

  const formatRangeLabel = (opt: string) => {
    return opt.startsWith('hours')
      ? `Last ${opt.split(':')[1]} hr`
      : `Last ${opt.split(':')[1]} d`;
  };

  /* ---------- Render ---------- */
  return (
    <SafeAreaView className="flex-1 bg-gradient-to-b from-indigo-50 to-white">
      {/* Header */}
      <View className="px-6 pt-4 pb-2 bg-white shadow-md">
        <Text className="text-2xl font-extrabold text-black-700">Report</Text>
      </View>

      {tagBusy ? (
        <ActivityIndicator className="mt-20" size="large" color="#6366F1" />
      ) : tagErr ? (
        <Text className="text-red-600 text-center mt-8">{tagErr}</Text>
      ) : (
        <ScrollView className="p-4">
          <ReportForm
            location={location}
            sensor={sensor}
            rangeLabel={rangeLabel()}
            aggWindow={aggWindow}
            busy={busy}
            err={err}
            onLocationPress={() => setLocMenu(true)}
            onSensorPress={() => setSenMenu(true)}
            onRangePress={() => setRngMenu(true)}
            onAggWindowPress={() => setAggMenu(true)}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      )}

      {/* Report Results Modal */}
      <ReportModal
        visible={open}
        location={location}
        sensor={sensor}
        cols={cols}
        rows={rows}
        onClose={() => setOpen(false)}
        onDownload={handleDownload}
      />

      {/* Location Selection Menu */}
      <BottomSheetMenu
        visible={locMenu}
        options={locations}
        onClose={() => setLocMenu(false)}
        onSelect={handleLocationSelect}
      />

      {/* Sensor Selection Menu */}
      <BottomSheetMenu
        visible={senMenu}
        options={sensors}
        onClose={() => setSenMenu(false)}
        onSelect={handleSensorSelect}
      />

      {/* Time Range Selection Menu */}
      <BottomSheetMenu
        visible={rngMenu}
        options={TIME_RANGE_OPTIONS}
        onClose={() => setRngMenu(false)}
        onSelect={handleRangeSelect}
        formatLabel={formatRangeLabel}
      />

      {/* Aggregation Window Selection Menu */}
      <BottomSheetMenu
        visible={aggMenu}
        options={AGGREGATION_WINDOW_OPTIONS}
        onClose={() => setAggMenu(false)}
        onSelect={handleAggWindowSelect}
      />
    </SafeAreaView>
  );
}

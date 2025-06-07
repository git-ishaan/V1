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

export default function Report() {
  /* ---------- state ---------- */
  const [allSensors, setAllSensors] = useState<
    { location: string; sensor_id: string }[]
  >([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [sensors, setSensors] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [sensor, setSensor] = useState('');
  const [range, setRange] = useState<{ [u: string]: number }>({ hours: 1 });
  const [aggWindow, setAggWindow] = useState<string>('5m');

  const [tagBusy, setTagBusy] = useState(true);
  const [tagErr, setTagErr] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  const [locMenu, setLocMenu] = useState(false);
  const [senMenu, setSenMenu] = useState(false);
  const [rngMenu, setRngMenu] = useState(false);
  const [aggMenu, setAggMenu] = useState(false);

  const { width } = useWindowDimensions();

  /* ------------------------------------------------------------------ */
  /* Load locations + sensors                                            */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      setTagBusy(true);
      try {
        const data: { location: string; sensor_id: string }[] = await apiFetch(
          '/sensors?utc=false'
        );
        setAllSensors(data);
        const locs = [...new Set(data.map((d) => d.location))].sort();
        setLocations(locs);
        setLocation(locs[0] ?? '');
      } catch (e: any) {
        setTagErr(e.message);
      } finally {
        setTagBusy(false);
      }
    })();
  }, []);

  /* sensors list depends on chosen location */
  useEffect(() => {
    const list = allSensors
      .filter((s) => s.location === location)
      .map((s) => s.sensor_id);
    setSensors(list);
    setSensor(list[0] ?? '');
  }, [location, allSensors]);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */
  const isNumeric = (v: any) => typeof v === 'number' && !isNaN(v);

  const formatValue = (key: string, val: any) => {
    if (key === 'timestamp') {
      return dayjs(val).isValid()
        ? dayjs(val).format('YYYY-MM-DD HH:mm:ss')
        : val;
    }
    if (isNumeric(val)) {
      return Number(val)
        .toFixed(4)
        .replace(/\.?0+$/, ''); // trim zeros
    }
    return String(val);
  };

  /* ------------------------------------------------------------------ */
  /* Run report                                                          */
  /* ------------------------------------------------------------------ */
  const runQuery = useCallback(async () => {
    if (!location || !sensor) return;
    setBusy(true);
    setErr(null);

    try {
      const [[unit, num]] = Object.entries(range);
      const stopISO = dayjs().toISOString();
      const startISO = dayjs()
        .subtract(num, unit as any)
        .toISOString();

      const body = {
        time_range_start: startISO,
        time_range_stop: stopISO,
        location,
        sensor_id: sensor,
        aggregation_window: aggWindow,
      };

      const raw: Record<string, any>[] = await apiFetch('/report?utc=false', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!Array.isArray(raw) || raw.length === 0) {
        setErr('No data returned.');
        setRows([]);
        setCols([]);
        return;
      }

      /* derive and clean columns */
      const undesired = new Set(['_start', '_stop', '_measurement', 'topic']);
      const keys = Object.keys(raw[0]).filter(
        (k) => !undesired.has(k) && !k.startsWith('_')
      );
      setCols(keys);

      /* format rows */
      const formatted = raw.map((r) => {
        const obj: Record<string, any> = {};
        keys.forEach((k) => (obj[k] = formatValue(k, r[k])));
        return obj;
      });
      setRows(formatted);
      setOpen(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [location, sensor, range, aggWindow]);

  /* ------------------------------------------------------------------ */
  /* CSV / PDF helpers                                                   */
  /* ------------------------------------------------------------------ */
  const downloadCSV = useCallback(async () => {
    const header = cols.map((c) => `"${FRIENDLY[c] || c}"`).join(',');
    const body = rows
      .map((r) =>
        cols.map((c) => `"${String(r[c]).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const csv = [header, body].join('\n');
    const path = FileSystem.documentDirectory! + 'report.csv';
    await FileSystem.writeAsStringAsync(path, csv);
    await Sharing.shareAsync(path);
  }, [cols, rows]);

  const downloadPDF = useCallback(async () => {
    const ths = cols.map((c) => `<th>${FRIENDLY[c] || c}</th>`).join('');
    const trs = rows
      .map(
        (r) =>
          `<tr>${cols.map((c) => `<td>${String(r[c])}</td>`).join('')}</tr>`
      )
      .join('');
    const html = `
    <html><head><style>
      body{font-family:Arial;padding:20px;}
      h1{text-align:center;color:#4F46E5;}
      table{width:100%;border-collapse:collapse;table-layout:fixed;}
      th,td{border:1px solid #CBD5E0;padding:6px;word-wrap:break-word;}
      th{background:#E0E7FF;} tr:nth-child(even){background:#F8FAFC;}
    </style></head><body>
      <h1>Report: ${location} • ${sensor}</h1>
      <table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  }, [cols, rows, location, sensor]);

  const promptDownload = () =>
    Alert.alert('Download as…', 'Choose format', [
      { text: 'PDF', onPress: downloadPDF },
      { text: 'CSV', onPress: downloadCSV },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const rangeLabel = () => {
    const [u, v] = Object.entries(range)[0];
    return u === 'hours' ? `Last ${v} hr` : `Last ${v} d`;
  };

  /* ------------------------------------------------------------------ */
  /* UI                                                                  */
  /* ------------------------------------------------------------------ */
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
          <View className="bg-white rounded-xl shadow-lg p-6">
            {/* Location */}
            <Text className="text-sm font-semibold text-gray-800">
              Location
            </Text>
            <Pressable
              onPress={() => setLocMenu(true)}
              className="mt-1 bg-white rounded-lg shadow-md p-4"
            >
              <Text className="text-gray-800">{location}</Text>
            </Pressable>

            {/* Sensor */}
            <Text className="mt-4 text-sm font-semibold text-gray-800">
              Sensor
            </Text>
            <Pressable
              onPress={() => setSenMenu(true)}
              className="mt-1 bg-white rounded-lg shadow-md p-4"
            >
              <Text className="text-gray-800">{sensor}</Text>
            </Pressable>

            {/* Time range */}
            <Text className="mt-4 text-sm font-semibold text-gray-800">
              Time range
            </Text>
            <Pressable
              onPress={() => setRngMenu(true)}
              className="mt-1 bg-white rounded-lg shadow-md p-4"
            >
              <Text className="text-gray-800">{rangeLabel()}</Text>
            </Pressable>

            {/* Aggregation window */}
            <Text className="mt-4 text-sm font-semibold text-gray-800">
              Aggregation window
            </Text>
            <Pressable
              onPress={() => setAggMenu(true)}
              className="mt-1 bg-white rounded-lg shadow-md p-4"
            >
              <Text className="text-gray-800">{aggWindow}</Text>
            </Pressable>

            {/* Submit */}
            <Pressable
              onPress={runQuery}
              className="mt-6 bg-indigo-600 rounded-lg py-3 items-center shadow-lg"
              style={({ pressed }) => [
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <Text className="text-white font-bold">Submit</Text>
            </Pressable>
            {busy && <ActivityIndicator className="mt-4" color="#6366F1" />}
            {err && (
              <Text className="text-red-600 mt-4 text-center">{err}</Text>
            )}
          </View>
        </ScrollView>
      )}

      {/* Results Modal */}
      <Modal visible={open} animationType="slide">
        <SafeAreaView className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-2 border-b border-gray-200">
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text className="text-2xl text-gray-800">×</Text>
            </Pressable>
            <Text className="flex-1 text-center text-lg font-bold text-gray-800">
              {location} • {sensor}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Info + Download */}
          <View className="flex-row justify-between items-center px-4 py-2">
            <Text className="text-sm text-gray-600">Rows: {rows.length}</Text>
            <Pressable
              onPress={promptDownload}
              className="bg-indigo-600 px-3 py-1 rounded-md shadow"
            >
              <Text className="text-white font-medium">Download ↓</Text>
            </Pressable>
          </View>

          {/* Scrollable table */}
          <View className="flex-1">
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
              <View style={{ minWidth: width * 1.2 }}>
                {/* Header row */}
                <View className="flex-row bg-indigo-100">
                  {cols.map((c) => (
                    <View key={c} className="w-32 border border-gray-300 p-2">
                      <Text className="text-xs font-bold uppercase text-gray-700 text-center">
                        {FRIENDLY[c] || c}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* Data rows */}
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                  {rows.map((r, i) => (
                    <View
                      key={i}
                      className={`flex-row ${
                        i % 2 ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      {cols.map((c) => (
                        <View
                          key={c}
                          className="w-32 border border-gray-300 p-2"
                        >
                          <Text className="text-xs text-gray-600 text-center">
                            {r[c]}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Bottom-sheet menus */}
      {[
        {
          vis: locMenu,
          options: locations,
          onClose: () => setLocMenu(false),
          onSelect: (v: string) => {
            setLocation(v);
            setLocMenu(false);
          },
        },
        {
          vis: senMenu,
          options: sensors,
          onClose: () => setSenMenu(false),
          onSelect: (v: string) => {
            setSensor(v);
            setSenMenu(false);
          },
        },
        {
          vis: rngMenu,
          options: [
            'hours:1',
            'hours:2',
            'hours:5',
            'days:1',
            'days:7',
            'days:15',
            'days:30',
          ],
          onClose: () => setRngMenu(false),
          onSelect: (v: string) => {
            const [u, n] = v.split(':');
            setRange({ [u]: +n });
            setRngMenu(false);
          },
        },
        {
          vis: aggMenu,
          options: ['1m', '5m', '10m', '30m', '1h', '1d'],
          onClose: () => setAggMenu(false),
          onSelect: (v: string) => {
            setAggWindow(v);
            setAggMenu(false);
          },
        },
      ].map((m, i) => (
        <Modal
          key={i}
          visible={m.vis}
          transparent
          animationType="slide"
          onRequestClose={m.onClose}
        >
          <View className="flex-1 justify-end bg-neutral-600 bg-opacity-30">
            <View className="bg-white rounded-t-xl p-4">
              {m.options.map((opt) => {
                const label =
                  i === 2
                    ? opt.startsWith('hours')
                      ? `Last ${opt.split(':')[1]} hr`
                      : `Last ${opt.split(':')[1]} d`
                    : opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => m.onSelect(opt)}
                    className="py-3 border-b border-gray-200"
                  >
                    <Text className="text-base text-gray-800">{label}</Text>
                  </Pressable>
                );
              })}
              <Pressable onPress={m.onClose} className="py-3">
                <Text className="text-center text-red-500">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ))}
    </SafeAreaView>
  );
}

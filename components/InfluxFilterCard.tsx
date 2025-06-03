import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';

const TIME_OPTS = [
  { label: 'Last 1 hr', value: { hours: 1 } },
  { label: 'Last 2 hr', value: { hours: 2 } },
  { label: 'Last 5 hr', value: { hours: 5 } },
  { label: 'Last 1 day', value: { days: 1 } },
  { label: 'Last 7 days', value: { days: 7 } },
  { label: 'Last 15 days', value: { days: 15 } },
  { label: 'Last 30 days', value: { days: 30 } },
  { label: 'Last 60 days', value: { days: 60 } },
];

type Props = {
  locations: string[];
  sensors: string[];
};

export default function InfluxFilterCard({ locations, sensors }: Props) {
  /* ------------ local UI state ------------- */
  const [location, setLocation] = useState(locations[0]);
  const [sensor, setSensor] = useState(sensors[0]);
  const [range, setRange] = useState(TIME_OPTS[0].value);
  const [open, setOpen] = useState(false);

  /* ------------ query state ---------------- */
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const queryInflux = async () => {
    setLoading(true);
    setError(null);
    try {
      const unit = range.hours ? 'hour' : 'day';
      const value = range.hours || range.days;
      const since = dayjs().subtract(value || 0, unit).toISOString();

      const flux = `
        from(bucket: "${process.env.EXPO_PUBLIC_INFLUXDB_BUCKET}")
          |> range(start: ${since})
          |> filter(fn: (r) => r["location"] == "${location}")
          |> filter(fn: (r) => r["sensor_id"] == "${sensor}")
          |> sort(columns: ["_time"], desc: true)
      `;

      const resp = await fetch(
        `${process.env.EXPO_PUBLIC_INFLUXDB}/api/v2/query?org=default`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.flux',
            Accept: 'application/csv',
            Authorization:
              'Basic ' +
              btoa(
                `${process.env.EXPO_PUBLIC_INFLUXDB_USER}:${process.env.EXPO_PUBLIC_INFLUXDB_PASSWORD}`
              ),
          },
          body: flux,
        }
      );

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const csv = await resp.text(); // simple CSV; parse minimal
      const lines = csv.trim().split('\n').filter((l) => !l.startsWith('#'));
      const out = lines.map((l) => {
        const parts = l.split(',');
        return {
          time: parts[3],
          field: parts[4],
          value: parts[5],
        };
      });
      setRows(out);
      setOpen(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  /* ------------- UI ------------------ */
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.label}>Location</Text>
        <Picker selectedValue={location} onValueChange={setLocation}>
          {locations.map((l) => (
            <Picker.Item key={l} label={l} value={l} />
          ))}
        </Picker>

        <Text style={styles.label}>Sensor ID</Text>
        <Picker selectedValue={sensor} onValueChange={setSensor}>
          {sensors.map((s) => (
            <Picker.Item key={s} label={s} value={s} />
          ))}
        </Picker>

        <Text style={styles.label}>Time range</Text>
        <Picker
          selectedValue={JSON.stringify(range)}
          onValueChange={(v) => setRange(JSON.parse(v))}
        >
          {TIME_OPTS.map((o) => (
            <Picker.Item
              key={o.label}
              label={o.label}
              value={JSON.stringify(o.value)}
            />
          ))}
        </Picker>

        <Pressable style={styles.button} onPress={queryInflux}>
          <Text style={styles.buttonText}>Apply</Text>
        </Pressable>

        {loading && <ActivityIndicator style={{ marginTop: 8 }} />}
        {error && <Text style={styles.error}>Error: {error}</Text>}
      </View>

      {/* ----------- full‑screen results modal ---------- */}
      <Modal visible={open} animationType="slide">
        <SafeAreaView style={styles.modalSafe}>
          <Pressable style={styles.close} onPress={() => setOpen(false)}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
          <Text style={styles.modalTitle}>{`${location} • ${sensor}`}</Text>
          <ScrollView horizontal>
            <View style={styles.table}>
              <View style={[styles.row, styles.headRow]}>
                <Text style={[styles.cell, styles.head, { flex: 1.6 }]}>
                  Time
                </Text>
                <Text style={[styles.cell, styles.head, { flex: 1 }]}>
                  Field
                </Text>
                <Text style={[styles.cell, styles.head, { flex: 1 }]}>
                  Value
                </Text>
              </View>
              {rows.map((r, i) => (
                <View
                  key={i}
                  style={[
                    styles.row,
                    i % 2 ? { backgroundColor: '#f5f5f5' } : null,
                  ]}
                >
                  <Text style={[styles.cell, { flex: 1.6 }]}>{r.time}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>{r.field}</Text>
                  <Text style={[styles.cell, { flex: 1 }]}>{r.value}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 14,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 4,
  },
  label: { fontWeight: '600', marginTop: 12 },
  button: {
    marginTop: 18,
    backgroundColor: '#007aff',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  error: { color: '#d22', marginTop: 8 },
  modalSafe: { flex: 1, backgroundColor: '#fff' },
  close: { alignSelf: 'flex-end', padding: 16 },
  closeText: { fontSize: 28, lineHeight: 28 },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    alignSelf: 'center',
  },
  table: { margin: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  row: { flexDirection: 'row' },
  headRow: { backgroundColor: '#ececec' },
  head: { fontWeight: '700' },
  cell: { padding: 10 },
});

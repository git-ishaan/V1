






// Dashboard.tsx
// Dashboard.tsx
// Dashboard.tsx










// Dashboard.tsx

// Dashboard.tsx

// import React, { useEffect, useState } from 'react';
// import {
//   SafeAreaView,
//   FlatList,
//   ScrollView,
//   View,
//   Text,
//   Pressable,
//   Modal,
//   StyleSheet,
//   ActivityIndicator,
//   Platform,
//   useWindowDimensions,
// } from 'react-native';
// import { mqttClient } from '../../utils/mqttClient';  // your TCP‐backed mqtt.js client

// /* ─── ENV ─── */
// const BASE     = process.env.EXPO_PUBLIC_INFLUX_URL!;
// const ORG      = encodeURIComponent(process.env.EXPO_PUBLIC_INFLUXDB_ORG!);
// const TOKEN    = process.env.EXPO_PUBLIC_INFLUXDB_TOKEN!;
// const BUCKET   = process.env.EXPO_PUBLIC_INFLUXDB_BUCKET!;
// /* ──────────── */

// /* Flux helper for listing locations & sensors */
// const influx = async (flux: string) => {
//   const res = await fetch(`${BASE}/api/v2/query?org=${ORG}`, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/vnd.flux',
//       Accept: 'application/csv',
//       Authorization: `Token ${TOKEN}`,
//     },
//     body: flux,
//   });
//   if (!res.ok) throw new Error(`Influx ${res.status}: ${await res.text()}`);
//   return res.text();
// };
// const lastField = (csv: string) =>
//   csv
//     .trim()
//     .split('\n')
//     .filter((l) => !l.startsWith('#') && l.includes(','))
//     .map((l) => l.split(',').pop()!.trim())
//     .filter((v) => v !== '_value' && v !== '');

// const ACCENTS = [
//   '#FFCDD2', '#F8BBD0', '#E1BEE7', '#D1C4E9',
//   '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2',
//   '#B2DFDB', '#C8E6C9',
// ];

// export default function DashboardScreen() {
//   // ─── State: locations ───
//   const [locs, setLocs] = useState<{ name: string; count: number }[]>([]);
//   const [busy, setBusy] = useState(true);
//   const [err, setErr]   = useState<string | null>(null);

//   // ─── State: location modal (sensor list) ───
//   const [open, setOpen]           = useState(false);
//   const [modalLoc, setModalLoc]   = useState<string>('');
//   const [sensors, setSensors]     = useState<string[]>([]);
//   const [modalBusy, setModalBusy] = useState(false);

//   // ─── State: sensor modal (live data) ───
//   const [sensorModalOpen, setSensorModalOpen] = useState(false);
//   const [selectedSensor, setSelectedSensor]   = useState<string>('');
//   const [sensorTopic, setSensorTopic]         = useState<string>('');
//   const [sensorData, setSensorData]           = useState<{ time: string; msg: string }[]>([]);
//   const [sensorModalBusy, setSensorModalBusy] = useState(false);

//   // ─── Responsive layout ───
//   const { width } = useWindowDimensions();
//   const cols = width >= 1280 ? 4 : width >= 960 ? 3 : width >= 600 ? 2 : 1;

//   const SHADOW = '#00000025';
//   const SURF   = '#f9fafc';
//   const LABEL  = '#424242';
//   const VALUE  = '#1b1b1b';

//   // ─── Initialize Influx locations on mount ───
//   useEffect(() => {
//     (async () => {
//       try {
//         const csvLoc = await influx(`
//           import "influxdata/influxdb/schema"
//           schema.tagValues(bucket:"${BUCKET}", tag:"location")
//         `);
//         const locations = lastField(csvLoc);

//         const counts = await Promise.all(
//           locations.map(async (loc) => {
//             const csv = await influx(`
//               import "influxdata/influxdb/schema"
//               schema.tagValues(
//                 bucket:"${BUCKET}",
//                 tag:"sensor_id",
//                 predicate: (r) => r.location == "${loc}"
//               )
//             `);
//             return { name: loc, count: lastField(csv).length };
//           })
//         );
//         setLocs(counts);
//       } catch (e: any) {
//         setErr(e.message);
//       } finally {
//         setBusy(false);
//       }
//     })();
//   }, []);

//   // ─── Open location modal & fetch sensors ───
//   const openModal = async (loc: string) => {
//     setModalLoc(loc);
//     setModalBusy(true);
//     setOpen(true);
//     try {
//       const csv = await influx(`
//         import "influxdata/influxdb/schema"
//         schema.tagValues(
//           bucket:"${BUCKET}", tag:"sensor_id",
//           predicate: (r) => r.location == "${loc}"
//         )
//       `);
//       setSensors(lastField(csv));
//     } catch (e: any) {
//       setSensors([`Error: ${e.message}`]);
//     } finally {
//       setModalBusy(false);
//     }
//   };

//   // ─── Subscribe over TCP when sensor modal opens ───
//   useEffect(() => {
//     if (!sensorTopic) return;
  
//     console.log('[Dashboard] sensorTopic →', sensorTopic);
//     console.log('[MQTT] client.connected?', mqttClient.connected);
  
//     // clear old data + show loading
//     setSensorData([]);
//     setSensorModalBusy(true);
  
//     const doSub = () => {
//       console.log('[MQTT] subscribing to', sensorTopic);
//       mqttClient.subscribe(sensorTopic, { qos: 0 }, (err) => {
//         setSensorModalBusy(false);
//         if (err) console.error('[MQTT] subscribe error', err);
//         else console.log('[MQTT] subscribed OK');
//       });
//     };
  
//     if (mqttClient.connected) {
//       doSub();
//     } else {
//       console.log('[MQTT] not yet connected, waiting for connect…');
//       const onConn = () => {
//         console.log('[MQTT] got connect event, now subscribing');
//         doSub();
//         mqttClient.off('connect', onConn);
//       };
//       mqttClient.on('connect', onConn);
//     }
  
//     const onMsg = (t: string, payload: Buffer) => {
//       if (t === sensorTopic) {
//         console.log('[MQTT] message', payload.toString());
//         setSensorData((prev) => [
//           ...prev,
//           { time: new Date().toLocaleTimeString(), msg: payload.toString() },
//         ]);
//       }
//     };
//     mqttClient.on('message', onMsg);
  
//     return () => {
//       mqttClient.unsubscribe(sensorTopic, (err) => {
//         if (err) console.error('[MQTT] unsubscribe error', err);
//         else console.log('[MQTT] unsubscribed from', sensorTopic);
//       });
//       mqttClient.off('message', onMsg);
//     };
//   }, [sensorTopic]);
  

//   // ─── Open sensor modal: set topic ───
//   const openSensorModal = (sensor: string) => {
//     setSelectedSensor(sensor);
//     setSensorModalOpen(true);
//     setSensorTopic(`iot/${modalLoc}/${sensor}/${sensor}/data`);
//   };

//   // ─── Close sensor modal ───
//   const closeSensorModal = () => {
//     setSensorModalOpen(false);
//     setSensorTopic('');
//   };

//   return (
//     <SafeAreaView style={[styles.safe, { backgroundColor: SURF }]}>
//       {busy ? (
//         <ActivityIndicator style={{ marginTop: 40 }} color={VALUE} />
//       ) : err ? (
//         <Text style={{ color: 'red', margin: 20 }}>{err}</Text>
//       ) : (
//         <FlatList
//           data={locs}
//           numColumns={cols}
//           key={cols}
//           contentContainerStyle={styles.pad}
//           renderItem={({ item, index }) => (
//             <Pressable
//               onPress={() => openModal(item.name)}
//               style={({ pressed }) => [
//                 styles.card,
//                 {
//                   backgroundColor: ACCENTS[index % ACCENTS.length],
//                   shadowColor: SHADOW,
//                 },
//                 pressed && { transform: [{ scale: 0.96 }] },
//                 Platform.OS === 'android' && { elevation: 6 },
//               ]}
//             >
//               <Text style={[styles.title, { color: LABEL }]}>
//                 {item.name}
//               </Text>
//               <Text style={[styles.value, { color: VALUE }]}>
//                 {item.count} sensor{item.count !== 1 && 's'}
//               </Text>
//             </Pressable>
//           )}
//         />
//       )}

//       {/* ── Modal: sensor list ── */}
//       <Modal visible={open} animationType="slide">
//         <SafeAreaView style={[styles.safe, { backgroundColor: SURF }]}>
//           <Pressable style={styles.close} onPress={() => setOpen(false)}>
//             <Text style={styles.closeTx}>×</Text>
//           </Pressable>
//           <Text style={styles.titleBig}>{modalLoc}</Text>

//           {modalBusy ? (
//             <ActivityIndicator style={{ marginTop: 30 }} color={VALUE} />
//           ) : (
//             <FlatList
//               data={sensors}
//               numColumns={cols}
//               key={cols}
//               contentContainerStyle={styles.sensorList}
//               renderItem={({ item, index }) => (
//                 <Pressable
//                   onPress={() => openSensorModal(item)}
//                   style={[
//                     styles.sensorCard,
//                     {
//                       backgroundColor: ACCENTS[index % ACCENTS.length],
//                       shadowColor: SHADOW,
//                     },
//                     Platform.OS === 'android' && { elevation: 4 },
//                   ]}
//                 >
//                   <Text style={[styles.sensorText, { color: LABEL }]}>
//                     {item}
//                   </Text>
//                 </Pressable>
//               )}
//             />
//           )}
//         </SafeAreaView>
//       </Modal>

//       {/* ── Sensor Data Modal ── */}
//       <Modal visible={sensorModalOpen} animationType="slide">
//         <SafeAreaView style={[styles.safe, { backgroundColor: SURF }]}>
//           <Pressable style={styles.close} onPress={closeSensorModal}>
//             <Text style={styles.closeTx}>×</Text>
//           </Pressable>
//           <Text style={styles.titleBig}>
//             {modalLoc} • {selectedSensor}
//           </Text>

//           {sensorModalBusy ? (
//             <ActivityIndicator style={{ marginTop: 30 }} color={VALUE} />
//           ) : (
//             <ScrollView horizontal contentContainerStyle={{ padding: GAP }}>
//               <View style={styles.table}>
//                 <View style={styles.tableRowHeader}>
//                   <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Time</Text>
//                   <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Data</Text>
//                 </View>
//                 {sensorData.map((r, i) => (
//                   <View
//                     key={i}
//                     style={[
//                       styles.tableRow,
//                       i % 2 === 1 && styles.rowAlt,
//                     ]} 
//                   >
//                     <Text style={[styles.tableCell, { flex: 1 }]}>
//                       {r.time}
//                     </Text>
//                     <Text style={[styles.tableCell, { flex: 3 }]}>
//                       {r.msg}
//                     </Text>
//                   </View>
//                 ))}
//               </View>
//             </ScrollView>
//           )}
//         </SafeAreaView>
//       </Modal>
//     </SafeAreaView>
//   );
// }

// const GAP = 14;

// const styles = StyleSheet.create({
//   safe: { flex: 1 },
//   pad: { padding: GAP },
//   card: {
//     flex: 1,
//     margin: GAP / 2,
//     borderRadius: 18,
//     paddingVertical: 26,
//     paddingHorizontal: 24,
//     minHeight: 120,
//     justifyContent: 'center',
//     shadowOpacity: 0.18,
//     shadowRadius: 8,
//     shadowOffset: { width: 0, height: 5 },
//   },
//   title: {
//     fontSize: 14,
//     fontWeight: '600',
//     textTransform: 'uppercase',
//     letterSpacing: 0.4,
//     marginBottom: 6,
//   },
//   value: { fontSize: 28, fontWeight: '700' },

//   close: { alignSelf: 'flex-end', padding: 16 },
//   closeTx: { fontSize: 28, lineHeight: 28 },

//   titleBig: {
//     alignSelf: 'center',
//     fontSize: 20,
//     fontWeight: '700',
//     marginTop: 4,
//     marginBottom: 12,
//   },

//   sensorList: { padding: GAP },
//   sensorCard: {
//     flex: 1,
//     margin: GAP / 2,
//     borderRadius: 12,
//     paddingVertical: 20,
//     paddingHorizontal: 16,
//     alignItems: 'center',
//     justifyContent: 'center',
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     shadowOffset: { width: 0, height: 3 },
//   },
//   sensorText: { fontSize: 16, fontWeight: '600' },

//   /* Table styles */
//   table: {
//     borderWidth: StyleSheet.hairlineWidth,
//     borderColor: '#ddd',
//     borderRadius: 8,
//     overflow: 'hidden',
//     minWidth: 300,
//   },
//   tableRowHeader: {
//     flexDirection: 'row',
//     backgroundColor: '#e3f2fd',
//     minHeight: 40,
//     alignItems: 'center',
//   },
//   tableRow: {
//     flexDirection: 'row',
//     minHeight: 40,
//     alignItems: 'center',
//   },
//   tableHeaderCell: {
//     fontWeight: '600',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     textTransform: 'uppercase',
//     fontSize: 12,
//   },
//   tableCell: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     fontSize: 14,
//   },
//   rowAlt: { backgroundColor: '#fafafa' },
// });

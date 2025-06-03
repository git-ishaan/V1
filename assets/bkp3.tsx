/* ────────────────────────────────────────────────────────────
   dashboard.tsx – MQTT live cards (no raw‑payload logging)
   ──────────────────────────────────────────────────────────── */

   import React, {
    useEffect, useState, useRef
  } from 'react';
  import {
    SafeAreaView, FlatList, View, Text, Pressable, Modal,
    StyleSheet, ActivityIndicator, Platform, useWindowDimensions
  } from 'react-native';
  import { Client as MQTTClient, Message as MQTTMessage } from 'paho-mqtt';
  import dayjs from 'dayjs';
  
  /* ─── Influx env (location/sensor discovery) ─── */
  const BASE   = process.env.EXPO_PUBLIC_INFLUX_URL!;
  const ORG    = encodeURIComponent(process.env.EXPO_PUBLIC_INFLUXDB_ORG!);
  const TOKEN  = process.env.EXPO_PUBLIC_INFLUXDB_TOKEN!;
  const BUCKET = process.env.EXPO_PUBLIC_INFLUXDB_BUCKET!;
  
  /* ─── MQTT creds ─── */
  const MQTT_URI  = 'ws://168.235.89.106:58080/mqtt';
  const MQTT_USER = 'oct20240001';
  const MQTT_PASS = 'oct20240001';
  
  /* ─── helpers ─── */
  const influx = async (flux:string) => {
    const res = await fetch(`${BASE}/api/v2/query?org=${ORG}`,{
      method:'POST',
      headers:{
        'Content-Type':'application/vnd.flux',
        Accept:'application/csv',
        Authorization:`Token ${TOKEN}`,
      },
      body:flux,
    });
    if(!res.ok) throw new Error(await res.text());
    return res.text();
  };
  const lastField = (csv:string)=>
    csv.trim().split('\n')
       .filter(l=>!l.startsWith('#')&&l.includes(','))
       .map(l=>l.split(',').pop()!.trim())
       .filter(v=>v!=='_value'&&v!=='');
  const fmtNum=(v:number)=>Number.isInteger(v)?String(v):v.toFixed(2);
  const fmtUptime=(sec:number)=>{
    const d=Math.floor(sec/86400),
          h=Math.floor(sec%86400/3600),
          m=Math.floor(sec%3600/60),
          s=sec%60;
    return `${d}d ${h}h ${m}m ${s}s`;
  };
  
  /* ─── units for display ─── */
  const UNITS:Record<string,string>={
    temperature:'°C', humidity:'%', voltage:'V',
    temperature_dht:'°C', humidity_dht:'%', voltage_ads:'V',
    pzem_voltage:'V', pzem_current:'A', pzem_power:'W',
    pzem_energy:'kWh', pzem_frequency:'Hz', pzem_power_factor:'',
  };
  
  /* ─── accent palette ─── */
  const ACCENTS=[
    '#FFCDD2','#F8BBD0','#E1BEE7','#D1C4E9','#C5CAE9',
    '#BBDEFB','#B3E5FC','#B2EBF2','#B2DFDB','#C8E6C9'
  ];
  
  export default function DashboardScreen(){
    /* location grid */
    const [locs,setLocs]=useState<{name:string;count:number}[]>([]);
    const [busy,setBusy]=useState(true);
    const [err,setErr]=useState<string|null>(null);
  
    /* sensors modal */
    const [open,setOpen]=useState(false);
    const [modalLoc,setModalLoc]=useState('');
    const [sensors,setSensors]=useState<string[]>([]);
    const [modalBusy,setModalBusy]=useState(false);
  
    /* live data modal */
    const [liveOpen,setLiveOpen]=useState(false);
    const [selSensor,setSelSensor]=useState('');
    const [rows,setRows]=useState<{name:string;data:string}[]>([]);
    const [liveBusy,setLiveBusy]=useState(false);
  
    const mqttRef=useRef<MQTTClient|null>(null);
  
    const {width}=useWindowDimensions();
    const cols=width>=1280?4:width>=960?3:width>=600?2:1;
  
    const SHADOW='#00000025',SURF='#f9fafc',LABEL='#424242',VALUE='#1b1b1b';
  
    /* fetch locations list */
    useEffect(()=>{
      (async()=>{
        try{
          const csvLoc=await influx(`
            import "influxdata/influxdb/schema"
            schema.tagValues(bucket:"${BUCKET}",tag:"location")`);
          const locs=lastField(csvLoc);
          const counts=await Promise.all(locs.map(async loc=>{
            const csv=await influx(`
              import "influxdata/influxdb/schema"
              schema.tagValues(bucket:"${BUCKET}",tag:"sensor_id",
                predicate:(r)=>r.location=="${loc}")`);
            return {name:loc,count:lastField(csv).length};
          }));
          setLocs(counts);
        }catch(e:any){setErr(e.message);}
        finally{setBusy(false);}
      })();
    },[]);
  
    /* open location modal */
    const openModal=async(loc:string)=>{
      setModalLoc(loc);setOpen(true);setModalBusy(true);
      try{
        const csv=await influx(`
          import "influxdata/influxdb/schema"
          schema.tagValues(bucket:"${BUCKET}",tag:"sensor_id",
            predicate:(r)=>r.location=="${loc}")`);
        setSensors(lastField(csv));
      }catch(e:any){setSensors([`Error: ${e.message}`]);}
      finally{setModalBusy(false);}
    };
  
    /* subscribe to sensor */
    const openLive=(sensor:string)=>{
      setSelSensor(sensor);setLiveBusy(true);setRows([]);setLiveOpen(true);
  
      /* cleanup old */
      if(mqttRef.current){try{mqttRef.current.disconnect();}catch{}}
  
      const topic=`iot/${modalLoc}/${sensor}/${sensor}/data`;
      const client=new MQTTClient(MQTT_URI,`expo_${Math.random().toString(16).slice(2)}`);
      mqttRef.current=client;
  
      client.onConnectionLost=({errorCode,errorMessage})=>{
        console.warn('[MQTT] Lost',errorCode,errorMessage);
      };
      client.onMessageArrived=(m:MQTTMessage)=>{
        console.log('[MQTT] Packet',m.destinationName);      /* topic only */
  
        /* unwrap optional payload property */
        let raw=m.payloadString;
        try{
          const o=JSON.parse(raw);
          if(o && o.payload) raw=o.payload;
        }catch{}
  
        try{
          const obj=JSON.parse(raw);
  
          /* build rows: timestamp formatted + every other key */
          const newRows: {name:string;data:string}[] = [];
  
          if('timestamp' in obj){
            newRows.push({name:'Time',data:dayjs.unix(obj.timestamp).format('YYYY‑MM‑DD HH:mm:ss')});
          }
          Object.entries(obj).forEach(([k,v])=>{
            if(k==='timestamp') return;
            const data=typeof v==='number'?`${fmtNum(v)}${UNITS[k]??''}`:String(v);
            newRows.push({name:k,data});
          });
  
          setRows(newRows);
        }catch(e){console.error('[MQTT] JSON parse',e);}
        setLiveBusy(false);
      };
  
      console.log('[MQTT] Connecting…');
      client.connect({
        userName:MQTT_USER,password:MQTT_PASS,useSSL:false,
        onSuccess:()=>{console.log('[MQTT] OK, sub',topic);client.subscribe(topic);},
        onFailure:({errorMessage})=>{console.error('[MQTT] Conn fail',errorMessage);setLiveBusy(false);}
      });
    };
  
    const closeLive=()=>{setLiveOpen(false);if(mqttRef.current){try{mqttRef.current.disconnect();}catch{}}};
  
    /* UI */
    return(
      <SafeAreaView style={[styles.safe,{backgroundColor:SURF}]}>
        {/* location grid */}
        {busy?(<ActivityIndicator style={{marginTop:40}} color={VALUE}/>):
          err?(<Text style={{color:'red',margin:20}}>{err}</Text>):
          <FlatList data={locs} numColumns={cols} key={cols} contentContainerStyle={styles.pad}
            renderItem={({item,index})=>(
              <Pressable onPress={()=>openModal(item.name)}
                style={({pressed})=>[
                  styles.card,
                  {backgroundColor:ACCENTS[index%ACCENTS.length],shadowColor:SHADOW},
                  pressed && {transform:[{scale:0.96}]},
                  Platform.OS==='android' && {elevation:6},
                ]}>
                <Text style={[styles.title,{color:LABEL}]}>{item.name}</Text>
                <Text style={[styles.value,{color:VALUE}]}>
                  {item.count} sensor{item.count!==1 && 's'}
                </Text>
              </Pressable>
            )}/>
        }
  
        {/* sensors modal */}
        <Modal visible={open} animationType="slide">
          <SafeAreaView style={[styles.safe,{backgroundColor:SURF}]}>
            <Pressable style={styles.close} onPress={()=>setOpen(false)}>
              <Text style={styles.closeTx}>×</Text>
            </Pressable>
            <Text style={styles.titleBig}>{modalLoc}</Text>
            {modalBusy?(<ActivityIndicator style={{marginTop:30}} color={VALUE}/>):
              <FlatList data={sensors} numColumns={cols} key={cols} contentContainerStyle={styles.sensorList}
                renderItem={({item,index})=>(
                  <Pressable onPress={()=>openLive(item)}
                    style={[
                      styles.sensorCard,
                      {backgroundColor:ACCENTS[index%ACCENTS.length],shadowColor:SHADOW},
                      Platform.OS==='android' && {elevation:4},
                    ]}>
                    <Text style={[styles.sensorText,{color:LABEL}]}>{item}</Text>
                  </Pressable>
                )}/>
            }
          </SafeAreaView>
        </Modal>
  
        {/* live data modal */}
        <Modal visible={liveOpen} animationType="slide">
          <SafeAreaView style={[styles.safe,{backgroundColor:SURF}]}>
            <Pressable style={styles.close} onPress={closeLive}>
              <Text style={styles.closeTx}>×</Text>
            </Pressable>
            <Text style={styles.titleBig}>{modalLoc} • {selSensor}</Text>
  
            {liveBusy?(<ActivityIndicator style={{marginTop:30}} color={VALUE}/>):
              <FlatList data={rows} numColumns={2} keyExtractor={i=>i.name}
                contentContainerStyle={styles.pad}
                renderItem={({item,index})=>(
                  <View style={[
                    styles.dataCard,
                    {backgroundColor:ACCENTS[index%ACCENTS.length],shadowColor:SHADOW},
                    Platform.OS==='android' && {elevation:3},
                  ]}>
                    <Text style={[styles.dataKey,{color:LABEL}]}>{item.name}</Text>
                    <Text style={[styles.dataVal,{color:VALUE}]}>{item.data}</Text>
                  </View>
                )}/>
            }
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }
  
  /* ─── styles ─── */
  const GAP=14;
  const styles=StyleSheet.create({
    safe:{flex:1},
    pad:{padding:GAP},
    card:{flex:1,margin:GAP/2,borderRadius:18,paddingVertical:26,paddingHorizontal:24,
          minHeight:120,justifyContent:'center',shadowOpacity:0.18,shadowRadius:8,
          shadowOffset:{width:0,height:5}},
    title:{fontSize:14,fontWeight:'600',textTransform:'uppercase',letterSpacing:0.4,marginBottom:6},
    value:{fontSize:28,fontWeight:'700'},
    close:{alignSelf:'flex-end',padding:16},closeTx:{fontSize:28,lineHeight:28},
    titleBig:{alignSelf:'center',fontSize:20,fontWeight:'700',marginTop:4,marginBottom:12},
    sensorList:{padding:GAP},
    sensorCard:{flex:1,margin:GAP/2,borderRadius:12,paddingVertical:20,paddingHorizontal:16,
               alignItems:'center',justifyContent:'center',shadowOpacity:0.1,shadowRadius:6,
               shadowOffset:{width:0,height:3}},
    sensorText:{fontSize:16,fontWeight:'600'},
    dataCard:{flex:1,margin:GAP/2,borderRadius:12,padding:16,minHeight:100,justifyContent:'center',
              shadowOpacity:0.15,shadowRadius:6,shadowOffset:{width:0,height:3}},
    dataKey:{fontSize:14,fontWeight:'700',marginBottom:4},
    dataVal:{fontSize:16,fontWeight:'500'},
  });
  





































































































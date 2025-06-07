import { useState, useCallback, useRef, useEffect } from 'react';
import dayjs from 'dayjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Probe, DataRow } from '../../types/dashboard';
import { FIELD_LABELS, POLL_OPTIONS } from '../../constants/dashboard';
import { apiFetch } from '../../app/api';

export const useLiveData = (selSensor: string, modalLoc: string, liveOpen: boolean) => {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [metaTxt, setMetaTxt] = useState('');
  const [liveBusy, setLiveBusy] = useState(false);
  const [pollInterval, setPollInterval] = useState<number | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

      // 🔧 FIX: Show ALL probes, not just labeled ones
      const list = (data.latest_probes || []).map((p: Probe) => {
        const lbl = FIELD_LABELS[p.name] || p.name.replace(/^readings_/, '').replace(/_/g, ' ');
        const isNum = typeof p.value === 'number';
        let displayValue = String(p.value);
        
        // Format numeric values with units from labels
        if (isNum && FIELD_LABELS[p.name]) {
          const unit = FIELD_LABELS[p.name]?.match(/\((.*)\)$/)?.[1] || '';
          displayValue = `${(+p.value).toFixed(2)} ${unit}`;
        }
        
        return {
          key: p.name,
          name: lbl,
          data: displayValue,
          num: isNum ? +p.value : null,
          breached: p.breached,
          min: p.threshold_min ?? null,
          max: p.threshold_max ?? null,
        };
      });
      
      console.log('📊 Displaying data rows:', list.length); // Debug log
      setRows(list);
    } catch (e: any) {
      console.error('❌ Fetch error:', e);
      setMetaTxt(`Error: ${e.message}`);
      setRows([]);
    }
    setLiveBusy(false);
  }, [selSensor]);

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
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [liveOpen, selSensor, pollInterval, fetchLatest]);

  return {
    rows,
    metaTxt,
    liveBusy,
    pollInterval,
    setPollInterval,
    pollRef,
    fetchLatest,
  };
};
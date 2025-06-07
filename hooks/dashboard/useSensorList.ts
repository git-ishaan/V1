import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { SensorInfo, LocationInfo } from '../../types/dashboard';
import { apiFetch } from '../../app/api';

export const useSensorList = () => {
  const [allSensors, setAllSensors] = useState<SensorInfo[]>([]);
  const [locs, setLocs] = useState<LocationInfo[]>([]);
  const [err, setErr] = useState<string | null>(null);

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

  return {
    allSensors,
    locs,
    err,
    fetchSensorList,
  };
};

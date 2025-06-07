/* ------------------------------------------------------------------
 * useSensorData Hook - Manages sensor list and location data
 * ----------------------------------------------------------------- */

import { useState, useEffect } from 'react';
import { apiFetch } from '../../app/api';
import { SensorData } from '../../types/report';

export const useSensorData = () => {
  const [allSensors, setAllSensors] = useState<SensorData[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [sensors, setSensors] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [sensor, setSensor] = useState('');
  const [tagBusy, setTagBusy] = useState(true);
  const [tagErr, setTagErr] = useState<string | null>(null);

  // Load locations and sensors
  useEffect(() => {
    const loadSensors = async () => {
      setTagBusy(true);
      try {
        const data: SensorData[] = await apiFetch('/sensors?utc=false');
        setAllSensors(data);
        const locs = [...new Set(data.map((d) => d.location))].sort();
        setLocations(locs);
        setLocation(locs[0] ?? '');
      } catch (e: any) {
        setTagErr(e.message);
      } finally {
        setTagBusy(false);
      }
    };

    loadSensors();
  }, []);

  // Update sensors list when location changes
  useEffect(() => {
    const list = allSensors
      .filter((s) => s.location === location)
      .map((s) => s.sensor_id);
    setSensors(list);
    setSensor(list[0] ?? '');
  }, [location, allSensors]);

  return {
    allSensors,
    locations,
    sensors,
    location,
    sensor,
    tagBusy,
    tagErr,
    setLocation,
    setSensor,
  };
};

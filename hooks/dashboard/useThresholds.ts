import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Range } from '../../types/dashboard';
import { DEFAULT_THRESHOLDS } from '../../constants/dashboard';
import { apiFetch } from '../../app/api';

export const useThresholds = () => {
  const [thresholds, setThresholds] = useState<Record<string, Range>>(DEFAULT_THRESHOLDS);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const saveThresholdsRemote = async (selSensor: string) => {
    console.log('💾 Saving thresholds for sensor:', selSensor, thresholds);
    
    const payloadArr = Object.entries(thresholds)
      .filter(([probe, range]) => 
        typeof range.min === 'number' && 
        typeof range.max === 'number' && 
        (range.min !== 0 || range.max !== 0) // Only save non-zero thresholds
      )
      .map(([probe, range]) => ({
        sensor_id: selSensor,
        probe_name: probe,
        min_value: range.min,
        max_value: range.max,
        string_match: null as string | null,
      }));

    console.log('📤 Sending threshold payload:', payloadArr);

    if (payloadArr.length === 0) {
      console.log('⚠️ No thresholds to save');
      return;
    }

    try {
      // Use bulk endpoint for multiple thresholds
      const response = await apiFetch(`/sensors/${selSensor}/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadArr),
      });
      
      console.log('✅ Thresholds saved successfully:', response);
    } catch (error) {
      console.error('❌ Threshold save failed:', error);
      throw error;
    }
  };

  return {
    thresholds,
    setThresholds,
    alertsEnabled,
    setAlertsEnabled,
    saveThresholdsRemote,
  };
};
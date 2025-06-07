import { Range, PollOption } from '../../types/dashboard';

export const FIELD_LABELS: Record<string, string> = {
  readings_humidity_dht: 'Humidity (%RH)',
  readings_pzem_current: 'Current (A)',
  readings_pzem_energy: 'Energy (kWh)',
  readings_pzem_frequency: 'Frequency (Hz)',
  readings_pzem_power: 'Power (W)',
  readings_pzem_power_factor: 'Power Factor',
  readings_pzem_voltage: 'Voltage (V)',
  readings_temperature_dht: 'Temperature (°C)',
  readings_voltage_ads: 'Voltage ADS (V)',
  readings_door: 'Door',
  readings_temperature_ds18b20: 'Temperature (°C)',
};

export const DEFAULT_THRESHOLDS: Record<string, Range> = Object.fromEntries(
  Object.keys(FIELD_LABELS).map((k) => [k, { min: 0, max: 0 }])
);

export const POLL_OPTIONS: PollOption[] = [
  { label: '10 sec', value: 10000 },
  { label: '30 sec', value: 30000 },
  { label: '45 sec', value: 45000 },
  { label: '1 min', value: 60000 },
  { label: '5 min', value: 300000 },
];

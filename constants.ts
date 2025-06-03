// constants.ts
export const BASE               = process.env.EXPO_PUBLIC_INFLUX_URL!;
export const ORG                = encodeURIComponent(process.env.EXPO_PUBLIC_INFLUXDB_ORG!);
export const BUCKET             = process.env.EXPO_PUBLIC_INFLUXDB_BUCKET!;
export const THRESH_BUCKET      = process.env.EXPO_PUBLIC_INFLUXDB_THRESHOLDS_BUCKET!;
export const TOKEN              = process.env.EXPO_PUBLIC_INFLUXDB_TOKEN!;

export interface Range { min: number; max: number; }

export const FIELD_LABELS: Record<string,string> = {
  readings_humidity_dht:      'Humidity (%RH)',
  readings_pzem_current:      'Current (A)',
  readings_pzem_energy:       'Energy (kWh)',
  readings_pzem_frequency:    'Frequency (Hz)',
  readings_pzem_power:        'Power (W)',
  readings_pzem_power_factor: 'Power Factor',
  readings_pzem_voltage:      'Voltage (V)',
  readings_temperature_dht:   'Temperature (°C)',
  readings_voltage_ads:       'Voltage ADS (V)',
};

export const DEFAULT_THRESHOLDS: Record<string,Range> = {
  readings_humidity_dht:      { min: 0,   max: 60 },
  readings_pzem_current:      { min: 0,   max: 10 },
  readings_pzem_energy:       { min: 0,   max: 100 },
  readings_pzem_frequency:    { min: 0,   max: 60 },
  readings_pzem_power:        { min: 0,   max: 500 },
  readings_pzem_power_factor: { min: 0,   max: 1 },
  readings_pzem_voltage:      { min: 0,   max: 240 },
  readings_temperature_dht:   { min: -20, max: 30 },
  readings_voltage_ads:       { min: 0,   max: 5 },
};

export const POLL_OPTIONS = [
  { label: '10 sec', value: 10000 },
  { label: '30 sec', value: 30000 },
  { label: '45 sec', value: 45000 },
  { label: '1 min',  value: 60000 },
  { label: '5 min',  value: 300000 },
];

export const FRIENDLY: Record<string,string> = {
  _time: 'Timestamp',
  location: 'Location',
  sensor_id: 'SensorID',
  host: 'Host',
  readings_humidity_dht:    'Humidity',
  readings_temperature_dht: 'Temperature',
  readings_pzem_current:    'Current (A)',
  readings_pzem_voltage:    'Voltage (V)',
  readings_pzem_power:      'Power (W)',
  readings_pzem_energy:     'Energy (kWh)',
  readings_pzem_frequency:  'Frequency (Hz)',
  readings_pzem_power_factor: 'Power Factor',
  readings_voltage_ads:     'Voltage ADS (V)',
  status_uptime_sec:        'Uptime (s)',
  timestamp:                'Device Timestamp',
};

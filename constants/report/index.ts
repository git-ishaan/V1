/* ------------------------------------------------------------------
 * Report Constants - Configuration and static data
 * ----------------------------------------------------------------- */

export const FIELD_LABELS: Record<string, string> = {
  timestamp: 'Timestamp',
  location: 'Location',
  sensor_id: 'Sensor ID',
  readings_humidity_dht: 'Humidity (%)',
  readings_temperature_dht: 'Temperature (°C)',
  readings_pzem_current: 'Current (A)',
  readings_pzem_voltage: 'Voltage (V)',
  readings_pzem_power: 'Power (W)',
  readings_pzem_energy: 'Energy (kWh)',
  readings_pzem_frequency: 'Frequency (Hz)',
  readings_pzem_power_factor: 'Power Factor',
  readings_voltage_ads: 'Voltage ADS (V)',
  readings_temperature_ds18b20: 'Temperature (°C)',
  readings_door: 'Door',
  status_ip: 'IP',
};

export const TIME_RANGE_OPTIONS = [
  'hours:1',
  'hours:2',
  'hours:5',
  'days:1',
  'days:7',
  'days:15',
  'days:30',
];

export const AGGREGATION_WINDOW_OPTIONS = [
  '1m',
  '5m',
  '10m',
  '30m',
  '1h',
  '1d',
];

export const UNDESIRED_FIELDS = new Set([
  '_start',
  '_stop',
  '_measurement',
  'topic',
]);

export const DEFAULT_TIME_RANGE = { hours: 1 };
export const DEFAULT_AGG_WINDOW = '5m';

export const PDF_STYLES = `
  body{font-family:Arial;padding:20px;}
  h1{text-align:center;color:#4F46E5;}
  table{width:100%;border-collapse:collapse;table-layout:fixed;}
  th,td{border:1px solid #CBD5E0;padding:6px;word-wrap:break-word;}
  th{background:#E0E7FF;} tr:nth-child(even){background:#F8FAFC;}
`;

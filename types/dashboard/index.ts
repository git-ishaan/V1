export interface SensorInfo {
  sensor_id: string;
  status: 'up' | 'down';
  location: string;
  last_seen?: string;
}

export interface Probe {
  name: string;
  value: string | number;
  timestamp: string;
  breached: boolean;
  threshold_min?: number | null;
  threshold_max?: number | null;
}

export interface Range {
  min: number;
  max: number;
}

export interface LocationInfo {
  name: string;
  count: number;
  up: number;
  lastSeen?: string;
}

export interface DataRow {
  key: string;
  name: string;
  data: string;
  num: number | null;
  breached: boolean;
  min?: number | null;
  max?: number | null;
}

export interface PollOption {
  label: string;
  value: number;
}

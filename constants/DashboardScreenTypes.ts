// constants/DashboardScreenTypes.ts

export type Range = {
  min: number;
  max: number;
};

export type SensorStatus = {
  sensor_id: string;
  status: 'up' | 'down' | string;
};

export type LocationStatus = {
  location_name: string;
  sensor_count: number;
  sensors_up: number;
  sensors_down: number;
  sensors: SensorStatus[];
};

export type Probe = {
  name: string;
  value: number | string;
  timestamp: string;
  threshold_min: number | null;
  threshold_max: number | null;
  breached: boolean;
};

export type SensorDetails = {
  sensor_id: string;
  status: string;
  location: string;
  latest_probes: Probe[];
};

export type LocCount = {
  name: string;
  count: number;
};

/* ------------------------------------------------------------------
 * Report Types - TypeScript interfaces for report functionality
 * ----------------------------------------------------------------- */

export interface SensorData {
  location: string;
  sensor_id: string;
}

export interface TimeRange {
  [unit: string]: number;
}

export interface ReportQuery {
  time_range_start: string;
  time_range_stop: string;
  location: string;
  sensor_id: string;
  aggregation_window: string;
}

export interface ReportRow {
  [key: string]: any;
}

export interface MenuOption {
  vis: boolean;
  options: string[];
  onClose: () => void;
  onSelect: (value: string) => void;
}

export interface ReportState {
  // Sensor data
  allSensors: SensorData[];
  locations: string[];
  sensors: string[];
  location: string;
  sensor: string;

  // Query parameters
  range: TimeRange;
  aggWindow: string;

  // Loading states
  tagBusy: boolean;
  tagErr: string | null;
  busy: boolean;
  err: string | null;

  // Results
  rows: ReportRow[];
  cols: string[];
  open: boolean;

  // Menu states
  locMenu: boolean;
  senMenu: boolean;
  rngMenu: boolean;
  aggMenu: boolean;
}

export interface ExportOptions {
  csv: boolean;
  pdf: boolean;
}

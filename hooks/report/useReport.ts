/* ------------------------------------------------------------------
 * useReport Hook - Manages report generation and data fetching
 * ----------------------------------------------------------------- */

import { useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { apiFetch } from '../../app/api';
import { TimeRange, ReportRow, ReportQuery } from '../../types/report';
import { UNDESIRED_FIELDS } from '../../constants/report';

export const useReport = () => {
  const [range, setRange] = useState<TimeRange>({ hours: 1 });
  const [aggWindow, setAggWindow] = useState<string>('5m');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  // Helper functions
  const isNumeric = (v: any) => typeof v === 'number' && !isNaN(v);

  const formatValue = (key: string, val: any) => {
    if (key === 'timestamp') {
      return dayjs(val).isValid()
        ? dayjs(val).format('YYYY-MM-DD HH:mm:ss')
        : val;
    }
    if (isNumeric(val)) {
      return Number(val)
        .toFixed(4)
        .replace(/\.?0+$/, ''); // trim zeros
    }
    return String(val);
  };

  const rangeLabel = () => {
    const [u, v] = Object.entries(range)[0];
    return u === 'hours' ? `Last ${v} hr` : `Last ${v} d`;
  };

  // Main query function
  const runQuery = useCallback(
    async (location: string, sensor: string) => {
      if (!location || !sensor) return;
      setBusy(true);
      setErr(null);

      try {
        const [[unit, num]] = Object.entries(range);
        const stopISO = dayjs().toISOString();
        const startISO = dayjs()
          .subtract(num, unit as any)
          .toISOString();

        const body: ReportQuery = {
          time_range_start: startISO,
          time_range_stop: stopISO,
          location,
          sensor_id: sensor,
          aggregation_window: aggWindow,
        };

        const raw: ReportRow[] = await apiFetch('/report?utc=false', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!Array.isArray(raw) || raw.length === 0) {
          setErr('No data returned.');
          setRows([]);
          setCols([]);
          return;
        }

        // Derive and clean columns
        const keys = Object.keys(raw[0]).filter(
          (k) => !UNDESIRED_FIELDS.has(k) && !k.startsWith('_')
        );
        setCols(keys);

        // Format rows
        const formatted = raw.map((r) => {
          const obj: ReportRow = {};
          keys.forEach((k) => (obj[k] = formatValue(k, r[k])));
          return obj;
        });
        setRows(formatted);
        setOpen(true);
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setBusy(false);
      }
    },
    [range, aggWindow]
  );

  return {
    range,
    setRange,
    aggWindow,
    setAggWindow,
    busy,
    err,
    rows,
    cols,
    open,
    setOpen,
    runQuery,
    rangeLabel,
  };
};

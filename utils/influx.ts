// utils/influx.ts
import {
  BASE,
  ORG,
  BUCKET,
  THRESH_BUCKET,
  TOKEN,
} from '../constants';

export async function influx(flux: string): Promise<string> {
  const res = await fetch(`${BASE}/api/v2/query?org=${ORG}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.flux',
      Accept:         'application/csv',
      Authorization:  `Token ${TOKEN}`,
    },
    body: flux,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Query failed (${res.status}): ${text}`);
  return text;
}

function escapeTag(v: string): string {
  return v.replace(/,/g, '\\,').replace(/ /g, '\\ ').replace(/=/g, '\\=');
}
function escapeFieldString(v: string): string {
  return `"${v.replace(/"/g, '\\"')}"`;
}

export async function writeThreshold(
  metricName: string,
  scopeType: 'global' | 'location' | 'sensor_id',
  scopeValue: string,
  level: string,
  minValue: number,
  maxValue: number,
  description?: string
): Promise<void> {
  const tags = [
    `metric_name=${escapeTag(metricName)}`,
    `scope_type=${escapeTag(scopeType)}`,
    `scope_value=${escapeTag(scopeValue)}`,
    `level=${escapeTag(level)}`,
  ].join(',');
  const fieldsArr = [`min_value=${minValue}`, `max_value=${maxValue}`];
  if (description) fieldsArr.push(`description=${escapeFieldString(description)}`);
  const line = `metric_thresholds,${tags} ${fieldsArr.join(',')}`;
  const url = `${BASE}/api/v2/write?org=${ORG}&bucket=${THRESH_BUCKET}&precision=ns`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Token ${TOKEN}`, 'Content-Type': 'text/plain; charset=utf-8' },
    body: line,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Threshold write failed (${res.status}): ${err}`);
  }
}

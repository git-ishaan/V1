// app/api.ts
//------------------------------------------------------------------
// Thin wrapper around fetch that:
//   • Prepends the API base URL
//   • Adds the x-api-key header
//   • Logs request + response
//------------------------------------------------------------------

/**
 * You now expose only two public env-vars in `app.config.js`:
 *   • EXPO_PUBLIC_API_BASE_URL
 *   • EXPO_PUBLIC_API_KEY
 *
 * Both can still be overridden by a .env file, EAS secrets,
 * or left undefined to fall back to the hard-coded defaults.
 */
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE_URL                 // ← fallback

const API_KEY =
  process.env.EXPO_PUBLIC_API_KEY 

/* ------------------------------------------------------------------ */
/* Main helper                                                         */
/* ------------------------------------------------------------------ */
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url     = `${API_BASE}${path}`;
  const method  = init.method ?? 'GET';
  const headers = {
    accept: 'application/json',
    'x-api-key': API_KEY,
    ...(init.headers as Record<string, string>),
  };

  /* ── log request ─────────────────────────────────────────────── */
  console.log('\n[apiFetch] →', method, url);
  if (init.body) {
    try {
      console.log('[apiFetch] payload:', JSON.parse(init.body as string));
    } catch {
      console.log('[apiFetch] payload:', init.body);
    }
  }

  /* ── fetch ───────────────────────────────────────────────────── */
  const res  = await fetch(url, { ...init, headers });
  const text = await res.text();

  /* ── log response ────────────────────────────────────────────── */
  console.log('[apiFetch] ← status', res.status);
  console.log('[apiFetch] response:', text);

  if (!res.ok) throw new Error(`API ${res.status}: ${text}`);

  // Try to parse JSON; otherwise return plain text
  try {
    return JSON.parse(text);
  } catch {
    // @ts-ignore  (caller may treat return as string)
    return text;
  }
}

/** Klien API: semua request lewat proxy same-origin /api/v1 dengan cookie sesi httpOnly. */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: string[],
  ) {
    super(message);
  }
}

const BASE = '/api/v1';

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== 'undefined' && !location.pathname.startsWith('/login')) {
    location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(res.status, err?.message ?? `Permintaan gagal (${res.status})`, err?.details);
  }
  return body as T;
}

export const fetcher = <T = unknown>(path: string): Promise<T> =>
  fetch(`${BASE}${path}`, { credentials: 'same-origin' }).then((r) => handle<T>(r));

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return fetch(`${BASE}${path}`, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'umira-helpdesk' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((r) => handle<T>(r));
}

export const api = {
  get: fetcher,
  post: <T = unknown>(path: string, body?: unknown) => send<T>('POST', path, body ?? {}),
  patch: <T = unknown>(path: string, body?: unknown) => send<T>('PATCH', path, body ?? {}),
  put: <T = unknown>(path: string, body?: unknown) => send<T>('PUT', path, body ?? {}),
  del: <T = unknown>(path: string) => send<T>('DELETE', path),
  upload: <T = unknown>(path: string, form: FormData) =>
    fetch(`${BASE}${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-Requested-With': 'umira-helpdesk' },
      body: form,
    }).then((r) => handle<T>(r)),
};

/** Query string dari objek (lewati nilai kosong). */
export function qs(params: Record<string, string | number | undefined | null | false>) {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '' && v !== false) s.set(k, String(v));
  const out = s.toString();
  return out ? `?${out}` : '';
}

export function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    // Validasi server bisa mengembalikan beberapa pesan; tampilkan pesan berbahasa Indonesia lebih dulu.
    const localized = e.details?.find((d) => !/\b(must|should|each value|property)\b/i.test(d));
    return localized ?? e.message;
  }
  return e instanceof Error ? e.message : 'Terjadi kesalahan.';
}

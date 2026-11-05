const TZ = 'Asia/Jakarta';

export function fmtDate(d?: string | Date | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(d));
}

export function fmtDateTime(d?: string | Date | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d)) + ' WIB';
}

export function fmtTime(d?: string | Date | null) {
  if (!d) return '—';
  return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(d));
}

/**
 * Durasi ringkas dari menit: "3 j 20 m", "2 h 4 j".
 * Untuk SLA jam kerja (business=true) 1 hari kerja = 9 jam: "2 hari kerja", "13 j kerja".
 */
export function fmtDuration(min?: number | null, business = false) {
  if (min === null || min === undefined || Number.isNaN(min)) return '—';
  const m = Math.abs(Math.round(min));
  if (m < 60) return `${m} mnt`;
  if (business) {
    if (m >= 540 && m % 540 === 0) return `${m / 540} hari kerja`;
    const h = Math.floor(m / 60);
    return `${h} j${m % 60 && h < 10 ? ` ${m % 60} m` : ''} kerja`;
  }
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} j${m % 60 ? ` ${m % 60} m` : ''}`;
  const d = Math.floor(h / 24);
  return `${d} h${h % 24 ? ` ${h % 24} j` : ''}`;
}

export function timeAgo(d?: string | Date | null) {
  if (!d) return '—';
  const diff = (Date.now() - new Date(d).getTime()) / 60000;
  if (diff < 1) return 'baru saja';
  if (diff < 60) return `${Math.round(diff)} mnt lalu`;
  if (diff < 1440) return `${Math.round(diff / 60)} jam lalu`;
  if (diff < 1440 * 7) return `${Math.round(diff / 1440)} hari lalu`;
  return fmtDate(d);
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function initials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** YYYY-MM-DD di zona WIB */
export function isoDateWib(d = new Date()) {
  return new Date(d.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

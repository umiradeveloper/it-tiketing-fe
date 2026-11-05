'use client';

import clsx from 'clsx';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { FileSpreadsheet, FileText, Star } from 'lucide-react';
import { ASSET_STATUS_LABEL, CHANNEL_LABEL, PRIORITY_LABEL, type AssetStatus, type TicketChannel, type TicketPriority } from '@/shared';
import { fetcher, qs } from '@/lib/api';
import { useLookups } from '@/lib/session';
import { fmtDate, fmtDuration, isoDateWib } from '@/lib/format';
import { ErrorBanner, Field, Input, PageHeader, Panel, Select, Spinner } from '@/components/ui';
import { BarList, TrendChart } from '@/components/charts';

interface Report {
  period: { from: string; to: string };
  volume: { created: number; resolved: number; closed: number; open: number; cancelled: number; reopened: number };
  sla: { target: number; response: { met: number; total: number; percent: number | null }; resolution: { met: number; total: number; percent: number | null }; excluded: number; note: string };
  times: { firstResponse: { avgMinutes: number | null; medianMinutes: number | null }; resolution: { avgMinutes: number | null; medianMinutes: number | null } };
  top5: Array<{ key: string; count: number }>;
  byPriority: Array<{ key: TicketPriority; count: number }>;
  byLocation: Array<{ key: string; count: number }>;
  byDepartment: Array<{ key: string; count: number }>;
  byChannel: Array<{ key: TicketChannel; count: number }>;
  satisfaction: { average: number | null; responses: number; responseRate: number | null; distribution: Array<{ rating: number; count: number }>; comments: Array<{ ticketNo: string; rating: number; comment: string }> };
  agents: Array<{ id: string; name: string; assigned: number; resolved: number; breached: number; csat: number | null }>;
  aging: Array<{ label: string; count: number }>;
  daily: Array<{ date: string; created: number; resolved: number }>;
  assets: { byStatus: Array<{ status: AssetStatus; count: number }>; maintenanceDue30d: number };
}

function monthRange(offset: number) {
  const now = new Date(Date.now() + 7 * 3600000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + offset;
  const first = new Date(Date.UTC(y, m, 1));
  const last = offset === 0 ? now : new Date(Date.UTC(y, m + 1, 0));
  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
}

function Ring({ percent, target, label, sub }: { percent: number | null; target: number; label: string; sub: string }) {
  const p = percent ?? 0;
  const r = 44;
  const c = 2 * Math.PI * r;
  const ok = percent !== null && percent >= target;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 110 110" className="h-28 w-28 shrink-0" role="img" aria-label={`${label} ${percent ?? '-'} persen`}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="#E6ECED" strokeWidth="11" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={percent === null ? '#E6ECED' : ok ? '#13707A' : '#B42318'} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 55 55)" />
        {/* penanda target */}
        <line x1="55" y1="5" x2="55" y2="17" stroke="#B5651D" strokeWidth="2.5" transform={`rotate(${(target / 100) * 360} 55 55)`} />
        <text x="55" y="60" textAnchor="middle" className="fill-ink text-[20px] font-bold">
          {percent === null ? '—' : `${percent}%`}
        </text>
      </svg>
      <div>
        <p className="font-bold text-ink">{label}</p>
        <p className={clsx('text-sm font-semibold', percent === null ? 'text-text-muted' : ok ? 'text-ok' : 'text-danger')}>
          {percent === null ? 'Belum ada data' : ok ? `Memenuhi target >${target}%` : `Di bawah target ${target}%`}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{sub}</p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { data: lookups } = useLookups();
  const [preset, setPreset] = useState<'this' | 'last' | 'q' | 'custom'>('this');
  const [custom, setCustom] = useState({ from: monthRange(0).from, to: isoDateWib() });
  const [filters, setFilters] = useState({ locationId: '', departmentId: '', categoryId: '', assigneeId: '' });

  const range = useMemo(() => {
    if (preset === 'this') return monthRange(0);
    if (preset === 'last') return monthRange(-1);
    if (preset === 'q') return { from: monthRange(-2).from, to: isoDateWib() };
    return custom;
  }, [preset, custom]);
  const query = qs({ ...range, ...filters });
  const { data, error, isLoading } = useSWR<Report>(`/reports/operations${query}`, fetcher, { keepPreviousData: true });

  return (
    <div>
      <PageHeader
        title="Laporan operasional IT"
        description="Bahan Laporan Operasional IT bulanan (input Laporan Kinerja IT UMR-IT-12): volume tiket, pencapaian SLA, top 5 masalah, dan kepuasan user."
        actions={
          <>
            <a href={`/api/v1/reports/operations/export${qs({ ...range, ...filters, format: 'xlsx' })}`} className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">
              <FileSpreadsheet className="h-4 w-4" /> Unduh Excel
            </a>
            <a href={`/api/v1/reports/operations/export${qs({ ...range, ...filters, format: 'csv' })}`} className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-teal hover:text-teal">
              <FileText className="h-4 w-4" /> CSV
            </a>
          </>
        }
      />

      <section className="panel mb-6 grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[auto_1fr_1fr_1fr_1fr]">
        <div>
          <span className="label">Periode</span>
          <div className="inline-flex rounded-lg border border-line bg-paper p-0.5 text-sm font-semibold">
            {(
              [
                ['this', 'Bulan ini'],
                ['last', 'Bulan lalu'],
                ['q', '3 bulan'],
                ['custom', 'Pilih tanggal'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} onClick={() => setPreset(v)} className={clsx('rounded-md px-3 py-1.5 whitespace-nowrap', preset === v ? 'bg-white text-ink shadow-sm' : 'text-text-muted')}>
                {l}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="mt-2 flex gap-2">
              <Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} aria-label="Dari" />
              <Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} aria-label="Sampai" />
            </div>
          )}
        </div>
        <Field label="Lokasi / site">
          <Select value={filters.locationId} onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}>
            <option value="">Semua</option>
            {lookups?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Divisi">
          <Select value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}>
            <option value="">Semua</option>
            {lookups?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Kategori">
          <Select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
            <option value="">Semua</option>
            {lookups?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Petugas">
          <Select value={filters.assigneeId} onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}>
            <option value="">Semua</option>
            {lookups?.agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
      </section>

      <ErrorBanner error={error} />
      {isLoading && !data && <Spinner label="Menyusun laporan…" />}
      {data && (
        <div className={clsx('space-y-6 transition-opacity', isLoading && 'opacity-60')}>
          <p className="text-sm text-text-muted">
            Periode {fmtDate(data.period.from)} sampai {fmtDate(data.period.to)}
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Pencapaian SLA">
              <div className="grid gap-6 sm:grid-cols-2">
                <Ring percent={data.sla.resolution.percent} target={data.sla.target} label="Penyelesaian" sub={`${data.sla.resolution.met} dari ${data.sla.resolution.total} tiket tepat waktu`} />
                <Ring percent={data.sla.response.percent} target={data.sla.target} label="Respons pertama" sub={`${data.sla.response.met} dari ${data.sla.response.total} tiket tepat waktu`} />
              </div>
              <p className="mt-5 border-t border-line pt-3 text-xs leading-5 text-text-muted">
                {data.sla.note} Dikecualikan: {data.sla.excluded} tiket.
              </p>
            </Panel>
            <Panel title="Volume & waktu penanganan">
              <div className="grid grid-cols-3 gap-y-5">
                {(
                  [
                    ['Masuk', data.volume.created],
                    ['Selesai', data.volume.resolved],
                    ['Masih terbuka', data.volume.open],
                    ['Ditutup', data.volume.closed],
                    ['Dibuka ulang', data.volume.reopened],
                    ['Dibatalkan', data.volume.cancelled],
                  ] as const
                ).map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs font-medium text-text-muted">{l}</p>
                    <p className="text-2xl font-bold tabular-nums text-ink">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
                <div>
                  <p className="text-xs font-medium text-text-muted">Respons pertama</p>
                  <p className="font-bold text-ink">rata-rata {fmtDuration(data.times.firstResponse.avgMinutes)}</p>
                  <p className="text-xs text-text-muted">median {fmtDuration(data.times.firstResponse.medianMinutes)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted">Waktu penyelesaian</p>
                  <p className="font-bold text-ink">median {fmtDuration(data.times.resolution.medianMinutes)}</p>
                  <p className="text-xs text-text-muted">rata-rata {fmtDuration(data.times.resolution.avgMinutes)}</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Panel title="Tren harian">
              <TrendChart data={data.daily} />
            </Panel>
            <Panel title="Top 5 masalah">
              {data.top5.length === 0 ? (
                <p className="text-sm text-text-muted">Belum ada tiket di periode ini.</p>
              ) : (
                <ol className="space-y-3">
                  {data.top5.map((t, i) => (
                    <li key={t.key} className="flex items-center gap-3">
                      <span className={clsx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold', i === 0 ? 'bg-copper text-white' : 'bg-paper text-ink')}>{i + 1}</span>
                      <span className="flex-1 text-sm font-medium">{t.key}</span>
                      <span className="font-bold tabular-nums">{t.count}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Kepuasan user">
              <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-ink">{data.satisfaction.average ?? '—'}</span>
                <span className="pb-1.5 text-sm text-text-muted">
                  dari 5, {data.satisfaction.responses} survei
                  {data.satisfaction.responseRate !== null ? ` (${data.satisfaction.responseRate}% tiket selesai)` : ''}
                </span>
              </div>
              <ul className="mt-4 space-y-1.5">
                {[...data.satisfaction.distribution].reverse().map((d) => {
                  const max = Math.max(1, ...data.satisfaction.distribution.map((x) => x.count));
                  return (
                    <li key={d.rating} className="flex items-center gap-2 text-xs">
                      <span className="flex w-10 items-center gap-0.5 font-semibold">
                        {d.rating} <Star className="h-3 w-3 fill-copper text-copper" />
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                        <span className="block h-full rounded-full bg-copper" style={{ width: `${(d.count / max) * 100}%` }} />
                      </span>
                      <span className="w-6 text-right tabular-nums">{d.count}</span>
                    </li>
                  );
                })}
              </ul>
              {data.satisfaction.comments.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-line pt-3">
                  {data.satisfaction.comments.slice(0, 3).map((c) => (
                    <li key={c.ticketNo} className="text-xs text-text-muted">
                      “{c.comment}” <span className="text-text-faint">({c.ticketNo}, {c.rating}/5)</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Per prioritas">
              <BarList items={data.byPriority.map((p) => ({ label: PRIORITY_LABEL[p.key], value: p.count, tone: p.key === 'P1' ? 'danger' : p.key === 'P2' ? 'copper' : 'teal' }))} />
              <p className="mb-2 mt-5 border-t border-line pt-4 text-xs font-semibold text-text-muted">Kanal masuk</p>
              <BarList items={data.byChannel.map((c) => ({ label: CHANNEL_LABEL[c.key], value: c.count }))} />
            </Panel>
            <Panel title="Per lokasi / site">
              <BarList items={data.byLocation.map((l) => ({ label: l.key, value: l.count }))} />
              <p className="mb-2 mt-5 border-t border-line pt-4 text-xs font-semibold text-text-muted">Umur tiket terbuka</p>
              <BarList items={data.aging.map((a) => ({ label: a.label, value: a.count, tone: a.label.startsWith('>') ? 'danger' : undefined }))} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <Panel title="Kinerja petugas" bodyClass="!p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="table-head">
                    <tr>
                      <th>Petugas</th>
                      <th className="!text-right">Ditangani</th>
                      <th className="!text-right">Selesai</th>
                      <th className="!text-right">Lewat SLA</th>
                      <th className="!text-right">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {data.agents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-text-muted">Belum ada data.</td>
                      </tr>
                    )}
                    {data.agents.map((a) => (
                      <tr key={a.id}>
                        <td className="font-medium">{a.name}</td>
                        <td className="text-right tabular-nums">{a.assigned}</td>
                        <td className="text-right tabular-nums">{a.resolved}</td>
                        <td className={clsx('text-right tabular-nums', a.breached && 'font-bold text-danger')}>{a.breached}</td>
                        <td className="text-right tabular-nums">{a.csat ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
            <Panel title="Aset & maintenance">
              <BarList items={data.assets.byStatus.map((s) => ({ label: ASSET_STATUS_LABEL[s.status], value: s.count, tone: s.status === 'DAMAGED' || s.status === 'LOST' ? 'danger' : s.status === 'IN_REPAIR' ? 'copper' : 'teal' }))} />
              <p className="mt-4 border-t border-line pt-3 text-sm">
                <b className="text-ink">{data.assets.maintenanceDue30d}</b> <span className="text-text-muted">jadwal maintenance jatuh tempo dalam 30 hari</span>
              </p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

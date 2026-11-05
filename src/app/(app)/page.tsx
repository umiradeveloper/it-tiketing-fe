'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { BookOpen, Cpu, HelpCircle, KeyRound, Laptop, Plus, Wifi } from 'lucide-react';
import { PRIORITY_LABEL, STATUS_LABEL, type TicketPriority, type TicketStatus } from '@/shared';
import { fetcher } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import type { TicketRow } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import { ButtonLink, EmptyState, ErrorBanner, Panel, Skeleton, Stat } from '@/components/ui';
import { TicketCardRow } from '@/components/tickets';
import { BarList, TrendChart } from '@/components/charts';

function greeting() {
  const h = Number(new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }).format(new Date()));
  return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
}

export default function DashboardPage() {
  const { isAgent } = useSession();
  return isAgent ? <HelpdeskDashboard /> : <RequesterDashboard />;
}

// ------------------------------------------------------------------ Karyawan

interface RequesterSummary {
  kind: 'requester';
  counts: { open: number; awaitingConfirmation: number; closed: number };
  recent: TicketRow[];
  articles: Array<{ id: string; slug: string; title: string; summary: string | null }>;
}

const CAT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  Hardware: Laptop,
  Software: Cpu,
  Jaringan: Wifi,
  Akun: KeyRound,
  Lainnya: HelpCircle,
};
const CAT_HINT: Record<string, string> = {
  Hardware: 'Laptop, printer, monitor, perangkat rusak/hilang',
  Software: 'Instalasi, ERP, Microsoft 365, aplikasi proyek',
  Jaringan: 'Internet, Wi-Fi, VPN, file share',
  Akun: 'Password, email, hak akses',
  Lainnya: 'Pertanyaan umum & permintaan lain',
};

function RequesterDashboard() {
  const { user } = useSession();
  const { data, error, mutate } = useSWR<RequesterSummary>('/dashboard/summary', fetcher);
  const { data: lookups } = useLookups();

  return (
    <div className="space-y-8">
      <section className="rounded-panel bg-ink px-6 py-7 text-white sm:px-8">
        <p className="text-sm text-white/60">{greeting()}, {user.name.split(' ')[0]}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[28px]">Ada kendala IT yang bisa kami bantu?</h1>
        <p className="mt-1.5 text-sm text-white/65">Pilih jenis masalahnya. Tim helpdesk merespons sesuai prioritas, mulai 15 menit untuk gangguan kritis.</p>
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {(lookups?.categories ?? []).map((c) => {
            const Icon = CAT_ICON[c.name] ?? HelpCircle;
            return (
              <Link
                key={c.id}
                href={`/tickets/new?category=${c.id}`}
                className="group rounded-lg border border-white/12 bg-white/[0.06] p-4 transition-colors hover:border-copper hover:bg-white/10"
              >
                <Icon className="h-5 w-5 text-[#E8A867]" />
                <p className="mt-3 font-bold">{c.name}</p>
                <p className="mt-0.5 text-xs leading-5 text-white/60">{CAT_HINT[c.name] ?? c.children.map((x) => x.name).slice(0, 3).join(', ')}</p>
              </Link>
            );
          })}
          {!lookups && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[112px] bg-white/10" />)}
        </div>
      </section>

      <ErrorBanner error={error} onRetry={() => mutate()} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel
          title="Tiket saya"
          actions={<Link href="/tickets" className="link text-sm">Lihat semua</Link>}
          bodyClass="!p-0"
        >
          {data && (
            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              <Stat label="Sedang ditangani" value={data.counts.open} href="/tickets?tab=open" />
              <Stat label="Menunggu konfirmasi Anda" value={data.counts.awaitingConfirmation} tone={data.counts.awaitingConfirmation ? 'copper' : undefined} href="/tickets?tab=resolved" />
              <Stat label="Selesai" value={data.counts.closed} href="/tickets?tab=closed" />
            </div>
          )}
          {!data && <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
          {data?.recent.length === 0 && (
            <EmptyState icon={Plus} title="Belum ada tiket" action={<ButtonLink href="/tickets/new">Buat tiket pertama</ButtonLink>}>
              Tiket yang Anda buat akan muncul di sini beserta status dan target waktunya.
            </EmptyState>
          )}
          {data?.recent.map((t) => <TicketCardRow key={t.id} t={t} showRequester={false} />)}
        </Panel>

        <Panel title="Coba selesaikan sendiri" actions={<Link href="/knowledge" className="link text-sm">Semua artikel</Link>} bodyClass="!p-0">
          {data?.articles.map((a) => (
            <Link key={a.id} href={`/knowledge/${a.slug}`} className="flex gap-3 border-b border-line/70 px-5 py-3.5 last:border-0 hover:bg-paper/70">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <span>
                <span className="block text-sm font-semibold text-ink">{a.title}</span>
                {a.summary && <span className="mt-0.5 line-clamp-2 block text-xs text-text-muted">{a.summary}</span>}
              </span>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Helpdesk

interface HelpdeskSummary {
  kind: 'helpdesk';
  kpi: {
    newToday: number;
    open: number;
    unassigned: number;
    overdue: number;
    warning: number;
    p1Open: number;
    resolvedToday: number;
    mineOpen: number;
    slaCompliance: number | null;
    slaTarget: number;
    slaDenominator: number;
    csatAvg: number | null;
    csatCount: number;
  };
  byPriority: Array<{ priority: TicketPriority; count: number }>;
  byStatus: Array<{ status: TicketStatus; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  workload: Array<{ agentId: string; name: string; team: string | null; open: number }>;
  trend: Array<{ date: string; created: number; resolved: number }>;
  queue: TicketRow[];
}

function HelpdeskDashboard() {
  const { user, can } = useSession();
  const { data, error, mutate } = useSWR<HelpdeskSummary>('/dashboard/summary', fetcher, { refreshInterval: 60_000 });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-text-muted">
            {greeting()}, {user.name.split(' ')[0]}. {fmtDate(new Date())}
          </p>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-ink">Kondisi layanan hari ini</h1>
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/tickets?assigneeId=me" variant="secondary">
            Tiket saya{data ? ` (${data.kpi.mineOpen})` : ''}
          </ButtonLink>
          <ButtonLink href="/tickets?assigneeId=unassigned">Ambil dari antrean</ButtonLink>
        </div>
      </header>

      <ErrorBanner error={error} onRetry={() => mutate()} />

      {data?.kpi.p1Open ? (
        <Link
          href="/tickets?priority=P1&scope=queue"
          className="flex items-center gap-3 rounded-panel border border-danger/30 bg-danger-50 px-5 py-3 text-sm font-semibold text-danger hover:bg-danger-100"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
          </span>
          {data.kpi.p1Open} tiket P1 (kritis) sedang aktif. Kepala Divisi IT sudah dinotifikasi.
        </Link>
      ) : null}

      <section className="panel grid grid-cols-2 divide-line overflow-hidden sm:grid-cols-3 lg:grid-cols-6 [&>*]:border-b [&>*]:border-r [&>*]:border-line">
        {data ? (
          <>
            <Stat label="Tiket terbuka" value={data.kpi.open} sub={`${data.kpi.newToday} masuk hari ini`} href="/tickets?scope=queue" />
            <Stat label="Belum di-assign" value={data.kpi.unassigned} tone={data.kpi.unassigned ? 'copper' : undefined} href="/tickets?assigneeId=unassigned" />
            <Stat label="Melewati SLA" value={data.kpi.overdue} tone={data.kpi.overdue ? 'danger' : undefined} sub="perlu eskalasi manajemen" href="/tickets?sla=overdue" />
            <Stat label="Lewat 50% SLA" value={data.kpi.warning} tone={data.kpi.warning ? 'copper' : undefined} sub="batas eskalasi ke L2" href="/tickets?sla=warning" />
            <Stat
              label="SLA bulan ini"
              value={data.kpi.slaCompliance === null ? '—' : `${data.kpi.slaCompliance}%`}
              tone={data.kpi.slaCompliance !== null && data.kpi.slaCompliance < data.kpi.slaTarget ? 'danger' : undefined}
              sub={`target >${data.kpi.slaTarget}% dari ${data.kpi.slaDenominator} tiket selesai`}
              href={can('report.view') ? '/reports' : undefined}
            />
            <Stat label="Kepuasan user" value={data.kpi.csatAvg ?? '—'} sub={`${data.kpi.csatCount} survei bulan ini, skala 1–5`} />
          </>
        ) : (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-5 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-7 w-12" />
            </div>
          ))
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel
          title="Perlu perhatian"
          actions={<Link href="/tickets?scope=queue&sort=resolutionDueAt" className="link text-sm">Buka antrean</Link>}
          bodyClass="!p-0"
        >
          {!data && <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>}
          {data?.queue.length === 0 && <EmptyState title="Antrean bersih">Tidak ada tiket terbuka saat ini.</EmptyState>}
          {data?.queue.map((t) => <TicketCardRow key={t.id} t={t} />)}
        </Panel>

        <div className="space-y-6">
          <Panel title="Tiket terbuka per prioritas">
            <BarList
              items={(data?.byPriority ?? []).map((p) => ({ label: PRIORITY_LABEL[p.priority], value: p.count, href: `/tickets?priority=${p.priority}&scope=queue`, tone: p.priority === 'P1' ? 'danger' : p.priority === 'P2' ? 'copper' : 'teal' }))}
            />
          </Panel>
          <Panel title="Beban petugas" bodyClass="!py-3">
            {data?.workload.length === 0 && <p className="py-4 text-sm text-text-muted">Belum ada tiket yang di-assign.</p>}
            <ul className="divide-y divide-line/70">
              {data?.workload.slice(0, 7).map((w) => (
                <li key={w.agentId} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <Link href={`/tickets?assigneeId=${w.agentId}&scope=queue`} className="block truncate text-sm font-semibold text-ink hover:text-teal">
                      {w.name}
                    </Link>
                    <span className="block truncate text-xs text-text-muted">{w.team}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5" aria-hidden>
                      {Array.from({ length: Math.min(w.open, 8) }).map((_, i) => (
                        <span key={i} className={`h-3.5 w-1.5 rounded-sm ${w.open > 5 ? 'bg-copper' : 'bg-teal'}`} />
                      ))}
                    </span>
                    <span className="w-6 text-right text-sm font-bold tabular-nums">{w.open}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Masuk vs selesai, 14 hari terakhir">{data && <TrendChart data={data.trend} />}</Panel>
        <Panel title="Kategori terbanyak, 30 hari">
          <BarList items={(data?.byCategory ?? []).map((c) => ({ label: c.category, value: c.count }))} />
          {data && (
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-xs text-text-muted">
              {data.byStatus.map((s) => (
                <span key={s.status}>
                  {STATUS_LABEL[s.status]}: <b className="text-ink">{s.count}</b>
                </span>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

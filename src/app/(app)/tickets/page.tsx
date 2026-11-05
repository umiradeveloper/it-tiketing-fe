'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Download, Inbox, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { LEVEL_LABEL, PRIORITY_LABEL, STATUS_LABEL, type TicketPriority, type TicketStatus } from '@/shared';
import { fetcher, qs } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import type { Paginated, TicketRow } from '@/lib/types';
import { fmtDateTime, timeAgo } from '@/lib/format';
import { Button, ButtonLink, EmptyState, ErrorBanner, PageHeader, Pagination, PriorityBadge, Select, SlaFuse, Spinner, StatusBadge, Tabs } from '@/components/ui';
import { TicketCardRow } from '@/components/tickets';

type AgentTab = 'queue' | 'mine' | 'unassigned' | 'overdue' | 'all';
type ReqTab = 'open' | 'resolved' | 'closed' | 'all';

const AGENT_TABS: Record<AgentTab, Record<string, string>> = {
  queue: { scope: 'queue' },
  mine: { scope: 'queue', assigneeId: 'me' },
  unassigned: { scope: 'queue', assigneeId: 'unassigned' },
  overdue: { sla: 'overdue' },
  all: {},
};
const REQ_TABS: Record<ReqTab, Record<string, string>> = {
  open: { scope: 'mine', status: 'NEW,OPEN,IN_PROGRESS,PENDING_USER,PENDING_VENDOR' },
  resolved: { scope: 'mine', status: 'RESOLVED' },
  closed: { scope: 'mine', status: 'CLOSED,CANCELLED' },
  all: { scope: 'mine' },
};

const FILTER_KEYS = ['q', 'priority', 'status', 'categoryId', 'locationId', 'teamId', 'assigneeId', 'sla', 'scope', 'sort'] as const;

function TicketsInner() {
  const { isAgent, can } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data: lookups } = useLookups();
  const [showFilters, setShowFilters] = useState(false);

  const tab = (params.get('tab') ?? (isAgent ? 'queue' : 'open')) as AgentTab | ReqTab;
  const page = Number(params.get('page') ?? 1);
  const [q, setQ] = useState(params.get('q') ?? '');

  // Filter eksplisit di URL (mis. dari dashboard) mengalahkan tab default
  const explicit = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? undefined]).filter(([, v]) => v));
  const hasExplicit = Object.keys(explicit).some((k) => k !== 'q' && k !== 'sort');
  const base = hasExplicit ? {} : isAgent ? AGENT_TABS[tab as AgentTab] ?? AGENT_TABS.queue : REQ_TABS[tab as ReqTab] ?? REQ_TABS.open;
  const query = { ...base, ...explicit, page, pageSize: 20, sort: explicit.sort ?? (isAgent && tab !== 'all' ? 'resolutionDueAt' : undefined) };
  const key = `/tickets${qs(query)}`;
  const { data, error, isLoading, mutate } = useSWR<Paginated<TicketRow>>(key, fetcher, { keepPreviousData: true, refreshInterval: isAgent ? 45_000 : 0 });

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get('q') ?? '') !== q) setParams({ q: q || null });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const clearFilters = () => router.replace(`${pathname}?tab=${tab}`);
  const activeFilterCount = FILTER_KEYS.filter((k) => k !== 'q' && k !== 'sort' && params.get(k)).length;

  const agentTabs: Array<{ value: AgentTab; label: string }> = [
    { value: 'queue', label: 'Antrean terbuka' },
    { value: 'mine', label: 'Ditugaskan ke saya' },
    { value: 'unassigned', label: 'Belum di-assign' },
    { value: 'overdue', label: 'Melewati SLA' },
    { value: 'all', label: 'Semua tiket' },
  ];
  const reqTabs: Array<{ value: ReqTab; label: string }> = [
    { value: 'open', label: 'Sedang ditangani' },
    { value: 'resolved', label: 'Menunggu konfirmasi' },
    { value: 'closed', label: 'Selesai' },
    { value: 'all', label: 'Semua' },
  ];

  return (
    <div>
      <PageHeader
        title={isAgent ? 'Antrean tiket' : 'Tiket saya'}
        description={isAgent ? 'Diurutkan berdasarkan tenggat SLA terdekat. Garis putih di sumbu SLA menandai batas 50% untuk eskalasi ke L2.' : 'Pantau status laporan dan permintaan Anda ke tim IT.'}
        actions={
          <>
            {can('report.view') && (
              <a href={`/api/v1/reports/operations/export${qs({ format: 'csv' })}`} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-text-muted hover:bg-white hover:text-ink">
                <Download className="h-4 w-4" /> Ekspor CSV
              </a>
            )}
            {can('ticket.create') && (
              <ButtonLink href="/tickets/new">
                <Plus className="h-4 w-4" /> {isAgent ? 'Catat tiket' : 'Buat tiket'}
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="panel overflow-hidden">
        <div className="px-4 pt-1">
          {isAgent ? (
            <Tabs value={hasExplicit ? ('' as AgentTab) : (tab as AgentTab)} onChange={(v) => router.replace(`${pathname}?tab=${v}`)} items={agentTabs} />
          ) : (
            <Tabs value={hasExplicit ? ('' as ReqTab) : (tab as ReqTab)} onChange={(v) => router.replace(`${pathname}?tab=${v}`)} items={reqTabs} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={isAgent ? 'Cari nomor tiket, judul, atau nama pelapor' : 'Cari nomor atau judul tiket'}
              className="input !pl-9"
              aria-label="Cari tiket"
            />
          </div>
          <Button variant="secondary" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
            <SlidersHorizontal className="h-4 w-4" /> Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" onClick={clearFilters}>
              <X className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-line bg-paper/50 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={params.get('priority') ?? ''} onChange={(e) => setParams({ priority: e.target.value || null })} aria-label="Prioritas">
              <option value="">Semua prioritas</option>
              {(['P1', 'P2', 'P3', 'P4'] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </Select>
            <Select value={params.get('status') ?? ''} onChange={(e) => setParams({ status: e.target.value || null })} aria-label="Status">
              <option value="">Semua status</option>
              {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </Select>
            <Select value={params.get('categoryId') ?? ''} onChange={(e) => setParams({ categoryId: e.target.value || null })} aria-label="Kategori">
              <option value="">Semua kategori</option>
              {lookups?.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select value={params.get('locationId') ?? ''} onChange={(e) => setParams({ locationId: e.target.value || null })} aria-label="Lokasi">
              <option value="">Semua lokasi / site</option>
              {lookups?.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
            {isAgent && (
              <>
                <Select value={params.get('teamId') ?? ''} onChange={(e) => setParams({ teamId: e.target.value || null })} aria-label="Tim">
                  <option value="">Semua tim</option>
                  {lookups?.teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
                <Select value={params.get('assigneeId') ?? ''} onChange={(e) => setParams({ assigneeId: e.target.value || null })} aria-label="Petugas">
                  <option value="">Semua petugas</option>
                  <option value="me">Saya</option>
                  <option value="unassigned">Belum di-assign</option>
                  {lookups?.agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
                <Select value={params.get('sla') ?? ''} onChange={(e) => setParams({ sla: e.target.value || null })} aria-label="Kondisi SLA">
                  <option value="">Semua kondisi SLA</option>
                  <option value="warning">Lewat 50% (peringatan)</option>
                  <option value="overdue">Melewati tenggat</option>
                  <option value="paused">SLA dijeda</option>
                  <option value="breached">Pernah melanggar SLA</option>
                </Select>
                <Select value={params.get('sort') ?? ''} onChange={(e) => setParams({ sort: e.target.value || null })} aria-label="Urutkan">
                  <option value="">Urut: tenggat SLA</option>
                  <option value="priority">Urut: prioritas</option>
                  <option value="createdAt">Urut: terbaru</option>
                  <option value="updatedAt">Urut: terakhir diperbarui</option>
                </Select>
              </>
            )}
          </div>
        )}

        <ErrorBanner error={error} onRetry={() => mutate()} />
        {isLoading && !data && <Spinner />}

        {data && data.data.length === 0 && (
          <EmptyState icon={Inbox} title={params.get('q') || activeFilterCount ? 'Tidak ada tiket yang cocok' : 'Belum ada tiket di sini'} action={activeFilterCount ? <Button variant="secondary" onClick={clearFilters}>Reset filter</Button> : undefined}>
            {params.get('q') || activeFilterCount ? 'Ubah kata kunci atau filter pencarian.' : isAgent ? 'Antrean kosong untuk tampilan ini.' : 'Tiket yang Anda buat akan tampil di sini.'}
          </EmptyState>
        )}

        {data && data.data.length > 0 && (
          <>
            {/* Tabel untuk layar lebar */}
            <div className={clsx('hidden overflow-x-auto', isAgent ? 'lg:block' : 'md:block')}>
              <table className="w-full min-w-[900px]">
                <thead className="table-head">
                  <tr>
                    <th className="w-[34%]">Tiket</th>
                    <th>Prioritas</th>
                    <th>Status</th>
                    {isAgent && <th>Pelapor</th>}
                    <th>Petugas</th>
                    <th className="w-[160px]">SLA penyelesaian</th>
                    <th>Dibuat</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {data.data.map((t) => (
                    <tr
                      key={t.id}
                      className={clsx('cursor-pointer transition-colors hover:bg-paper/70', t.sla.state === 'overdue' && 'bg-danger-50/40')}
                      onClick={() => router.push(`/tickets/${t.id}`)}
                    >
                      <td>
                        <Link href={`/tickets/${t.id}`} className="block min-w-0" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs font-semibold text-text-muted">{t.ticketNo}</span>
                          {t.escalationLevel !== 'L1' && <span className="ml-2 text-2xs font-semibold text-copper-600">{LEVEL_LABEL[t.escalationLevel]}</span>}
                          <span className="mt-0.5 block truncate font-semibold text-ink hover:text-teal">{t.title}</span>
                          <span className="block truncate text-xs text-text-muted">
                            {t.category.name}
                            {t.subcategory ? ` / ${t.subcategory.name}` : ''}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      {isAgent && (
                        <td>
                          <span className="block max-w-[160px] truncate font-medium">{t.requester.name}</span>
                          <span className="block max-w-[160px] truncate text-xs text-text-muted">{t.location?.name ?? t.requester.department?.name ?? '—'}</span>
                        </td>
                      )}
                      <td>
                        {t.assignee ? (
                          <span className="block max-w-[150px] truncate">{t.assignee.name}</span>
                        ) : (
                          <span className="text-xs font-semibold text-copper-600">Belum di-assign</span>
                        )}
                        {t.team && <span className="block max-w-[150px] truncate text-xs text-text-muted">{t.team.name}</span>}
                      </td>
                      <td>
                        <SlaFuse sla={t.sla} compact className="!w-36" />
                      </td>
                      <td className="whitespace-nowrap text-xs text-text-muted" title={fmtDateTime(t.createdAt)}>
                        {timeAgo(t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Kartu untuk layar kecil */}
            <div className={clsx(isAgent ? 'lg:hidden' : 'md:hidden')}>
              {data.data.map((t) => (
                <TicketCardRow key={t.id} t={t} showRequester={isAgent} />
              ))}
            </div>
            <Pagination meta={data.meta} onPage={(p) => setParams({ page: String(p) })} />
          </>
        )}
      </div>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <TicketsInner />
    </Suspense>
  );
}

'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, ClipboardCheck, Plus } from 'lucide-react';
import { ACCESS_STATUS_LABEL, ACCESS_TYPE_LABEL, type AccessRequestStatus, type AccessRequestType } from '@/shared';
import { fetcher, qs } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Paginated } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import { ACCESS_TONE } from '@/lib/assets';
import { Badge, ButtonLink, EmptyState, PageHeader, Pagination, Select, Spinner, Tabs } from '@/components/ui';

interface AccessRow {
  id: string;
  requestNo: string;
  requestType: AccessRequestType;
  employeeName: string;
  position: string | null;
  effectiveDate: string;
  status: AccessRequestStatus;
  isLateSubmission: boolean;
  approver: { name: string } | null;
  requestedBy: { name: string } | null;
  progress: { done: number; total: number };
}

type Scope = 'active' | 'approvals' | 'done' | 'all';

export default function AccessListPage() {
  const { can } = useSession();
  const [scope, setScope] = useState<Scope>('active');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const params =
    scope === 'approvals'
      ? { scope: 'approvals' }
      : scope === 'active'
        ? { status: 'PENDING_APPROVAL,APPROVED,IN_PROGRESS' }
        : scope === 'done'
          ? { status: 'COMPLETED,REJECTED,CANCELLED' }
          : {};
  const { data, isLoading } = useSWR<Paginated<AccessRow>>(`/access-requests${qs({ ...params, type, page })}`, fetcher, { keepPreviousData: true });
  const { data: approvals } = useSWR<Paginated<AccessRow>>('/access-requests?scope=approvals', fetcher);

  return (
    <div>
      <PageHeader
        title="Akses & onboarding"
        description="Onboarding, mutasi, offboarding, serta mobilisasi/demobilisasi site. Semua perubahan akses melalui persetujuan atasan (least privilege)."
        actions={
          can('access.create') && (
            <ButtonLink href="/access-requests/new">
              <Plus className="h-4 w-4" /> Ajukan permintaan
            </ButtonLink>
          )
        }
      />
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-1">
          <Tabs
            value={scope}
            onChange={(v) => { setScope(v); setPage(1); }}
            items={[
              { value: 'active', label: 'Berjalan' },
              { value: 'approvals', label: 'Perlu persetujuan saya', count: approvals?.meta.total },
              { value: 'done', label: 'Selesai' },
              { value: 'all', label: 'Semua' },
            ]}
          />
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="mb-2 !w-auto" aria-label="Jenis permintaan">
            <option value="">Semua jenis</option>
            {(Object.keys(ACCESS_TYPE_LABEL) as AccessRequestType[]).map((t) => (
              <option key={t} value={t}>{ACCESS_TYPE_LABEL[t]}</option>
            ))}
          </Select>
        </div>
        {isLoading && !data && <Spinner />}
        {data?.data.length === 0 && <EmptyState icon={ClipboardCheck} title="Tidak ada permintaan">Permintaan yang sesuai filter akan tampil di sini.</EmptyState>}
        {!!data?.data.length && (
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[820px]">
              <thead className="table-head">
                <tr>
                  <th>Permintaan</th>
                  <th>Karyawan</th>
                  <th>Tanggal efektif</th>
                  <th>Status</th>
                  <th>Penyetuju</th>
                  <th className="w-[160px]">Checklist IT</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {data.data.map((r) => {
                  const pct = r.progress.total ? (r.progress.done / r.progress.total) * 100 : 0;
                  return (
                    <tr key={r.id} className="hover:bg-paper/70">
                      <td>
                        <Link href={`/access-requests/${r.id}`} className="font-bold text-ink hover:text-teal">
                          {ACCESS_TYPE_LABEL[r.requestType]}
                        </Link>
                        <span className="block text-xs text-text-muted">
                          {r.requestNo}, oleh {r.requestedBy?.name}
                        </span>
                      </td>
                      <td>
                        <span className="block font-medium">{r.employeeName}</span>
                        <span className="block text-xs text-text-muted">{r.position ?? '—'}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        {fmtDate(r.effectiveDate)}
                        {r.isLateSubmission && (
                          <span className="mt-0.5 flex items-center gap-1 text-2xs font-semibold text-copper-600" title="Diajukan kurang dari batas minimal hari kerja sebelum tanggal masuk">
                            <AlertTriangle className="h-3 w-3" /> Pengajuan mepet
                          </span>
                        )}
                      </td>
                      <td>
                        <Badge tone={ACCESS_TONE[r.status]}>{ACCESS_STATUS_LABEL[r.status]}</Badge>
                      </td>
                      <td className="text-text-muted">{r.approver?.name ?? '—'}</td>
                      <td>
                        <span className="text-xs font-semibold text-text-muted">
                          {r.progress.done}/{r.progress.total} item
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-paper">
                          <span className={clsx('block h-full rounded-full', pct === 100 ? 'bg-ok' : 'bg-teal')} style={{ width: `${pct}%` }} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination meta={data.meta} onPage={setPage} />}
      </div>
    </div>
  );
}

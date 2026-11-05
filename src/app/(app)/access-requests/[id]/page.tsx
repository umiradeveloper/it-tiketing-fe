'use client';

import clsx from 'clsx';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, Check, CircleDashed, MinusCircle } from 'lucide-react';
import { ACCESS_ACTION_LABEL, ACCESS_STATUS_LABEL, ACCESS_TYPE_LABEL, type AccessItemAction, type AccessRequestStatus, type AccessRequestType } from '@/shared';
import { api, errorText, fetcher } from '@/lib/api';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { ACCESS_TONE } from '@/lib/assets';
import { Badge, Button, ErrorBanner, Input, KeyVal, PageHeader, Panel, Spinner, Textarea, useToast } from '@/components/ui';

interface Detail {
  id: string;
  requestNo: string;
  requestType: AccessRequestType;
  employeeName: string;
  employeeCode: string | null;
  position: string | null;
  effectiveDate: string;
  status: AccessRequestStatus;
  notes: string | null;
  isLateSubmission: boolean;
  createdAt: string;
  completedAt: string | null;
  department: { name: string } | null;
  location: { name: string } | null;
  approver: { name: string } | null;
  requestedBy: { name: string } | null;
  items: Array<{ id: string; systemName: string; action: AccessItemAction; detail: string | null; status: 'PENDING' | 'DONE' | 'NOT_APPLICABLE'; evidence: string | null; completedAt: string | null; completedBy: { name: string } | null }>;
  approvals: Array<{ id: string; decision: 'APPROVED' | 'REJECTED'; note: string | null; decidedAt: string; approver: { name: string } }>;
  history: Array<{ id: string; action: string; createdAt: string; actor: string }>;
  actions: { canDecide: boolean; canFulfill: boolean; canCancel: boolean };
}

const HISTORY_LABEL: Record<string, string> = {
  ACCESS_REQUEST_CREATED: 'Permintaan diajukan',
  ACCESS_REQUEST_APPROVED: 'Disetujui atasan',
  ACCESS_REQUEST_REJECTED: 'Ditolak atasan',
  ACCESS_REQUEST_CANCELLED: 'Dibatalkan',
  ACCESS_ITEM_UPDATED: 'Checklist diperbarui',
};

export default function AccessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data: r, error, mutate } = useSWR<Detail>(`/access-requests/${id}`, fetcher);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [evidence, setEvidence] = useState<Record<string, string>>({});

  if (error) return <ErrorBanner error={error} />;
  if (!r) return <Spinner />;

  const decide = async (approved: boolean) => {
    setBusy(true);
    try {
      await api.post(`/access-requests/${r.id}/approve`, { approved, note: note || undefined });
      toast(approved ? 'Permintaan disetujui, tim IT dinotifikasi' : 'Permintaan ditolak');
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const updateItem = async (itemId: string, status: 'PENDING' | 'DONE' | 'NOT_APPLICABLE') => {
    try {
      await api.patch(`/access-requests/${r.id}/items/${itemId}`, { status, evidence: evidence[itemId] || undefined });
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };
  const done = r.items.filter((i) => i.status !== 'PENDING').length;

  return (
    <div>
      <PageHeader
        back={{ href: '/access-requests', label: 'Akses & onboarding' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {ACCESS_TYPE_LABEL[r.requestType]}: {r.employeeName}
            <Badge tone={ACCESS_TONE[r.status]}>{ACCESS_STATUS_LABEL[r.status]}</Badge>
          </span>
        }
        description={`${r.requestNo}, diajukan ${r.requestedBy?.name ?? ''} pada ${fmtDate(r.createdAt)}`}
        actions={
          r.actions.canCancel && (
            <Button
              variant="ghost"
              onClick={async () => {
                await api.post(`/access-requests/${r.id}/cancel`).catch((e) => toast(errorText(e), 'error'));
                mutate();
              }}
            >
              Batalkan permintaan
            </Button>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {r.actions.canDecide && (
            <section className="rounded-panel border-2 border-copper/50 bg-copper-50/60 p-5">
              <h2 className="text-base font-bold text-ink">Tinjau hak akses yang diminta</h2>
              <p className="mt-1 text-sm text-text-muted">Setujui hanya akses yang dibutuhkan untuk pekerjaan karyawan (prinsip least privilege).</p>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (wajib bila menolak)" className="mt-3 !min-h-[64px] bg-white" />
              <div className="mt-3 flex gap-2">
                <Button loading={busy} onClick={() => decide(true)}>Setujui</Button>
                <Button variant="secondary" disabled={busy || note.trim().length < 3} onClick={() => decide(false)}>
                  Tolak
                </Button>
              </div>
            </section>
          )}

          <Panel
            title="Checklist IT"
            actions={
              <span className="text-sm font-semibold text-text-muted">
                {done}/{r.items.length} selesai
              </span>
            }
            bodyClass="!p-0"
          >
            {r.status === 'PENDING_APPROVAL' && <p className="border-b border-line bg-paper/60 px-5 py-2.5 text-xs text-text-muted">Checklist dapat dikerjakan setelah atasan menyetujui.</p>}
            <ul className="divide-y divide-line/70">
              {r.items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-start gap-3 px-5 py-3.5">
                  <span className={clsx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full', it.status === 'DONE' ? 'bg-ok text-white' : it.status === 'NOT_APPLICABLE' ? 'bg-paper text-text-faint' : 'border-2 border-dashed border-line-strong text-transparent')}>
                    {it.status === 'DONE' ? <Check className="h-3.5 w-3.5" /> : it.status === 'NOT_APPLICABLE' ? <MinusCircle className="h-4 w-4" /> : <CircleDashed className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={clsx('text-sm font-semibold', it.status === 'NOT_APPLICABLE' ? 'text-text-faint line-through' : 'text-ink')}>
                      {ACCESS_ACTION_LABEL[it.action]}: {it.systemName}
                    </p>
                    {it.detail && <p className="text-xs text-text-muted">{it.detail}</p>}
                    {it.completedBy && (
                      <p className="mt-0.5 text-xs text-text-muted">
                        {it.status === 'DONE' ? 'Dikerjakan' : 'Ditandai tidak perlu'} oleh {it.completedBy.name}, {fmtDateTime(it.completedAt)}
                        {it.evidence ? `. Bukti: ${it.evidence}` : ''}
                      </p>
                    )}
                    {r.actions.canFulfill && it.status === 'PENDING' && (
                      <Input
                        value={evidence[it.id] ?? ''}
                        onChange={(e) => setEvidence({ ...evidence, [it.id]: e.target.value })}
                        placeholder="Bukti / keterangan (mis. no. BA, username)"
                        className="mt-2 !py-1.5 !text-xs"
                      />
                    )}
                  </div>
                  {r.actions.canFulfill && (
                    <div className="flex gap-1.5">
                      {it.status === 'PENDING' ? (
                        <>
                          <Button size="sm" onClick={() => updateItem(it.id, 'DONE')}>Selesai</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateItem(it.id, 'NOT_APPLICABLE')}>Tidak perlu</Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => updateItem(it.id, 'PENDING')}>Batalkan tanda</Button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Detail">
            <dl className="divide-y divide-line/70">
              <KeyVal k="NIK / kode">{r.employeeCode ?? '—'}</KeyVal>
              <KeyVal k="Jabatan">{r.position ?? '—'}</KeyVal>
              <KeyVal k="Divisi">{r.department?.name ?? '—'}</KeyVal>
              <KeyVal k="Lokasi">{r.location?.name ?? '—'}</KeyVal>
              <KeyVal k={r.requestType === 'OFFBOARDING' ? 'Hari terakhir' : 'Tanggal efektif'}>{fmtDate(r.effectiveDate)}</KeyVal>
              <KeyVal k="Penyetuju">{r.approver?.name ?? '—'}</KeyVal>
            </dl>
            {r.isLateSubmission && (
              <p className="mt-3 flex items-start gap-2 text-xs font-medium text-copper-600">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Diajukan kurang dari 3 hari kerja sebelum tanggal masuk.
              </p>
            )}
            {r.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-paper px-3 py-2 text-sm text-text-muted">{r.notes}</p>}
          </Panel>
          <Panel title="Jejak persetujuan">
            <ol className="space-y-3">
              {r.history.length === 0 && <li className="text-sm text-text-muted">Belum ada catatan.</li>}
              {r.history.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="font-semibold text-ink">{HISTORY_LABEL[h.action] ?? h.action}</span>
                  <span className="block text-xs text-text-muted">
                    {h.actor}, {fmtDateTime(h.createdAt)}
                  </span>
                </li>
              ))}
              {r.approvals
                .filter((a) => a.note)
                .map((a) => (
                  <li key={a.id} className="rounded-lg bg-paper px-3 py-2 text-xs text-text-muted">
                    <b className="text-ink">{a.approver.name}:</b> {a.note}
                  </li>
                ))}
            </ol>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

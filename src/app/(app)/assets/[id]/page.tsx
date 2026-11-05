'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { CalendarCheck2, CheckCircle2, Pencil, Wrench } from 'lucide-react';
import { ASSET_STATUS_LABEL, ASSET_TYPE_LABEL, type AssetStatus, type AssetType, type TicketPriority, type TicketStatus } from '@/shared';
import { api, errorText, fetcher, qs } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import { fmtDate, fmtDateTime, isoDateWib } from '@/lib/format';
import { ASSET_TONE } from '@/lib/assets';
import { Badge, Button, ErrorBanner, Field, Input, KeyVal, Modal, PageHeader, Panel, PriorityBadge, Select, Spinner, StatusBadge, Textarea, useToast } from '@/components/ui';

interface Maint {
  id: string;
  plannedAt: string;
  completedAt: string | null;
  status: 'SCHEDULED' | 'DONE' | 'CANCELLED';
  result: string | null;
  checklist: Record<string, boolean> | null;
  nextDueAt: string | null;
  technician: { name: string } | null;
}
interface AssetDetail {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  type: AssetType;
  brand: string;
  model: string;
  specs: string | null;
  status: AssetStatus;
  acquiredAt: string | null;
  warrantyUntil: string | null;
  notes: string | null;
  assignedUser: { id: string; name: string; email: string; department: { name: string } | null } | null;
  location: { id: string; name: string } | null;
  maintenances: Maint[];
  tickets: Array<{ id: string; ticketNo: string; title: string; status: TicketStatus; priority: TicketPriority; createdAt: string }>;
  history: Array<{ id: string; action: string; createdAt: string; actorName: string; afterJson: Record<string, unknown> | null }>;
}

const CHECKLIST = [
  ['pembersihan', 'Pembersihan fisik & ventilasi'],
  ['updateOS', 'Update OS & driver'],
  ['antivirus', 'Antivirus aktif & terbaru'],
  ['backup', 'Backup data user terverifikasi'],
  ['lisensi', 'Software berlisensi resmi'],
  ['baterai', 'Kesehatan baterai / power supply'],
] as const;

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = useSession();
  const { data: a, error, mutate } = useSWR<AssetDetail>(`/assets/${id}`, fetcher);
  const [editing, setEditing] = useState(false);
  const [maint, setMaint] = useState<null | { mode: 'schedule' } | { mode: 'complete'; m: Maint }>(null);

  if (error) return <ErrorBanner error={error} />;
  if (!a) return <Spinner />;
  const manage = can('asset.manage');

  return (
    <div>
      <PageHeader
        back={{ href: '/assets', label: 'Aset & perangkat' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {a.assetTag} <Badge tone={ASSET_TONE[a.status]}>{ASSET_STATUS_LABEL[a.status]}</Badge>
          </span>
        }
        description={`${ASSET_TYPE_LABEL[a.type]}, ${a.brand} ${a.model}`}
        actions={
          manage && (
            <>
              <Button variant="secondary" onClick={() => setMaint({ mode: 'schedule' })}>
                <Wrench className="h-4 w-4" /> Catat maintenance
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Ubah
              </Button>
            </>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Panel title="Data aset">
            <dl className="divide-y divide-line/70">
              <KeyVal k="Serial number">{a.serialNumber ?? '—'}</KeyVal>
              <KeyVal k="Spesifikasi">{a.specs ?? '—'}</KeyVal>
              <KeyVal k="Pemegang">{a.assignedUser ? `${a.assignedUser.name}` : '—'}</KeyVal>
              {a.assignedUser?.department && <KeyVal k="Divisi">{a.assignedUser.department.name}</KeyVal>}
              <KeyVal k="Lokasi">{a.location?.name ?? '—'}</KeyVal>
              <KeyVal k="Diperoleh">{fmtDate(a.acquiredAt)}</KeyVal>
              <KeyVal k="Garansi">
                <span className={clsx(a.warrantyUntil && new Date(a.warrantyUntil) < new Date() && 'text-danger')}>{fmtDate(a.warrantyUntil)}</span>
              </KeyVal>
            </dl>
            {a.notes && <p className="mt-3 whitespace-pre-line rounded-lg bg-paper px-3 py-2 text-sm text-text-muted">{a.notes}</p>}
          </Panel>
          <Panel title="Riwayat perubahan" bodyClass="!py-3">
            <ol className="space-y-3">
              {a.history.length === 0 && <li className="text-sm text-text-muted">Belum ada perubahan tercatat.</li>}
              {a.history.map((h) => (
                <li key={h.id} className="text-sm">
                  <span className="font-semibold text-ink">{h.action.replace('ASSET_', '').replace('MAINTENANCE_', 'Maintenance ').replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="block text-xs text-text-muted">
                    {h.actorName}, {fmtDateTime(h.createdAt)}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Maintenance preventif" bodyClass="!p-0">
            {a.maintenances.length === 0 && <p className="px-5 py-6 text-sm text-text-muted">Belum ada jadwal maintenance.</p>}
            <ul className="divide-y divide-line/70">
              {a.maintenances.map((m) => {
                const late = m.status === 'SCHEDULED' && new Date(m.plannedAt) < new Date();
                return (
                  <li key={m.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
                    <span className={clsx('mt-0.5 flex h-8 w-8 items-center justify-center rounded-full', m.status === 'DONE' ? 'bg-ok-50 text-ok' : late ? 'bg-danger-50 text-danger' : 'bg-copper-50 text-copper')}>
                      {m.status === 'DONE' ? <CheckCircle2 className="h-4 w-4" /> : <CalendarCheck2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink">
                        {m.status === 'DONE' ? `Selesai ${fmtDate(m.completedAt)}` : m.status === 'CANCELLED' ? 'Dibatalkan' : `${late ? 'Terlewat, dijadwalkan' : 'Dijadwalkan'} ${fmtDate(m.plannedAt)}`}
                      </p>
                      <p className="text-xs text-text-muted">
                        {m.technician?.name ?? 'Teknisi belum ditentukan'}
                        {m.nextDueAt && m.status === 'DONE' ? `. Berikutnya ${fmtDate(m.nextDueAt)}` : ''}
                      </p>
                      {m.result && <p className="mt-1.5 text-sm text-text">{m.result}</p>}
                      {m.checklist && (
                        <p className="mt-1.5 flex flex-wrap gap-1.5">
                          {Object.entries(m.checklist).map(([k, v]) => (
                            <Badge key={k} tone={v ? 'ok' : 'neutral'}>
                              {CHECKLIST.find((c) => c[0] === k)?.[1] ?? k}
                            </Badge>
                          ))}
                        </p>
                      )}
                    </div>
                    {manage && m.status === 'SCHEDULED' && (
                      <Button size="sm" variant="secondary" onClick={() => setMaint({ mode: 'complete', m })}>
                        Catat hasil
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title="Tiket terkait" bodyClass="!p-0">
            {a.tickets.length === 0 && <p className="px-5 py-6 text-sm text-text-muted">Belum ada tiket untuk perangkat ini.</p>}
            <ul className="divide-y divide-line/70">
              {a.tickets.map((t) => (
                <li key={t.id}>
                  <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-paper/70">
                    <PriorityBadge priority={t.priority} short />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{t.title}</span>
                      <span className="text-xs text-text-muted">
                        {t.ticketNo}, {fmtDate(t.createdAt)}
                      </span>
                    </span>
                    <StatusBadge status={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {editing && <EditAssetModal a={a} onClose={() => setEditing(false)} onSaved={mutate} />}
      {maint && <MaintenanceModal assetId={a.id} state={maint} onClose={() => setMaint(null)} onSaved={mutate} />}
    </div>
  );
}

function EditAssetModal({ a, onClose, onSaved }: { a: AssetDetail; onClose: () => void; onSaved: () => void }) {
  const { data: lookups } = useLookups();
  const toast = useToast();
  const [userQ, setUserQ] = useState('');
  const { data: users } = useSWR<{ data: Array<{ id: string; name: string; department?: { name: string } | null }> }>(userQ.length >= 2 ? `/users${qs({ q: userQ })}` : null, fetcher);
  const [f, setF] = useState({
    status: a.status,
    assignedUserId: a.assignedUser?.id ?? '',
    assignedName: a.assignedUser?.name ?? '',
    locationId: a.location?.id ?? '',
    serialNumber: a.serialNumber ?? '',
    specs: a.specs ?? '',
    warrantyUntil: a.warrantyUntil?.slice(0, 10) ?? '',
    notes: a.notes ?? '',
    reason: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needReason = f.status === 'DISPOSED' && a.status !== 'DISPOSED';

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/assets/${a.id}`, {
        status: f.status,
        assignedUserId: f.assignedUserId || null,
        locationId: f.locationId || null,
        serialNumber: f.serialNumber || undefined,
        specs: f.specs || undefined,
        warrantyUntil: f.warrantyUntil || undefined,
        notes: f.notes || undefined,
        reason: f.reason || undefined,
      });
      toast('Data aset diperbarui');
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Ubah ${a.assetTag}`}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} onClick={save} disabled={needReason && f.reason.trim().length < 5}>Simpan</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as AssetStatus })}>
            {(Object.keys(ASSET_STATUS_LABEL) as AssetStatus[]).map((s) => (
              <option key={s} value={s}>{ASSET_STATUS_LABEL[s]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Lokasi">
          <Select value={f.locationId} onChange={(e) => setF({ ...f, locationId: e.target.value })}>
            <option value="">—</option>
            {lookups?.locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Pemegang" className="sm:col-span-2" hint="Serah terima dicatat di riwayat aset.">
          {f.assignedUserId ? (
            <div className="flex items-center justify-between rounded-lg border border-line-strong px-3 py-2 text-sm">
              <b>{f.assignedName}</b>
              <button className="text-xs font-semibold text-teal" onClick={() => setF({ ...f, assignedUserId: '', assignedName: '' })}>
                Lepas / ganti
              </button>
            </div>
          ) : (
            <div className="relative">
              <Input value={userQ} onChange={(e) => setUserQ(e.target.value)} placeholder="Cari nama karyawan" />
              {!!users?.data.length && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white shadow-lg">
                  {users.data.map((u) => (
                    <li key={u.id}>
                      <button className="w-full px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => { setF({ ...f, assignedUserId: u.id, assignedName: u.name }); setUserQ(''); }}>
                        <b>{u.name}</b> <span className="text-text-muted">{u.department?.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Field>
        <Field label="Serial number">
          <Input value={f.serialNumber} onChange={(e) => setF({ ...f, serialNumber: e.target.value })} />
        </Field>
        <Field label="Garansi sampai">
          <Input type="date" value={f.warrantyUntil} onChange={(e) => setF({ ...f, warrantyUntil: e.target.value })} />
        </Field>
        <Field label="Spesifikasi" className="sm:col-span-2">
          <Input value={f.specs} onChange={(e) => setF({ ...f, specs: e.target.value })} />
        </Field>
        <Field label="Catatan" className="sm:col-span-2">
          <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="!min-h-[64px]" />
        </Field>
        {(needReason || f.status !== a.status) && (
          <Field label={needReason ? 'Berita acara disposal & penghapusan data' : 'Keterangan perubahan'} required={needReason} className="sm:col-span-2">
            <Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder={needReason ? 'No. BA, metode penghapusan data aman' : 'Opsional'} />
          </Field>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </Modal>
  );
}

function MaintenanceModal({ assetId, state, onClose, onSaved }: { assetId: string; state: { mode: 'schedule' } | { mode: 'complete'; m: Maint }; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const completing = state.mode === 'complete';
  const [done, setDone] = useState(completing);
  const [plannedAt, setPlannedAt] = useState(isoDateWib());
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (completing) {
        await api.patch(`/assets/maintenance/${state.m.id}`, { status: 'DONE', checklist, result });
      } else {
        await api.post(`/assets/${assetId}/maintenance`, { plannedAt, status: done ? 'DONE' : 'SCHEDULED', ...(done ? { checklist, result } : {}) });
      }
      toast(done ? 'Maintenance dicatat. Jadwal berikutnya dibuat otomatis' : 'Jadwal maintenance dibuat');
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={completing ? 'Catat hasil maintenance' : 'Maintenance'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} onClick={save} disabled={done && result.trim().length < 5}>
            Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!completing && (
          <>
            <div className="inline-flex rounded-lg border border-line bg-paper p-0.5 text-sm font-semibold">
              <button onClick={() => setDone(false)} className={clsx('rounded-md px-3 py-1.5', !done ? 'bg-white shadow-sm' : 'text-text-muted')}>Jadwalkan</button>
              <button onClick={() => setDone(true)} className={clsx('rounded-md px-3 py-1.5', done ? 'bg-white shadow-sm' : 'text-text-muted')}>Sudah dikerjakan</button>
            </div>
            <Field label={done ? 'Tanggal dikerjakan' : 'Tanggal rencana'}>
              <Input type="date" value={plannedAt} onChange={(e) => setPlannedAt(e.target.value)} />
            </Field>
          </>
        )}
        {done && (
          <>
            <fieldset>
              <legend className="label">Checklist</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {CHECKLIST.map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4 accent-[#13707A]" checked={!!checklist[k]} onChange={(e) => setChecklist({ ...checklist, [k]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Hasil & temuan" required hint="Jadwal berikutnya dibuat otomatis sesuai interval SOP (default 6 bulan).">
              <Textarea rows={3} value={result} onChange={(e) => setResult(e.target.value)} />
            </Field>
          </>
        )}
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

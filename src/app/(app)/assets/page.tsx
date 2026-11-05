'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { CalendarClock, HardDrive, Plus, Search } from 'lucide-react';
import { ASSET_STATUS_LABEL, ASSET_TYPE_LABEL, type AssetStatus, type AssetType } from '@/shared';
import { api, errorText, fetcher, qs } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import type { Paginated } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import { ASSET_TONE, type AssetRow } from '@/lib/assets';
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, useToast } from '@/components/ui';

export default function AssetsPage() {
  const { can } = useSession();
  const router = useRouter();
  const { data: lookups } = useLookups();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [locationId, setLocationId] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const { data, isLoading, mutate } = useSWR<Paginated<AssetRow> & { summary: Array<{ status: AssetStatus; count: number }> }>(
    `/assets${qs({ q, type, status, locationId, page })}`,
    fetcher,
    { keepPreviousData: true },
  );
  const { data: due } = useSWR<{ data: Array<{ id: string; plannedAt: string; asset: { id: string; assetTag: string; brand: string; model: string }; technician: { name: string } | null }> }>('/assets/maintenance/due', fetcher);
  const now = Date.now();

  return (
    <div>
      <PageHeader
        title="Aset & perangkat"
        description="Inventaris perangkat IT (UMR-IT-05): setiap perangkat yang diserahkan wajib memiliki kode aset."
        actions={
          can('asset.manage') && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Tambah aset
            </Button>
          )
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(ASSET_STATUS_LABEL) as AssetStatus[]).map((s) => {
          const count = data?.summary.find((x) => x.status === s)?.count ?? 0;
          return (
            <button
              key={s}
              onClick={() => { setStatus(status === s ? '' : s); setPage(1); }}
              className={clsx('rounded-lg border px-4 py-2.5 text-left transition-colors', status === s ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-teal')}
            >
              <span className={clsx('block text-xs font-semibold', status === s ? 'text-white/70' : 'text-text-muted')}>{ASSET_STATUS_LABEL[s]}</span>
              <span className="block text-xl font-bold tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="panel overflow-hidden">
          <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Kode aset, serial, merek, pemegang" className="input !pl-9" aria-label="Cari aset" />
            </div>
            <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="!w-auto" aria-label="Jenis">
              <option value="">Semua jenis</option>
              {(Object.keys(ASSET_TYPE_LABEL) as AssetType[]).map((t) => (
                <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>
              ))}
            </Select>
            <Select value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }} className="!w-auto" aria-label="Lokasi">
              <option value="">Semua lokasi</option>
              {lookups?.locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </Select>
          </div>
          {isLoading && !data && <Spinner />}
          {data?.data.length === 0 && <EmptyState icon={HardDrive} title="Tidak ada aset yang cocok">Ubah kata kunci atau filter.</EmptyState>}
          {!!data?.data.length && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="table-head">
                  <tr>
                    <th>Kode aset</th>
                    <th>Perangkat</th>
                    <th>Status</th>
                    <th>Pemegang</th>
                    <th>Lokasi</th>
                    <th>Garansi</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {data.data.map((a) => {
                    const warrantyOut = a.warrantyUntil && new Date(a.warrantyUntil).getTime() < now;
                    return (
                      <tr key={a.id} className="cursor-pointer hover:bg-paper/70" onClick={() => router.push(`/assets/${a.id}`)}>
                        <td>
                          <Link href={`/assets/${a.id}`} className="font-bold text-ink hover:text-teal" onClick={(e) => e.stopPropagation()}>
                            {a.assetTag}
                          </Link>
                          <span className="block text-xs text-text-muted">{a.serialNumber ?? '—'}</span>
                        </td>
                        <td>
                          <span className="block font-medium">{a.brand} {a.model}</span>
                          <span className="block text-xs text-text-muted">{ASSET_TYPE_LABEL[a.type]}</span>
                        </td>
                        <td><Badge tone={ASSET_TONE[a.status]}>{ASSET_STATUS_LABEL[a.status]}</Badge></td>
                        <td>{a.assignedUser?.name ?? <span className="text-text-faint">—</span>}</td>
                        <td className="text-text-muted">{a.location?.name ?? '—'}</td>
                        <td className={clsx('whitespace-nowrap text-xs', warrantyOut ? 'font-semibold text-danger' : 'text-text-muted')}>
                          {a.warrantyUntil ? (warrantyOut ? `Habis ${fmtDate(a.warrantyUntil)}` : fmtDate(a.warrantyUntil)) : '—'}
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

        <section className="panel self-start">
          <h2 className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-[15px] font-bold text-ink">
            <CalendarClock className="h-4 w-4 text-copper" /> Maintenance 30 hari ke depan
          </h2>
          {due?.data.length === 0 && <p className="px-5 py-6 text-sm text-text-muted">Tidak ada jadwal maintenance dalam 30 hari.</p>}
          <ul className="divide-y divide-line/70">
            {due?.data.map((m) => {
              const late = new Date(m.plannedAt).getTime() < now;
              return (
                <li key={m.id}>
                  <Link href={`/assets/${m.asset.id}`} className="block px-5 py-3 hover:bg-paper/70">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink">{m.asset.assetTag}</span>
                      <span className={clsx('text-xs font-semibold', late ? 'text-danger' : 'text-text-muted')}>{late ? `Terlewat, ${fmtDate(m.plannedAt)}` : fmtDate(m.plannedAt)}</span>
                    </span>
                    <span className="block text-xs text-text-muted">
                      {m.asset.brand} {m.asset.model}
                      {m.technician ? `, ${m.technician.name}` : ''}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <CreateAssetModal open={creating} onClose={() => setCreating(false)} onCreated={(id) => { mutate(); router.push(`/assets/${id}`); }} />
    </div>
  );
}

function CreateAssetModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { data: lookups } = useLookups();
  const toast = useToast();
  const [f, setF] = useState({ assetTag: '', serialNumber: '', type: 'LAPTOP', brand: '', model: '', specs: '', locationId: '', acquiredAt: '', warrantyUntil: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
      const a = await api.post<{ id: string }>('/assets', body);
      toast(`Aset ${f.assetTag.toUpperCase()} ditambahkan`);
      onClose();
      onCreated(a.id);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tambah aset"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} onClick={submit} disabled={!f.assetTag || !f.brand || !f.model}>Simpan aset</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kode aset" required hint="Format: UMR-LPT-0000">
          <Input value={f.assetTag} onChange={(e) => set('assetTag', e.target.value)} />
        </Field>
        <Field label="Serial number">
          <Input value={f.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} />
        </Field>
        <Field label="Jenis" required>
          <Select value={f.type} onChange={(e) => set('type', e.target.value)}>
            {(Object.keys(ASSET_TYPE_LABEL) as AssetType[]).map((t) => (
              <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>
            ))}
          </Select>
        </Field>
        <Field label="Lokasi">
          <Select value={f.locationId} onChange={(e) => set('locationId', e.target.value)}>
            <option value="">—</option>
            {lookups?.locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Merek" required>
          <Input value={f.brand} onChange={(e) => set('brand', e.target.value)} />
        </Field>
        <Field label="Model" required>
          <Input value={f.model} onChange={(e) => set('model', e.target.value)} />
        </Field>
        <Field label="Tanggal perolehan">
          <Input type="date" value={f.acquiredAt} onChange={(e) => set('acquiredAt', e.target.value)} />
        </Field>
        <Field label="Garansi sampai">
          <Input type="date" value={f.warrantyUntil} onChange={(e) => set('warrantyUntil', e.target.value)} />
        </Field>
        <Field label="Spesifikasi" className="sm:col-span-2">
          <Input value={f.specs} onChange={(e) => set('specs', e.target.value)} placeholder="CPU, RAM, storage" />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </Modal>
  );
}

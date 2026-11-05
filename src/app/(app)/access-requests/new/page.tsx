'use client';

import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { ACCESS_ACTION_LABEL, ACCESS_TYPE_LABEL, type AccessItemAction, type AccessRequestType } from '@/shared';
import { api, errorText, fetcher, qs } from '@/lib/api';
import { useLookups } from '@/lib/session';
import { isoDateWib } from '@/lib/format';
import { Button, Field, Input, PageHeader, Panel, Select, Spinner, Textarea, useToast } from '@/components/ui';

interface Item {
  systemName: string;
  action: AccessItemAction;
  detail?: string;
}
interface UserLite {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  position: string | null;
  department?: { id: string; name: string } | null;
  location?: { id: string; name: string } | null;
}

const TYPE_DESC: Record<AccessRequestType, string> = {
  ONBOARDING: 'Karyawan baru: email, akun, VPN, aplikasi, perangkat. Ajukan minimal 3 hari kerja sebelum tanggal masuk.',
  MUTATION: 'Pindah divisi/jabatan/lokasi: cabut akses lama, beri akses baru.',
  OFFBOARDING: 'Resign/akhir kontrak: backup data, nonaktifkan akses pada hari terakhir, kembalikan perangkat.',
  SITE_MOBILIZATION: 'Persiapan IT untuk site/proyek baru.',
  SITE_DEMOBILIZATION: 'Penarikan perangkat dan penutupan akses saat proyek selesai.',
};

function businessDaysUntil(date: string) {
  const end = new Date(`${date}T00:00:00+07:00`);
  const d = new Date();
  let n = 0;
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6 && d <= end) n++;
  }
  return n;
}

function UserPicker({ label, value, onPick, required, hint }: { label: string; value: UserLite | null; onPick: (u: UserLite | null) => void; required?: boolean; hint?: string }) {
  const [q, setQ] = useState('');
  const { data } = useSWR<{ data: UserLite[] }>(q.length >= 2 ? `/users${qs({ q })}` : null, fetcher);
  return (
    <Field label={label} required={required} hint={hint}>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-teal bg-teal-50/50 px-3 py-2 text-sm">
          <span>
            <b>{value.name}</b> <span className="text-text-muted">{value.employeeCode}</span>
          </span>
          <button type="button" className="text-xs font-semibold text-teal" onClick={() => onPick(null)}>
            Ganti
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama atau NIK" />
          {!!data?.data.length && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-white shadow-lg">
              {data.data.map((u) => (
                <li key={u.id}>
                  <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => { onPick(u); setQ(''); }}>
                    <b>{u.name}</b> <span className="text-text-muted">{u.position ?? u.department?.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}

export default function NewAccessPage() {
  const router = useRouter();
  const toast = useToast();
  const { data: lookups } = useLookups();
  const { data: templates } = useSWR<Record<AccessRequestType, Item[]>>('/access-requests/templates/default-items', fetcher, { revalidateOnFocus: false });
  const [type, setType] = useState<AccessRequestType>('ONBOARDING');
  const [employee, setEmployee] = useState<UserLite | null>(null);
  const [approver, setApprover] = useState<UserLite | null>(null);
  const [f, setF] = useState({ employeeName: '', employeeCode: '', position: '', departmentId: '', locationId: '', effectiveDate: '', notes: '' });
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (templates) setItems(templates[type].map((i) => ({ ...i })));
  }, [templates, type]);

  useEffect(() => {
    if (employee)
      setF((x) => ({ ...x, employeeName: employee.name, employeeCode: employee.employeeCode, position: employee.position ?? '', departmentId: employee.department?.id ?? x.departmentId, locationId: employee.location?.id ?? x.locationId }));
  }, [employee]);

  const needsExisting = type === 'OFFBOARDING' || type === 'MUTATION';
  const late = type === 'ONBOARDING' && f.effectiveDate && businessDaysUntil(f.effectiveDate) < 3;
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.post<{ id: string; requestNo: string }>('/access-requests', {
        requestType: type,
        employeeId: employee?.id,
        employeeName: f.employeeName,
        employeeCode: f.employeeCode || undefined,
        position: f.position || undefined,
        departmentId: f.departmentId || undefined,
        locationId: f.locationId || undefined,
        effectiveDate: f.effectiveDate,
        approverId: approver?.id,
        notes: f.notes || undefined,
        items: items.filter((i) => i.systemName.trim()),
      });
      toast(`${r.requestNo} diajukan ke ${approver?.name}`);
      router.push(`/access-requests/${r.id}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  if (!lookups || !templates) return <Spinner />;

  return (
    <div>
      <PageHeader back={{ href: '/access-requests', label: 'Akses & onboarding' }} title="Ajukan permintaan akses" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="Jenis permintaan">
            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {(Object.keys(ACCESS_TYPE_LABEL) as AccessRequestType[]).map((t) => (
                <label key={t} className={clsx('cursor-pointer rounded-lg border p-3.5', type === t ? 'border-teal bg-teal-50/60 ring-1 ring-teal' : 'border-line-strong hover:border-teal/60')}>
                  <input type="radio" className="sr-only" checked={type === t} onChange={() => { setType(t); setEmployee(null); }} />
                  <span className="block text-sm font-bold text-ink">{ACCESS_TYPE_LABEL[t]}</span>
                  <span className="mt-1 block text-xs leading-5 text-text-muted">{TYPE_DESC[t]}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title={type.startsWith('SITE') ? 'Site & PIC' : 'Karyawan'}>
            <div className="grid gap-4 sm:grid-cols-2">
              {needsExisting ? (
                <div className="sm:col-span-2">
                  <UserPicker label="Karyawan" value={employee} onPick={setEmployee} required />
                </div>
              ) : (
                <>
                  <Field label={type.startsWith('SITE') ? 'Nama proyek / PIC site' : 'Nama karyawan'} required>
                    <Input value={f.employeeName} onChange={(e) => set('employeeName', e.target.value)} />
                  </Field>
                  <Field label={type.startsWith('SITE') ? 'Kode proyek' : 'NIK (bila sudah ada)'}>
                    <Input value={f.employeeCode} onChange={(e) => set('employeeCode', e.target.value)} />
                  </Field>
                </>
              )}
              <Field label="Jabatan">
                <Input value={f.position} onChange={(e) => set('position', e.target.value)} />
              </Field>
              <Field label="Divisi">
                <Select value={f.departmentId} onChange={(e) => set('departmentId', e.target.value)}>
                  <option value="">—</option>
                  {lookups.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Lokasi / site">
                <Select value={f.locationId} onChange={(e) => set('locationId', e.target.value)}>
                  <option value="">—</option>
                  {lookups.locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label={type === 'OFFBOARDING' ? 'Hari terakhir kerja' : 'Tanggal efektif'} required>
                <Input type="date" min={isoDateWib()} value={f.effectiveDate} onChange={(e) => set('effectiveDate', e.target.value)} />
              </Field>
            </div>
            {late && (
              <p className="mt-4 flex items-start gap-2 rounded-lg border border-copper/40 bg-copper-50 px-3 py-2.5 text-sm text-copper-600">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Tanggal masuk kurang dari 3 hari kerja. Permintaan tetap bisa diajukan, tetapi ditandai pengajuan mepet dan persiapan akun berisiko belum selesai tepat waktu.
              </p>
            )}
          </Panel>

          <Panel title="Checklist akses & perangkat" actions={<Button size="sm" variant="ghost" onClick={() => setItems([...items, { systemName: '', action: 'GRANT' }])}><Plus className="h-4 w-4" /> Tambah item</Button>}>
            <p className="mb-4 text-sm text-text-muted">Berikan hanya akses yang dibutuhkan untuk pekerjaannya. Atasan akan meninjau daftar ini.</p>
            <ul className="space-y-2">
              {items.map((it, i) => (
                <li key={i} className="grid gap-2 sm:grid-cols-[1fr_160px_1fr_auto]">
                  <Input value={it.systemName} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, systemName: e.target.value } : x)))} placeholder="Sistem / perangkat" aria-label="Sistem" />
                  <Select value={it.action} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, action: e.target.value as AccessItemAction } : x)))} aria-label="Tindakan">
                    {(Object.keys(ACCESS_ACTION_LABEL) as AccessItemAction[]).map((a) => (
                      <option key={a} value={a}>{ACCESS_ACTION_LABEL[a]}</option>
                    ))}
                  </Select>
                  <Input value={it.detail ?? ''} onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)))} placeholder="Keterangan (opsional)" aria-label="Keterangan" />
                  <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="rounded-lg p-2 text-text-muted hover:bg-danger-50 hover:text-danger" aria-label="Hapus item">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <div className="space-y-4">
              <UserPicker label="Atasan penyetuju" value={approver} onPick={setApprover} required hint="Atasan langsung yang menyetujui hak akses." />
              <Field label="Catatan">
                <Textarea rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </div>
          </Panel>
          {error && <p className="rounded-lg border border-danger/30 bg-danger-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
          <Button className="w-full !py-3" loading={busy} onClick={submit} disabled={!approver || !f.effectiveDate || !f.employeeName}>
            Ajukan ke atasan
          </Button>
        </aside>
      </div>
    </div>
  );
}

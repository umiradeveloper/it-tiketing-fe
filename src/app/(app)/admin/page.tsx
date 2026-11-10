'use client';

import clsx from 'clsx';
import { Fragment, Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Plus, Search, Trash2 } from 'lucide-react';
import { PRIORITY_LABEL, ROLE_LABEL, type TicketPriority } from '@/shared';
import { api, errorText, fetcher, qs } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import type { Paginated } from '@/lib/types';
import { fmtDate, fmtDateTime, timeAgo } from '@/lib/format';
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Pagination, Panel, Select, Spinner, Tabs, useToast } from '@/components/ui';

type Tab = 'users' | 'roles' | 'sla' | 'categories' | 'locations' | 'settings' | 'audit';

function AdminInner() {
  const { can } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const items = (
    [
      { value: 'users', label: 'Pengguna', show: can('admin.users') },
      { value: 'roles', label: 'Role & hak akses', show: can('admin.users') },
      { value: 'sla', label: 'SLA & kalender', show: can('admin.config') },
      { value: 'categories', label: 'Kategori', show: can('admin.config') },
      { value: 'locations', label: 'Lokasi & site', show: can('admin.config') },
      { value: 'settings', label: 'Kebijakan', show: can('admin.config') },
      { value: 'audit', label: 'Audit log', show: can('audit.read') },
    ] as Array<{ value: Tab; label: string; show: boolean }>
  ).filter((i) => i.show);
  const tab = (params.get('tab') as Tab) ?? items[0]?.value;

  return (
    <div>
      <PageHeader title="Administrasi" description="Konfigurasi pengguna, SLA, kalender layanan, master data, dan jejak audit. Semua perubahan tercatat di audit log." />
      <div className="mb-6">
        <Tabs value={tab} onChange={(v) => router.replace(`${pathname}?tab=${v}`)} items={items} />
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'sla' && <SlaTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'locations' && <LocationsTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AdminInner />
    </Suspense>
  );
}

// ------------------------------------------------------------------ Users

interface AdminUser {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  isActive: boolean;
  isExternal: boolean;
  vendorCompany: string | null;
  lastLoginAt: string | null;
  departmentId: string | null;
  locationId: string | null;
  managerId: string | null;
  teamId: string | null;
  department: { name: string } | null;
  location: { name: string } | null;
  team: { name: string } | null;
  manager: { name: string } | null;
  roles: Array<{ code: string; name: string }>;
  authSource: 'LOCAL' | 'SUPERAPPS';
  externalId: string | null;
  externalRoleId: string | null;
  externalBranchId: string | null;
  localDisabled: boolean;
  lastSyncedAt: string | null;
}

interface SuperappsStatus {
  enabled: boolean;
  reachable: boolean | null;
  error: string | null;
  requireApproval: boolean;
  mirrored: number;
  active: number;
  lastSync: { total: number; internal?: number; skipped?: number; created: number; updated: number; deactivated: number; failed: number; at: string } | null;
  roles?: Array<{ name: string | null; users: number; blocked: boolean; maps: string[] }>;
}

function SuperappsBar({ onSynced }: { onSynced: () => void }) {
  const toast = useToast();
  const { data, mutate } = useSWR<SuperappsStatus>('/admin/superapps/status', fetcher, { revalidateOnFocus: false });
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  if (!data.enabled) {
    return (
      <div className="mb-4 rounded-panel border border-copper/40 bg-copper-50/60 px-5 py-3 text-sm text-copper-600">
        Sumber user Superapps belum diaktifkan. Isi <code className="rounded bg-white px-1">SUPERAPPS_DATABASE_URL</code> di file <code className="rounded bg-white px-1">.env</code> backend, lalu jalankan ulang backend.
      </div>
    );
  }
  const sync = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ total: number; internal: number; skipped: number; created: number; deactivated: number }>('/admin/superapps/sync');
      toast(`Sinkron selesai: ${r.internal} user internal (${r.created} baru), ${r.skipped} dilewati, ${r.deactivated} dinonaktifkan`);
      mutate();
      onSynced();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="text-sm">
        <p className="flex items-center gap-2 font-semibold text-ink">
          <span className={clsx('h-2 w-2 rounded-full', data.reachable ? 'bg-ok' : 'bg-danger')} aria-hidden />
          Sumber user: database Superapps {data.reachable ? 'terhubung' : 'tidak dapat diakses'}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">
          {data.reachable === false && data.error ? `${data.error}. ` : ''}
          {data.active} dari {data.mirrored} akun Superapps aktif di helpdesk.
          {data.lastSync
            ? ` Sinkron terakhir ${fmtDateTime(data.lastSync.at)}: ${data.lastSync.internal ?? data.lastSync.total} user internal${data.lastSync.skipped ? `, ${data.lastSync.skipped} dilewati karena perannya tidak punya akses` : ''}.`
            : ' Belum pernah disinkronkan.'}
          {data.requireApproval ? ' Hanya user yang sudah disetujui (isApproval = 1) yang bisa login.' : ''}
        </p>
      </div>
      <Button variant="secondary" loading={busy} onClick={sync}>
        Sinkronkan sekarang
      </Button>
      {!!data.roles?.length && (
        <details className="w-full border-t border-line pt-3 text-sm">
          <summary className="cursor-pointer font-semibold text-teal">Pemetaan peran Superapps ke helpdesk</summary>
          <p className="mt-2 text-xs text-text-muted">
            Diatur di <code className="rounded bg-paper px-1">SUPERAPPS_ROLE_MAP</code> dan <code className="rounded bg-paper px-1">SUPERAPPS_BLOCKED_ROLES</code> pada .env backend. Role tambahan bisa diberikan per pengguna di bawah.
          </p>
          <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {data.roles.map((r) => (
              <div key={r.name ?? 'none'} className="flex items-center justify-between gap-2 border-b border-line/60 py-1.5">
                <span className="truncate">
                  {r.name ?? 'Tanpa peran'} <span className="text-xs text-text-faint">{r.users}</span>
                </span>
                {r.blocked ? (
                  <Badge tone="danger">Tidak punya akses</Badge>
                ) : (
                  <span className="flex flex-wrap justify-end gap-1">
                    {r.maps.map((m) => (
                      <Badge key={m} tone={m === 'REQUESTER' ? 'neutral' : 'teal'}>{ROLE_LABEL[m] ?? m}</Badge>
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function UsersTab() {
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const { data, mutate } = useSWR<Paginated<AdminUser>>(`/admin/users${qs({ q, role, source, page })}`, fetcher, { keepPreviousData: true });

  return (
    <div>
    <SuperappsBar onSynced={() => mutate()} />
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input className="input !pl-9" placeholder="Nama, email, NIK" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Cari pengguna" />
        </div>
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="!w-auto" aria-label="Role">
          <option value="">Semua role</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="!w-auto" aria-label="Sumber akun">
          <option value="">Semua akun</option>
          <option value="SUPERAPPS">Dari Superapps</option>
          <option value="LOCAL">Akun lokal</option>
        </Select>
        <Button variant="secondary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> Akun lokal
        </Button>
      </div>
      {!data && <Spinner />}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="table-head">
              <tr>
                <th>Nama</th>
                <th>Role</th>
                <th>Divisi / tim</th>
                <th>Atasan</th>
                <th>Login terakhir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {data.data.map((u) => (
                <tr key={u.id} className="cursor-pointer hover:bg-paper/70" onClick={() => setEditing(u)}>
                  <td>
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      {u.name}
                      {u.authSource === 'SUPERAPPS' ? <Badge tone="teal">Superapps</Badge> : <Badge>Lokal</Badge>}
                    </span>
                    <span className="block text-xs text-text-muted">
                      {u.email.endsWith('.invalid') ? 'tanpa email' : u.email}, {u.employeeCode}
                    </span>
                  </td>
                  <td>
                    <span className="flex flex-wrap gap-1">
                      {u.roles.map((r) => <Badge key={r.code} tone={r.code === 'ADMIN' ? 'ink' : r.code === 'REQUESTER' ? 'neutral' : 'teal'}>{r.name}</Badge>)}
                    </span>
                  </td>
                  <td className="text-text-muted">
                    {u.department?.name ?? '—'}
                    {u.team && <span className="block text-xs">{u.team.name}</span>}
                  </td>
                  <td className="text-text-muted">{u.manager?.name ?? '—'}</td>
                  <td className="text-xs text-text-muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Belum pernah'}</td>
                  <td>
                    {u.isActive ? <Badge tone="ok">Aktif</Badge> : <Badge tone="danger">Nonaktif</Badge>}
                    {u.authSource === 'SUPERAPPS' && !u.isActive && (
                      <span className="mt-0.5 block text-2xs text-text-muted">{u.localDisabled ? 'oleh admin helpdesk' : 'belum disetujui / dihapus di Superapps'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={data.meta} onPage={setPage} />
        </div>
      )}
      {editing && <UserModal user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={mutate} />}
    </div>
    </div>
  );
}

function UserModal({ user, onClose, onSaved }: { user: AdminUser | null; onClose: () => void; onSaved: () => void }) {
  const { data: lookups } = useLookups();
  const { data: teams } = useSWR<Array<{ id: string; name: string }>>('/admin/teams', fetcher);
  const { data: managers } = useSWR<{ data: Array<{ id: string; name: string }> }>('/users?limit=200', fetcher);
  const toast = useToast();
  const [f, setF] = useState({
    employeeCode: user?.employeeCode ?? '',
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    position: user?.position ?? '',
    departmentId: user?.departmentId ?? '',
    locationId: user?.locationId ?? '',
    managerId: user?.managerId ?? '',
    teamId: user?.teamId ?? '',
    isExternal: user?.isExternal ?? false,
    vendorCompany: user?.vendorCompany ?? '',
    isActive: user ? (user.authSource === 'SUPERAPPS' ? !user.localDisabled : user.isActive) : true,
    password: '',
    roles: user?.roles.map((r) => r.code) ?? ['REQUESTER'],
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const synced = user?.authSource === 'SUPERAPPS';
    const base = synced
      ? { departmentId: f.departmentId, locationId: f.locationId, managerId: f.managerId, teamId: f.teamId, roles: f.roles, isActive: f.isActive }
      : f;
    const body = {
      ...base,
      departmentId: f.departmentId || null,
      locationId: f.locationId || null,
      managerId: f.managerId || null,
      teamId: f.teamId || null,
      ...(synced
        ? {}
        : { vendorCompany: f.vendorCompany || undefined, phone: f.phone || undefined, position: f.position || undefined, password: f.password || undefined }),
    };
    try {
      if (user) await api.patch(`/admin/users/${user.id}`, body);
      else await api.post('/admin/users', body);
      toast(user ? 'Pengguna diperbarui' : 'Pengguna ditambahkan');
      onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const toggleRole = (r: string) => setF((x) => ({ ...x, roles: x.roles.includes(r) ? x.roles.filter((y) => y !== r) : [...x.roles, r] }));

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? `Ubah ${user.name}` : 'Tambah akun lokal (vendor / non-Superapps)'}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} onClick={save}>Simpan</Button>
        </>
      }
    >
      {user?.authSource === 'SUPERAPPS' && (
        <p className="mb-4 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal">
          Akun dari Superapps{user.position ? `, peran ${user.position}` : ''}. Nama, username/NIP, email, nomor HP, peran (jabatan), dan password dikelola di Superapps dan disinkronkan otomatis.
          Di sini Anda mengatur role helpdesk, tim, atasan, dan lokasi.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama" required><Input value={f.name} disabled={user?.authSource === 'SUPERAPPS'} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="NIK / kode" required><Input value={f.employeeCode} disabled={user?.authSource === 'SUPERAPPS'} onChange={(e) => setF({ ...f, employeeCode: e.target.value })} /></Field>
        <Field label="Email" required><Input type="email" value={f.email.endsWith('.invalid') ? '' : f.email} placeholder={f.email.endsWith('.invalid') ? 'Tidak ada email di Superapps' : undefined} disabled={user?.authSource === 'SUPERAPPS'} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Telepon"><Input value={f.phone} disabled={user?.authSource === 'SUPERAPPS'} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label={user?.authSource === 'SUPERAPPS' ? 'Peran Superapps' : 'Jabatan'}><Input value={f.position} disabled={user?.authSource === 'SUPERAPPS'} onChange={(e) => setF({ ...f, position: e.target.value })} /></Field>
        <Field label="Divisi">
          <Select value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value })}>
            <option value="">—</option>
            {lookups?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Lokasi">
          <Select value={f.locationId} onChange={(e) => setF({ ...f, locationId: e.target.value })}>
            <option value="">—</option>
            {lookups?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </Field>
        <Field label="Atasan (penyetuju akses)">
          <Select value={f.managerId} onChange={(e) => setF({ ...f, managerId: e.target.value })}>
            <option value="">—</option>
            {managers?.data.filter((m) => m.id !== user?.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
        <Field label="Tim IT" hint="Isi hanya untuk petugas helpdesk/spesialis/vendor.">
          <Select value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })}>
            <option value="">Bukan petugas IT</option>
            {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </Field>
        {user?.authSource !== 'SUPERAPPS' && (
          <Field label={user ? 'Reset password' : 'Password awal'} required={!user} hint="Minimal 10 karakter.">
            <Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
        )}
        <fieldset className="sm:col-span-2">
          <legend className="label">Role</legend>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ROLE_LABEL).map(([k, v]) => (
              <label key={k} className={clsx('cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold', f.roles.includes(k) ? 'border-teal bg-teal-50 text-teal' : 'border-line-strong text-text-muted')}>
                <input type="checkbox" className="sr-only" checked={f.roles.includes(k)} onChange={() => toggleRole(k)} />
                {v}
              </label>
            ))}
          </div>
        </fieldset>
        {user?.authSource !== 'SUPERAPPS' && (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#13707A]" checked={f.isExternal} onChange={(e) => setF({ ...f, isExternal: e.target.checked })} />
              Akun eksternal (vendor)
            </label>
            {f.isExternal && <Input placeholder="Nama perusahaan vendor" value={f.vendorCompany} onChange={(e) => setF({ ...f, vendorCompany: e.target.value })} />}
          </>
        )}
        {user && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 accent-[#13707A]" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} />
            Akun aktif (nonaktifkan untuk offboarding; riwayat tetap tersimpan)
          </label>
        )}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </Modal>
  );
}

// ------------------------------------------------------------------ Roles

function RolesTab() {
  const toast = useToast();
  const { data, mutate } = useSWR<{ roles: Array<{ code: string; name: string; description: string | null; users: number; permissions: string[] }>; permissions: Array<{ code: string; name: string; module: string }> }>('/admin/roles', fetcher);
  const [pending, setPending] = useState<Record<string, string[]>>({});
  if (!data) return <Spinner />;
  const modules = [...new Set(data.permissions.map((p) => p.module))];
  const permsOf = (code: string) => pending[code] ?? data.roles.find((r) => r.code === code)!.permissions;
  const toggle = (role: string, perm: string) => {
    const cur = permsOf(role);
    setPending({ ...pending, [role]: cur.includes(perm) ? cur.filter((p) => p !== perm) : [...cur, perm] });
  };
  const save = async () => {
    try {
      for (const [code, permissions] of Object.entries(pending)) await api.put(`/admin/roles/${code}/permissions`, { permissions });
      toast('Hak akses role diperbarui');
      setPending({});
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };
  return (
    <Panel
      title="Matriks hak akses"
      actions={Object.keys(pending).length > 0 && <Button size="sm" onClick={save}>Simpan perubahan</Button>}
      bodyClass="!p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="table-head">
            <tr>
              <th className="sticky left-0 z-[1] bg-paper">Hak akses</th>
              {data.roles.map((r) => (
                <th key={r.code} className="!text-center">
                  {r.name}
                  <span className="block font-normal">{r.users} user</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <Fragment key={m}>
                <tr>
                  <td colSpan={data.roles.length + 1} className="border-b border-line bg-paper/60 px-4 py-1.5 text-xs font-bold text-ink">
                    {m}
                  </td>
                </tr>
                {data.permissions
                  .filter((p) => p.module === m)
                  .map((p) => (
                    <tr key={p.code} className="hover:bg-paper/40">
                      <td className="sticky left-0 border-b border-line/60 bg-white px-4 py-2">{p.name}</td>
                      {data.roles.map((r) => (
                        <td key={r.code} className="border-b border-line/60 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#13707A]"
                            aria-label={`${r.name}: ${p.name}`}
                            checked={permsOf(r.code).includes(p.code)}
                            onChange={() => toggle(r.code, p.code)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ------------------------------------------------------------------ SLA & calendar

interface Policy {
  id: string;
  priority: TicketPriority;
  description: string | null;
  responseMinutes: number;
  resolutionMinutes: number;
  useBusinessHours: boolean;
  version: number;
  createdAt: string;
}

function SlaTab() {
  const toast = useToast();
  const { data, mutate } = useSWR<{ policies: Policy[]; history: Policy[]; calendar: { workStart: string; workEnd: string; workDays: string; timezone: string; holidays: Array<{ id: string; date: string; name: string }> } }>('/admin/sla', fetcher);
  const [edits, setEdits] = useState<Record<string, Policy>>({});
  const [cal, setCal] = useState({ workStart: '08:00', workEnd: '17:00', workDays: '1,2,3,4,5' });
  const [holiday, setHoliday] = useState({ date: '', name: '' });
  useEffect(() => {
    if (data?.calendar) setCal({ workStart: data.calendar.workStart, workEnd: data.calendar.workEnd, workDays: data.calendar.workDays });
  }, [data]);
  if (!data) return <Spinner />;

  const savePolicy = async (p: Policy) => {
    try {
      await api.put(`/admin/sla/${p.priority}`, { responseMinutes: Number(p.responseMinutes), resolutionMinutes: Number(p.resolutionMinutes), useBusinessHours: p.useBusinessHours, description: p.description ?? undefined });
      toast(`SLA ${p.priority} disimpan sebagai versi baru`);
      const next = { ...edits };
      delete next[p.priority];
      setEdits(next);
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const activeDays = cal.workDays.split(',').map(Number);

  return (
    <div className="space-y-6">
      <Panel title="Target SLA per prioritas" bodyClass="!p-0">
        <p className="border-b border-line bg-copper-50/60 px-5 py-2.5 text-xs text-copper-600">
          Nilai awal dari SOP UMR-IT-04 dan perlu persetujuan final Koordinator IT / Manajemen. Perubahan membuat versi baru; tiket yang sudah berjalan tidak dihitung ulang.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="table-head">
              <tr>
                <th>Prioritas</th>
                <th>Respons (menit)</th>
                <th>Penyelesaian (menit)</th>
                <th>Perhitungan</th>
                <th>Versi</th>
                <th />
              </tr>
            </thead>
            <tbody className="table-body">
              {data.policies.map((p0) => {
                const p = edits[p0.priority] ?? p0;
                const dirty = !!edits[p0.priority];
                const set = (patch: Partial<Policy>) => setEdits({ ...edits, [p0.priority]: { ...p, ...patch } });
                return (
                  <tr key={p0.id}>
                    <td>
                      <span className="font-bold text-ink">{PRIORITY_LABEL[p.priority]}</span>
                      <span className="block max-w-xs text-xs text-text-muted">{p.description}</span>
                    </td>
                    <td><Input type="number" min={1} className="!w-28" value={p.responseMinutes} onChange={(e) => set({ responseMinutes: Number(e.target.value) })} /></td>
                    <td>
                      <Input type="number" min={1} className="!w-28" value={p.resolutionMinutes} onChange={(e) => set({ resolutionMinutes: Number(e.target.value) })} />
                      <span className="mt-0.5 block text-2xs text-text-muted">{p.useBusinessHours ? `${+(p.resolutionMinutes / 540).toFixed(2)} hari kerja` : `${+(p.resolutionMinutes / 60).toFixed(1)} jam`}</span>
                    </td>
                    <td>
                      <Select className="!w-44" value={p.useBusinessHours ? 'biz' : 'cal'} onChange={(e) => set({ useBusinessHours: e.target.value === 'biz' })}>
                        <option value="biz">Jam kerja</option>
                        <option value="cal">24/7 (on-call)</option>
                      </Select>
                    </td>
                    <td className="text-xs text-text-muted">v{p0.version}, {fmtDate(p0.createdAt)}</td>
                    <td>{dirty && <Button size="sm" onClick={() => savePolicy(p)}>Simpan</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Jam layanan">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mulai"><Input type="time" value={cal.workStart} onChange={(e) => setCal({ ...cal, workStart: e.target.value })} /></Field>
              <Field label="Selesai"><Input type="time" value={cal.workEnd} onChange={(e) => setCal({ ...cal, workEnd: e.target.value })} /></Field>
            </div>
            <fieldset>
              <legend className="label">Hari kerja</legend>
              <div className="flex flex-wrap gap-1.5">
                {days.map((d, i) => (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={activeDays.includes(i)}
                    onClick={() => {
                      const next = activeDays.includes(i) ? activeDays.filter((x) => x !== i) : [...activeDays, i].sort();
                      setCal({ ...cal, workDays: next.join(',') });
                    }}
                    className={clsx('w-12 rounded-lg border py-1.5 text-sm font-semibold', activeDays.includes(i) ? 'border-teal bg-teal text-white' : 'border-line-strong text-text-muted')}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="text-xs text-text-muted">Zona waktu {data.calendar.timezone} (WIB). Data tersimpan dalam UTC.</p>
            <Button
              onClick={async () => {
                try {
                  await api.put('/admin/calendar', cal);
                  toast('Jam layanan disimpan');
                  mutate();
                } catch (e) {
                  toast(errorText(e), 'error');
                }
              }}
            >
              Simpan jam layanan
            </Button>
          </div>
        </Panel>
        <Panel title="Hari libur">
          <div className="mb-4 flex flex-wrap gap-2">
            <Input type="date" className="!w-auto" value={holiday.date} onChange={(e) => setHoliday({ ...holiday, date: e.target.value })} aria-label="Tanggal" />
            <Input className="min-w-[160px] flex-1" placeholder="Nama hari libur" value={holiday.name} onChange={(e) => setHoliday({ ...holiday, name: e.target.value })} />
            <Button
              disabled={!holiday.date || holiday.name.length < 2}
              onClick={async () => {
                try {
                  await api.post('/admin/calendar/holidays', holiday);
                  setHoliday({ date: '', name: '' });
                  mutate();
                } catch (e) {
                  toast(errorText(e), 'error');
                }
              }}
            >
              Tambah
            </Button>
          </div>
          <ul className="max-h-72 divide-y divide-line/70 overflow-y-auto">
            {data.calendar.holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  <b className="text-ink">{fmtDate(h.date)}</b> <span className="text-text-muted">{h.name}</span>
                </span>
                <button
                  onClick={async () => {
                    await api.del(`/admin/calendar/holidays/${h.id}`);
                    mutate();
                  }}
                  className="rounded p-1 text-text-muted hover:text-danger"
                  aria-label={`Hapus ${h.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Categories

function CategoriesTab() {
  const toast = useToast();
  const { data, mutate } = useSWR<Array<{ id: string; name: string; isActive: boolean; defaultTeamId: string | null; defaultTeam: { name: string } | null; _count: { tickets: number }; children: Array<{ id: string; name: string; isActive: boolean }> }>>('/admin/categories', fetcher);
  const { data: teams } = useSWR<Array<{ id: string; name: string; level: string }>>('/admin/teams', fetcher);
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [newCat, setNewCat] = useState('');
  if (!data) return <Spinner />;
  const call = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((c) => (
          <Panel
            key={c.id}
            title={
              <span className={clsx(!c.isActive && 'text-text-faint line-through')}>
                {c.name} <span className="text-sm font-normal text-text-muted">{c._count.tickets} tiket</span>
              </span>
            }
            actions={
              <button className="text-xs font-semibold text-text-muted hover:text-ink" onClick={() => call(() => api.patch(`/admin/categories/${c.id}`, { name: c.name, isActive: !c.isActive }))}>
                {c.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            }
          >
            <Field label="Tim L2 tujuan eskalasi otomatis">
              <Select value={c.defaultTeamId ?? ''} onChange={(e) => call(() => api.patch(`/admin/categories/${c.id}`, { name: c.name, defaultTeamId: e.target.value || null }))}>
                <option value="">—</option>
                {teams?.filter((t) => t.level === 'L2').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {c.children.map((s) => (
                <li key={s.id}>
                  <button
                    title={s.isActive ? 'Klik untuk menonaktifkan' : 'Klik untuk mengaktifkan'}
                    onClick={() => call(() => api.patch(`/admin/categories/${s.id}`, { name: s.name, parentId: c.id, isActive: !s.isActive }))}
                    className={clsx('rounded-md border px-2 py-1 text-xs font-medium', s.isActive ? 'border-line bg-paper text-ink' : 'border-dashed border-line text-text-faint line-through')}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Subkategori baru" value={newSub[c.id] ?? ''} onChange={(e) => setNewSub({ ...newSub, [c.id]: e.target.value })} className="!py-1.5" />
              <Button
                size="sm"
                variant="secondary"
                disabled={(newSub[c.id] ?? '').length < 2}
                onClick={() => call(async () => { await api.post('/admin/categories', { name: newSub[c.id], parentId: c.id, sortOrder: c.children.length }); setNewSub({ ...newSub, [c.id]: '' }); })}
              >
                Tambah
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      <div className="flex max-w-md gap-2">
        <Input placeholder="Kategori utama baru" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
        <Button disabled={newCat.length < 2} onClick={() => call(async () => { await api.post('/admin/categories', { name: newCat, sortOrder: data.length }); setNewCat(''); })}>
          Tambah kategori
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Locations

function LocationsTab() {
  const toast = useToast();
  const { data, mutate } = useSWR<Array<{ id: string; code: string; name: string; type: 'HEAD_OFFICE' | 'BRANCH' | 'SITE'; address: string | null; projectCode: string | null; isActive: boolean; _count: { users: number; assets: number } }>>('/admin/locations', fetcher);
  const [f, setF] = useState({ code: '', name: '', type: 'SITE', address: '', projectCode: '' });
  const label = { HEAD_OFFICE: 'Kantor pusat', BRANCH: 'Cabang', SITE: 'Site / proyek' };
  if (!data) return <Spinner />;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="table-head">
            <tr>
              <th>Lokasi</th>
              <th>Jenis</th>
              <th>Kode proyek</th>
              <th className="!text-right">User</th>
              <th className="!text-right">Aset</th>
              <th />
            </tr>
          </thead>
          <tbody className="table-body">
            {data.map((l) => (
              <tr key={l.id} className={clsx(!l.isActive && 'opacity-50')}>
                <td>
                  <span className="block font-semibold text-ink">{l.name}</span>
                  <span className="block text-xs text-text-muted">{l.code}{l.address ? `, ${l.address}` : ''}</span>
                </td>
                <td>{label[l.type]}</td>
                <td className="text-text-muted">{l.projectCode ?? '—'}</td>
                <td className="text-right tabular-nums">{l._count.users}</td>
                <td className="text-right tabular-nums">{l._count.assets}</td>
                <td className="text-right">
                  <button
                    className="text-xs font-semibold text-text-muted hover:text-ink"
                    onClick={async () => {
                      await api.patch(`/admin/locations/${l.id}`, { code: l.code, name: l.name, type: l.type, isActive: !l.isActive }).catch((e) => toast(errorText(e), 'error'));
                      mutate();
                    }}
                  >
                    {l.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Panel title="Tambah lokasi / site">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kode" required><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="ST-XXX" /></Field>
            <Field label="Jenis">
              <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                {Object.entries(label).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Nama" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Alamat / kota"><Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          {f.type === 'SITE' && <Field label="Kode proyek"><Input value={f.projectCode} onChange={(e) => setF({ ...f, projectCode: e.target.value })} placeholder="PRJ-2026-000" /></Field>}
          <Button
            className="w-full"
            disabled={f.code.length < 2 || f.name.length < 2}
            onClick={async () => {
              try {
                await api.post('/admin/locations', { ...f, address: f.address || undefined, projectCode: f.projectCode || undefined });
                toast('Lokasi ditambahkan');
                setF({ code: '', name: '', type: 'SITE', address: '', projectCode: '' });
                mutate();
              } catch (e) {
                toast(errorText(e), 'error');
              }
            }}
          >
            Tambah lokasi
          </Button>
        </div>
      </Panel>
    </div>
  );
}

// ------------------------------------------------------------------ Settings

const SETTING_META: Record<string, { label: string; kind: 'bool' | 'number' | 'text' | 'list' }> = {
  'sla.pauseOnPending': { label: 'Jeda SLA saat Menunggu User / Vendor', kind: 'bool' },
  'sla.autoEscalateL2': { label: 'Eskalasi otomatis ke L2 di 50% SLA', kind: 'bool' },
  'sla.targetCompliance': { label: 'Target kepatuhan SLA (%)', kind: 'number' },
  'ticket.autoCloseDays': { label: 'Tutup otomatis tiket selesai setelah (hari kerja, 0 = nonaktif)', kind: 'number' },
  'ticket.numberPrefix': { label: 'Prefix nomor tiket', kind: 'text' },
  'access.onboardingLeadDays': { label: 'Minimal pengajuan onboarding (hari kerja)', kind: 'number' },
  'access.offboardingTime': { label: 'Jam penonaktifan akses offboarding (WIB)', kind: 'text' },
  'asset.maintenanceIntervalMonths': { label: 'Interval maintenance preventif (bulan)', kind: 'number' },
  'upload.maxMb': { label: 'Batas ukuran lampiran (MB)', kind: 'number' },
  'upload.allowedTypes': { label: 'Jenis file lampiran (MIME, satu per baris)', kind: 'list' },
};

function SettingsTab() {
  const toast = useToast();
  const { data, mutate } = useSWR<Array<{ key: string; value: unknown; description: string | null; updatedAt: string | null }>>('/admin/settings', fetcher);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  if (!data) return <Spinner />;
  const save = async (key: string) => {
    try {
      await api.put(`/admin/settings/${encodeURIComponent(key)}`, { value: draft[key] });
      toast('Kebijakan disimpan');
      const d = { ...draft };
      delete d[key];
      setDraft(d);
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };
  return (
    <div className="panel divide-y divide-line">
      {data.map((s) => {
        const meta = SETTING_META[s.key] ?? { label: s.key, kind: 'text' as const };
        const v = s.key in draft ? draft[s.key] : s.value;
        return (
          <div key={s.key} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_320px_auto] md:items-center">
            <div>
              <p className="font-semibold text-ink">{meta.label}</p>
              <p className="text-xs text-text-muted">{s.description ?? s.key}</p>
            </div>
            <div>
              {meta.kind === 'bool' ? (
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" className="h-4 w-4 accent-[#13707A]" checked={!!v} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.checked })} />
                  {v ? 'Aktif' : 'Nonaktif'}
                </label>
              ) : meta.kind === 'list' ? (
                <textarea className="input min-h-[96px] font-mono !text-xs" value={(v as string[]).join('\n')} onChange={(e) => setDraft({ ...draft, [s.key]: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} />
              ) : (
                <Input type={meta.kind === 'number' ? 'number' : 'text'} value={String(v)} onChange={(e) => setDraft({ ...draft, [s.key]: meta.kind === 'number' ? Number(e.target.value) : e.target.value })} />
              )}
            </div>
            <div className="md:w-24">{s.key in draft && <Button size="sm" onClick={() => save(s.key)}>Simpan</Button>}</div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ Audit

function AuditTab() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const { data } = useSWR<Paginated<{ id: string; action: string; entityType: string; entityId: string; actorName: string; ipAddress: string | null; createdAt: string; beforeJson: unknown; afterJson: unknown }>>(
    `/admin/audit-logs${qs({ entityType, action, page })}`,
    fetcher,
    { keepPreviousData: true },
  );
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
        <Select className="!w-auto" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} aria-label="Entitas">
          <option value="">Semua entitas</option>
          {['Ticket', 'User', 'Asset', 'AccessRequest', 'SlaPolicy', 'SystemSetting', 'Role', 'KnowledgeArticle', 'Report'].map((x) => <option key={x}>{x}</option>)}
        </Select>
        <Input className="!w-56" placeholder="Filter aksi, mis. ESCALATED" value={action} onChange={(e) => { setAction(e.target.value.toUpperCase()); setPage(1); }} />
        <p className="ml-auto self-center text-xs text-text-muted">Audit log bersifat append-only dan tidak dapat diubah dari aplikasi.</p>
      </div>
      {!data && <Spinner />}
      {data?.data.length === 0 && <EmptyState title="Tidak ada catatan" />}
      {!!data?.data.length && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="table-head">
              <tr>
                <th>Waktu</th>
                <th>Pelaku</th>
                <th>Aksi</th>
                <th>Entitas</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {data.data.map((r) => (
                <Fragment key={r.id}>
                  <tr className="cursor-pointer hover:bg-paper/70" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <td className="whitespace-nowrap text-xs text-text-muted">{fmtDateTime(r.createdAt)}</td>
                    <td className="font-medium">{r.actorName}</td>
                    <td><code className="rounded bg-paper px-1.5 py-0.5 text-xs">{r.action}</code></td>
                    <td className="text-xs text-text-muted">{r.entityType} <span className="text-text-faint">{r.entityId.slice(0, 8)}</span></td>
                    <td className="text-xs text-text-muted">{r.ipAddress ?? '—'}</td>
                  </tr>
                  {open === r.id && (
                    <tr>
                      <td colSpan={5} className="bg-paper/60">
                        <div className="grid gap-3 md:grid-cols-2">
                          <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs"><b>Sebelum</b>{'\n'}{JSON.stringify(r.beforeJson, null, 2) ?? '—'}</pre>
                          <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs"><b>Sesudah</b>{'\n'}{JSON.stringify(r.afterJson, null, 2) ?? '—'}</pre>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <Pagination meta={data.meta} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

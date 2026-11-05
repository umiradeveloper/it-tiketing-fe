'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ROLE_LABEL } from '@/shared';
import { api, errorText, fetcher } from '@/lib/api';
import { fmtDateTime } from '@/lib/format';
import { Avatar, Button, Field, Input, KeyVal, PageHeader, Panel, Spinner, useToast } from '@/components/ui';

interface Me {
  name: string;
  email: string;
  employeeCode: string;
  position: string | null;
  phone: string | null;
  department: { name: string } | null;
  location: { name: string } | null;
  team: { name: string } | null;
  manager: { name: string } | null;
  roles: string[];
  lastLoginAt: string | null;
  authSource: 'LOCAL' | 'SUPERAPPS';
}

export default function ProfilePage() {
  const toast = useToast();
  const { data: me, mutate } = useSWR<Me>('/users/me', fetcher);
  const [phone, setPhone] = useState<string | null>(null);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) return <Spinner />;

  const savePhone = async () => {
    try {
      await api.patch('/users/me', { phone });
      toast('Nomor telepon disimpan');
      setPhone(null);
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };
  const changePw = async () => {
    setError(null);
    if (pw.newPassword !== pw.confirm) return setError('Konfirmasi password baru tidak sama.');
    setBusy(true);
    try {
      await api.patch('/users/me', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast('Password diganti');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Profil saya" />
      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <div className="mb-4 flex items-center gap-4">
            <Avatar name={me.name} size={56} tone="ink" />
            <div>
              <p className="text-lg font-bold text-ink">{me.name}</p>
              <p className="text-sm text-text-muted">{me.position ?? me.employeeCode}</p>
            </div>
          </div>
          <dl className="divide-y divide-line/70">
            <KeyVal k="Email">{me.email}</KeyVal>
            <KeyVal k="NIK">{me.employeeCode}</KeyVal>
            <KeyVal k="Divisi">{me.department?.name ?? '—'}</KeyVal>
            <KeyVal k="Lokasi">{me.location?.name ?? '—'}</KeyVal>
            <KeyVal k="Atasan">{me.manager?.name ?? '—'}</KeyVal>
            {me.team && <KeyVal k="Tim IT">{me.team.name}</KeyVal>}
            <KeyVal k="Role">{me.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ')}</KeyVal>
            <KeyVal k="Login terakhir">{fmtDateTime(me.lastLoginAt)}</KeyVal>
          </dl>
          {me.authSource === 'SUPERAPPS' ? (
            <>
              <KeyVal k="Nomor HP">{me.phone ?? '—'}</KeyVal>
              <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs text-teal">
                Akun Anda terhubung ke Superapps. Nama, NIP, email, dan nomor HP diperbarui otomatis dari Superapps.
              </p>
            </>
          ) : (
            <>
              <div className="mt-4 flex items-end gap-2 border-t border-line pt-4">
                <Field label="Nomor telepon" className="flex-1">
                  <Input value={phone ?? me.phone ?? ''} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                </Field>
                {phone !== null && <Button onClick={savePhone}>Simpan</Button>}
              </div>
              <p className="mt-3 text-xs text-text-muted">Data divisi, atasan, dan lokasi dikelola HR / Admin Sistem.</p>
            </>
          )}
        </Panel>
        {me.authSource === 'SUPERAPPS' ? (
          <Panel title="Password">
            <p className="text-sm text-text-muted">Anda login memakai akun Superapps. Untuk mengganti password, gunakan aplikasi Superapps.</p>
          </Panel>
        ) : (
        <Panel title="Ganti password">
          <div className="space-y-4">
            <Field label="Password saat ini">
              <Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label="Password baru" hint="Minimal 10 karakter, kombinasi huruf, angka, dan simbol.">
              <Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
            <Field label="Ulangi password baru">
              <Input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            {error && <p className="text-sm font-medium text-danger">{error}</p>}
            <Button loading={busy} onClick={changePw} disabled={!pw.currentPassword || pw.newPassword.length < 10}>
              Ganti password
            </Button>
          </div>
        </Panel>
        )}
      </div>
    </div>
  );
}

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { api, errorText } from '@/lib/api';
import { Button, Field, Input } from '@/components/ui';
import { Logo } from '@/components/brand';

const SLA_ROWS = [
  ['P1', 'Kritis', 'Layanan utama mati, banyak user atau operasional proyek terdampak', '15 menit', '4 jam'],
  ['P2', 'Tinggi', 'Gangguan signifikan pada satu divisi atau user kunci', '30 menit', '8 jam'],
  ['P3', 'Sedang', 'Gangguan individu, ada solusi sementara', '2 jam', '2 hari kerja'],
  ['P4', 'Rendah', 'Service request atau pertanyaan', '1 hari kerja', '5 hari kerja'],
];

const DEMO = [
  ['karyawan@umira.co.id', 'Karyawan'],
  ['helpdesk@umira.co.id', 'Helpdesk L1'],
  ['infra@umira.co.id', 'Spesialis L2'],
  ['it.manager@umira.co.id', 'Kepala Divisi IT'],
  ['hr@umira.co.id', 'HR'],
  ['vendor@sinardata.co.id', 'Vendor L3'],
  ['admin@umira.co.id', 'Admin'],
];

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/login', { username: email, password });
      const next = params.get('next');
      location.href = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    } catch (err) {
      setError(errorText(err));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Username atau email" htmlFor="email">
        <Input id="email" type="text" autoCapitalize="none" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Username Superapps" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password">
        <div className="relative">
          <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
          <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-text-muted hover:text-ink" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-50 px-3 py-2 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" loading={loading} className="w-full !py-2.5">
        {!loading && <LogIn className="h-4 w-4" />} Masuk
      </Button>
      <p className="text-center text-xs text-text-muted">Lupa password? Reset melalui aplikasi Superapps, atau hubungi IT Helpdesk.</p>

      {process.env.NODE_ENV !== 'production' && (
        <div className="rounded-lg border border-dashed border-line-strong p-3">
          <p className="mb-2 text-xs font-semibold text-text-muted">Akun lokal demo (password Umira@2026)</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO.map(([e, label]) => (
              <button
                type="button"
                key={e}
                onClick={() => {
                  setEmail(e);
                  setPassword('Umira@2026');
                }}
                className="rounded-md border border-line bg-paper px-2 py-1 text-xs font-medium text-ink hover:border-teal hover:text-teal"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="blueprint relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div>
          <Logo inverted />
        </div>
        <div className="max-w-xl">
          <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight">Satu pintu untuk setiap kendala IT, dari kantor pusat sampai site proyek.</h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-white/70">
            Laporkan gangguan, ajukan permintaan layanan, dan pantau penanganannya sesuai target waktu SOP UMR-IT-04.
          </p>

          <div className="mt-10 overflow-hidden rounded-xl border border-white/15 bg-ink-2/60 backdrop-blur-sm">
            <div className="grid grid-cols-[56px_1fr_92px_100px] gap-3 border-b border-white/15 px-4 py-2.5 text-xs font-semibold text-white/55">
              <span>Prioritas</span>
              <span>Kriteria</span>
              <span>Respons</span>
              <span>Selesai</span>
            </div>
            {SLA_ROWS.map(([p, name, crit, resp, res]) => (
              <div key={p} className="grid grid-cols-[56px_1fr_92px_100px] items-start gap-3 border-b border-white/10 px-4 py-3 text-sm last:border-0">
                <span className={p === 'P1' ? 'font-extrabold text-[#FF9C8F]' : p === 'P2' ? 'font-extrabold text-[#E8A867]' : 'font-extrabold text-white'}>{p}</span>
                <span>
                  <span className="font-semibold">{name}</span>
                  <span className="block text-xs leading-5 text-white/55">{crit}</span>
                </span>
                <span className="font-semibold tabular-nums">{resp}</span>
                <span className="font-semibold tabular-nums">{res}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs font-medium text-white/50">PT UMIRA, Construction. Development. Investment.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Masuk ke portal helpdesk</h2>
          <p className="mb-8 mt-1.5 text-sm text-text-muted">Gunakan akun Superapps Anda.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

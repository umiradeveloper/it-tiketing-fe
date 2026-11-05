'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { BookOpen, FileUp, Paperclip, Trash2 } from 'lucide-react';
import { CHANNEL_LABEL, PRIORITY_CRITERIA, PRIORITY_LABEL, suggestPriority, type ImpactLevel, type TicketChannel, type TicketPriority, type TicketType } from '@/shared';
import { api, errorText, fetcher, qs } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import { fmtBytes, fmtDuration } from '@/lib/format';
import { Button, Field, Input, PageHeader, Panel, PriorityBadge, Select, Spinner, Textarea, useToast } from '@/components/ui';

const IMPACT_OPTIONS: Array<[ImpactLevel, string, string]> = [
  ['LOW', 'Hanya saya', 'Satu orang terdampak'],
  ['MEDIUM', 'Tim atau divisi', 'Beberapa rekan kerja terdampak'],
  ['HIGH', 'Banyak user / operasional proyek', 'Kantor, site, atau layanan utama terganggu'],
];
const URGENCY_OPTIONS: Array<[ImpactLevel, string, string]> = [
  ['LOW', 'Bisa menunggu', 'Pekerjaan masih bisa berjalan'],
  ['MEDIUM', 'Mengganggu pekerjaan', 'Ada solusi sementara, tapi lambat'],
  ['HIGH', 'Pekerjaan berhenti', 'Tidak ada cara lain untuk bekerja'],
];

interface UserLite {
  id: string;
  name: string;
  email: string;
  department?: { name: string } | null;
}

function Choice({ name, value, current, onChange, title, desc }: { name: string; value: string; current: string; onChange: (v: string) => void; title: string; desc: string }) {
  const checked = current === value;
  return (
    <label className={clsx('flex cursor-pointer gap-3 rounded-lg border px-3.5 py-3 transition-colors', checked ? 'border-teal bg-teal-50/60 ring-1 ring-teal' : 'border-line-strong bg-white hover:border-teal/60')}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="mt-1 accent-[#13707A]" />
      <span>
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-text-muted">{desc}</span>
      </span>
    </label>
  );
}

function NewTicketInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { user, isAgent, can } = useSession();
  const { data: lookups } = useLookups();
  const { data: me } = useSWR<{ location?: { id: string } | null; phone?: string | null }>('/users/me', fetcher);

  const [type, setType] = useState<TicketType>('INCIDENT');
  const [categoryId, setCategoryId] = useState(params.get('category') ?? '');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState('');
  const [impact, setImpact] = useState<ImpactLevel>('LOW');
  const [urgency, setUrgency] = useState<ImpactLevel>('MEDIUM');
  const [contactPhone, setContactPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Petugas: catat atas nama karyawan (email/WA/telepon)
  const [onBehalf, setOnBehalf] = useState(false);
  const [requesterQ, setRequesterQ] = useState('');
  const [requester, setRequester] = useState<UserLite | null>(null);
  const [channel, setChannel] = useState<TicketChannel>('PHONE');
  const [priorityOverride, setPriorityOverride] = useState<TicketPriority | ''>('');

  useEffect(() => {
    if (me?.location?.id && !locationId) setLocationId(me.location.id);
    if (me?.phone && !contactPhone) setContactPhone(me.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const category = lookups?.categories.find((c) => c.id === categoryId);
  const suggested = suggestPriority(impact, urgency);
  const priority = (priorityOverride || suggested) as TicketPriority;
  const policy = lookups?.slaPolicies.find((p) => p.priority === priority);

  const { data: userResults } = useSWR<{ data: UserLite[] }>(onBehalf && requesterQ.length >= 2 ? `/users${qs({ q: requesterQ })}` : null, fetcher);
  const kbQuery = title.trim().split(/\s+/).filter((w) => w.length > 3).slice(0, 2).join(' ');
  const { data: kb } = useSWR<{ data: Array<{ id: string; slug: string; title: string; summary: string | null }> }>(
    kbQuery.length > 3 ? `/knowledge-articles${qs({ q: kbQuery, pageSize: 3 })}` : null,
    fetcher,
  );

  const totalSize = useMemo(() => files.reduce((a, f) => a + f.size, 0), [files]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!categoryId) e.categoryId = 'Pilih kategori masalah.';
    if (title.trim().length < 5) e.title = 'Tulis judul singkat, minimal 5 karakter.';
    if (description.trim().length < 10) e.description = 'Ceritakan apa yang terjadi, minimal 10 karakter.';
    if (onBehalf && !requester) e.requester = 'Pilih karyawan pelapor.';
    if (files.some((f) => f.size > 10 * 1024 * 1024)) e.files = 'Ukuran tiap file maksimal 10 MB.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const t = await api.post<{ id: string; ticketNo: string }>('/tickets', {
        type,
        title: title.trim(),
        description: description.trim(),
        categoryId,
        subcategoryId: subcategoryId || undefined,
        locationId: locationId || undefined,
        impact,
        urgency,
        contactPhone: contactPhone || undefined,
        ...(onBehalf && requester ? { requesterId: requester.id, channel } : {}),
        ...(isAgent && priorityOverride ? { priority: priorityOverride } : {}),
      });
      if (files.length) {
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        await api.upload(`/tickets/${t.id}/attachments`, form).catch((e) => toast(`Tiket tersimpan, tapi lampiran gagal diunggah: ${errorText(e)}`, 'error'));
      }
      toast(`Tiket ${t.ticketNo} terkirim`);
      router.push(`/tickets/${t.id}`);
    } catch (e) {
      setFormError(errorText(e));
      setSubmitting(false);
    }
  };

  if (!lookups) return <Spinner />;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        back={{ href: '/tickets', label: 'Kembali ke daftar tiket' }}
        title={isAgent ? 'Catat tiket' : 'Buat tiket'}
        description="Isi sejelas mungkin. Tiket yang lengkap lebih cepat ditangani."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {can('ticket.update') && (
            <Panel>
              <label className="flex items-center gap-3 text-sm font-semibold text-ink">
                <input type="checkbox" checked={onBehalf} onChange={(e) => setOnBehalf(e.target.checked)} className="h-4 w-4 accent-[#13707A]" />
                Catat atas nama karyawan (laporan via telepon, WhatsApp, email, atau datang langsung)
              </label>
              {onBehalf && (
                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px]">
                  <Field label="Pelapor" required error={errors.requester}>
                    {requester ? (
                      <div className="flex items-center justify-between rounded-lg border border-teal bg-teal-50/50 px-3 py-2 text-sm">
                        <span>
                          <b>{requester.name}</b> <span className="text-text-muted">{requester.email}</span>
                        </span>
                        <button type="button" className="text-xs font-semibold text-teal" onClick={() => setRequester(null)}>
                          Ganti
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input value={requesterQ} onChange={(e) => setRequesterQ(e.target.value)} placeholder="Ketik nama, email, atau NIK" />
                        {!!userResults?.data.length && (
                          <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-line bg-white shadow-lg">
                            {userResults.data.map((u) => (
                              <li key={u.id}>
                                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => setRequester(u)}>
                                  <b>{u.name}</b> <span className="text-text-muted">{u.department?.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </Field>
                  <Field label="Kanal masuk">
                    <Select value={channel} onChange={(e) => setChannel(e.target.value as TicketChannel)}>
                      {(['PHONE', 'WHATSAPP', 'EMAIL', 'WALK_IN'] as TicketChannel[]).map((c) => (
                        <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}
            </Panel>
          )}

          <Panel title="Apa yang perlu ditangani?">
            <div className="space-y-5">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Choice name="type" value="INCIDENT" current={type} onChange={(v) => setType(v as TicketType)} title="Ada yang rusak / gangguan" desc="Insiden: sesuatu yang biasanya jalan, sekarang tidak" />
                <Choice name="type" value="SERVICE_REQUEST" current={type} onChange={(v) => setType(v as TicketType)} title="Saya butuh sesuatu" desc="Service request: instalasi, akses, perangkat baru" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kategori" required error={errors.categoryId} htmlFor="cat">
                  <Select id="cat" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(''); }}>
                    <option value="">Pilih kategori</option>
                    {lookups.categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Subkategori" htmlFor="sub" hint={!category ? 'Pilih kategori terlebih dulu' : undefined}>
                  <Select id="sub" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!category}>
                    <option value="">Tidak yakin</option>
                    {category?.children.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Judul singkat" required error={errors.title} htmlFor="title" hint="Contoh: Laptop tidak bisa menyala setelah update Windows">
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
              </Field>

              {!!kb?.data.length && (
                <div className="rounded-lg border border-teal-100 bg-teal-50/60 p-3.5">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                    <BookOpen className="h-4 w-4 text-teal" /> Mungkin ini bisa langsung membantu
                  </p>
                  <ul className="space-y-1">
                    {kb.data.map((a) => (
                      <li key={a.id}>
                        <Link href={`/knowledge/${a.slug}`} target="_blank" className="link text-sm">
                          {a.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Field
                label="Deskripsi"
                required
                error={errors.description}
                htmlFor="desc"
                hint="Tuliskan: apa yang terjadi, sejak kapan, pesan error yang muncul, dan apa yang sudah dicoba."
              >
                <Textarea id="desc" rows={6} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={10000} />
              </Field>

              <Field label="Lampiran" error={errors.files} hint="Screenshot pesan error sangat membantu. PNG, JPG, PDF, DOCX, XLSX, TXT, ZIP. Maks 10 MB per file, 5 file.">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-paper/50 px-4 py-5 text-sm font-semibold text-text-muted hover:border-teal hover:text-teal">
                  <FileUp className="h-4 w-4" /> Pilih file
                  <input
                    type="file"
                    multiple
                    className="sr-only"
                    accept=".png,.jpg,.jpeg,.webp,.pdf,.txt,.docx,.xlsx,.zip"
                    onChange={(e) => {
                      const add = Array.from(e.target.files ?? []);
                      setFiles((f) => [...f, ...add].slice(0, 5));
                      e.target.value = '';
                    }}
                  />
                </label>
                {files.length > 0 && (
                  <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <Paperclip className="h-4 w-4 text-text-faint" />
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-text-muted">{fmtBytes(f.size)}</span>
                        <button type="button" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))} aria-label={`Hapus ${f.name}`} className="text-text-muted hover:text-danger">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                    <li className="px-3 py-1.5 text-right text-xs text-text-muted">Total {fmtBytes(totalSize)}</li>
                  </ul>
                )}
              </Field>
            </div>
          </Panel>

          <Panel title="Seberapa besar dampaknya?">
            <div className="grid gap-6 md:grid-cols-2">
              <fieldset>
                <legend className="label">Siapa yang terdampak?</legend>
                <div className="space-y-2">
                  {IMPACT_OPTIONS.map(([v, t, d]) => (
                    <Choice key={v} name="impact" value={v} current={impact} onChange={(x) => setImpact(x as ImpactLevel)} title={t} desc={d} />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="label">Seberapa mendesak?</legend>
                <div className="space-y-2">
                  {URGENCY_OPTIONS.map(([v, t, d]) => (
                    <Choice key={v} name="urgency" value={v} current={urgency} onChange={(x) => setUrgency(x as ImpactLevel)} title={t} desc={d} />
                  ))}
                </div>
              </fieldset>
            </div>
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Panel title="Ringkasan">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-text-muted">Perkiraan prioritas</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <PriorityBadge priority={priority} />
                </div>
                <p className="mt-1.5 text-xs text-text-muted">{PRIORITY_CRITERIA[priority]}</p>
                {policy && (
                  <p className="mt-2 text-sm text-ink">
                    Respons dalam <b>{fmtDuration(policy.responseMinutes, policy.useBusinessHours)}</b>, target selesai <b>{fmtDuration(policy.resolutionMinutes, policy.useBusinessHours)}</b>
                    {policy.useBusinessHours ? '' : ' (24/7, termasuk di luar jam kerja)'}.
                  </p>
                )}
                {!isAgent && <p className="mt-2 text-xs text-text-muted">Prioritas final ditetapkan Helpdesk L1 setelah tiket diverifikasi.</p>}
              </div>
              {isAgent && (
                <Field label="Tetapkan prioritas">
                  <Select value={priorityOverride} onChange={(e) => setPriorityOverride(e.target.value as TicketPriority)}>
                    <option value="">Ikuti saran ({suggested})</option>
                    {(['P1', 'P2', 'P3', 'P4'] as TicketPriority[]).map((p) => (
                      <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Lokasi / site" htmlFor="loc">
                <Select id="loc" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                  <option value="">Pilih lokasi</option>
                  {lookups.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.projectCode ? ` (${l.projectCode})` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nomor yang bisa dihubungi" htmlFor="phone">
                <Input id="phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} inputMode="tel" placeholder="08xx" />
              </Field>
            </div>
          </Panel>
          {formError && (
            <p className="rounded-lg border border-danger/30 bg-danger-50 px-3 py-2 text-sm font-medium text-danger" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" loading={submitting} className="w-full !py-3" variant={priority === 'P1' ? 'danger' : 'primary'}>
            Kirim tiket
          </Button>
          <p className="text-center text-xs text-text-muted">Dikirim sebagai {onBehalf && requester ? requester.name : user.name}</p>
        </aside>
      </div>
    </form>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewTicketInner />
    </Suspense>
  );
}

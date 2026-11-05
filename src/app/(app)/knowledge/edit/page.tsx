'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import { api, errorText, fetcher } from '@/lib/api';
import { useLookups } from '@/lib/session';
import { Button, Field, Input, PageHeader, Panel, Select, Spinner, Tabs, Textarea, useToast } from '@/components/ui';

interface Article {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  keywords: string | null;
  category: { id: string } | null;
}

function Editor() {
  const params = useSearchParams();
  const id = params.get('id');
  const router = useRouter();
  const toast = useToast();
  const { data: lookups } = useLookups();
  const { data: existing } = useSWR<Article>(id ? `/knowledge-articles/${id}` : null, fetcher, { revalidateOnFocus: false });
  const [form, setForm] = useState({ title: '', summary: '', content: '', categoryId: '', visibility: 'PUBLIC', status: 'DRAFT', keywords: '' });
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing)
      setForm({
        title: existing.title,
        summary: existing.summary ?? '',
        content: existing.content,
        categoryId: existing.category?.id ?? '',
        visibility: existing.visibility,
        status: existing.status,
        keywords: existing.keywords ?? '',
      });
  }, [existing]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (status: string) => {
    setBusy(true);
    setError(null);
    const body = { ...form, status, categoryId: form.categoryId || undefined, summary: form.summary || undefined, keywords: form.keywords || undefined };
    try {
      const a = id ? await api.patch<Article>(`/knowledge-articles/${id}`, body) : await api.post<Article>('/knowledge-articles', body);
      toast(status === 'PUBLISHED' ? 'Artikel diterbitkan' : 'Draf disimpan');
      router.push(`/knowledge/${a.slug}`);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  if (id && !existing) return <Spinner />;

  return (
    <div>
      <PageHeader back={{ href: '/knowledge', label: 'Knowledge base' }} title={id ? 'Ubah artikel' : 'Tulis artikel'} description="Gunakan Markdown: ## untuk subjudul, 1. untuk langkah berurutan, **tebal** untuk penekanan." />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Panel>
          <div className="space-y-4">
            <Field label="Judul" required>
              <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Cara …" />
            </Field>
            <Field label="Ringkasan" hint="Satu kalimat yang muncul di hasil pencarian.">
              <Input value={form.summary} onChange={(e) => set('summary', e.target.value)} maxLength={500} />
            </Field>
            <div>
              <Tabs value={tab} onChange={setTab} items={[{ value: 'write', label: 'Tulis' }, { value: 'preview', label: 'Pratinjau' }]} />
              {tab === 'write' ? (
                <Textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={18} className="mt-3 font-mono !text-[13px]" aria-label="Isi artikel" />
              ) : (
                <div className="prose-kb mt-3 min-h-[300px] rounded-lg border border-line px-5 py-3 text-[15px]">
                  <ReactMarkdown>{form.content || '_Belum ada isi._'}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </Panel>
        <aside className="space-y-4">
          <Panel>
            <div className="space-y-4">
              <Field label="Kategori">
                <Select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">Tanpa kategori</option>
                  {lookups?.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Bisa dibaca oleh">
                <Select value={form.visibility} onChange={(e) => set('visibility', e.target.value)}>
                  <option value="PUBLIC">Semua karyawan</option>
                  <option value="INTERNAL">Hanya tim IT</option>
                </Select>
              </Field>
              <Field label="Kata kunci" hint="Pisahkan dengan koma. Membantu pencarian.">
                <Input value={form.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="vpn, remote, site" />
              </Field>
            </div>
          </Panel>
          {error && <p className="rounded-lg border border-danger/30 bg-danger-50 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
          <Button className="w-full" loading={busy} onClick={() => save('PUBLISHED')}>
            Terbitkan
          </Button>
          <Button className="w-full" variant="secondary" disabled={busy} onClick={() => save('DRAFT')}>
            Simpan sebagai draf
          </Button>
          {id && (
            <Button className="w-full" variant="ghost" disabled={busy} onClick={() => save('ARCHIVED')}>
              Arsipkan
            </Button>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function EditArticlePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Editor />
    </Suspense>
  );
}

'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { BookOpen, Eye, Lock, Plus, Search } from 'lucide-react';
import { fetcher, qs } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import type { Paginated } from '@/lib/types';
import { fmtDate } from '@/lib/format';
import { Badge, ButtonLink, EmptyState, PageHeader, Pagination, Spinner } from '@/components/ui';

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  visibility: 'PUBLIC' | 'INTERNAL';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  viewCount: number;
  updatedAt: string;
  category: { id: string; name: string } | null;
  author: { name: string };
}

export default function KnowledgePage() {
  const { can } = useSession();
  const { data: lookups } = useLookups();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR<Paginated<ArticleRow>>(`/knowledge-articles${qs({ q, categoryId, page, pageSize: 18 })}`, fetcher, { keepPreviousData: true });

  return (
    <div>
      <PageHeader
        title="Knowledge base"
        description="Panduan penyelesaian masalah yang sering terjadi. Coba cari di sini sebelum membuat tiket."
        actions={
          can('kb.manage') && (
            <ButtonLink href="/knowledge/edit">
              <Plus className="h-4 w-4" /> Tulis artikel
            </ButtonLink>
          )
        }
      />

      <div className="relative mb-4 max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-faint" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Contoh: VPN, printer, reset password"
          className="input !py-3 !pl-12 !text-base"
          aria-label="Cari artikel"
        />
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {[{ id: '', name: 'Semua' }, ...(lookups?.categories ?? [])].map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategoryId(c.id);
              setPage(1);
            }}
            className={clsx('rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors', categoryId === c.id ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-text-muted hover:border-teal hover:text-teal')}
          >
            {c.name}
          </button>
        ))}
      </div>

      {isLoading && !data && <Spinner />}
      {data?.data.length === 0 && (
        <div className="panel">
          <EmptyState icon={BookOpen} title="Artikel tidak ditemukan" action={can('ticket.create') ? <ButtonLink href="/tickets/new">Buat tiket</ButtonLink> : undefined}>
            Belum ada panduan untuk kata kunci ini. Tim helpdesk siap membantu lewat tiket.
          </EmptyState>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.data.map((a) => (
          <Link key={a.id} href={`/knowledge/${a.slug}`} className="panel group flex flex-col p-5 transition-colors hover:border-teal">
            <div className="flex flex-wrap items-center gap-2">
              {a.category && <span className="text-xs font-semibold text-teal">{a.category.name}</span>}
              {a.visibility === 'INTERNAL' && (
                <Badge tone="copper">
                  <Lock className="h-3 w-3" /> Internal IT
                </Badge>
              )}
              {a.status !== 'PUBLISHED' && <Badge>{a.status === 'DRAFT' ? 'Draf' : 'Diarsipkan'}</Badge>}
            </div>
            <h2 className="mt-2 text-[17px] font-bold leading-snug text-ink group-hover:text-teal">{a.title}</h2>
            {a.summary && <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-text-muted">{a.summary}</p>}
            <p className="mt-auto flex items-center gap-3 pt-4 text-xs text-text-faint">
              <span>Diperbarui {fmtDate(a.updatedAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {a.viewCount}
              </span>
            </p>
          </Link>
        ))}
      </div>
      {data && data.meta.totalPages > 1 && (
        <div className="panel mt-4">
          <Pagination meta={data.meta} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

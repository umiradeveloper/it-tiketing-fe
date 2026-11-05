'use client';

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import ReactMarkdown from 'react-markdown';
import { Lock, Pencil } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { useSession } from '@/lib/session';
import { fmtDate } from '@/lib/format';
import { Badge, ButtonLink, ErrorBanner, PageHeader, Spinner } from '@/components/ui';

interface Article {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  status: string;
  keywords: string | null;
  updatedAt: string;
  category: { id: string; name: string } | null;
  author: { name: string };
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { can } = useSession();
  const { data: a, error } = useSWR<Article>(`/knowledge-articles/${slug}`, fetcher, { revalidateOnFocus: false });

  if (error) return <ErrorBanner error={error} />;
  if (!a) return <Spinner />;

  return (
    <article className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: '/knowledge', label: 'Knowledge base' }}
        title={a.title}
        description={a.summary}
        actions={
          can('kb.manage') && (
            <ButtonLink href={`/knowledge/edit?id=${a.id}`} variant="secondary">
              <Pencil className="h-4 w-4" /> Ubah
            </ButtonLink>
          )
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-text-muted">
        {a.category && <Badge tone="teal">{a.category.name}</Badge>}
        {a.visibility === 'INTERNAL' && (
          <Badge tone="copper">
            <Lock className="h-3 w-3" /> Hanya tim IT
          </Badge>
        )}
        {a.status === 'DRAFT' && <Badge>Draf</Badge>}
        <span>
          Ditulis {a.author.name}, diperbarui {fmtDate(a.updatedAt)}
        </span>
      </div>
      <div className="panel prose-kb px-6 py-5 text-[15px] text-text sm:px-8 sm:py-7">
        <ReactMarkdown>{a.content}</ReactMarkdown>
      </div>
      {can('ticket.create') && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-white px-5 py-4">
          <p className="text-sm text-text-muted">Langkah di atas belum menyelesaikan masalah Anda?</p>
          <ButtonLink href={`/tickets/new${a.category ? `?category=${a.category.id}` : ''}`}>Buat tiket</ButtonLink>
        </div>
      )}
    </article>
  );
}

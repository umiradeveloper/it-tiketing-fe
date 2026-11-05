'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  ArrowUpRight,
  ChevronLeft,
  CheckCircle2,
  Clock3,
  FileText,
  HardDrive,
  Lock,
  Paperclip,
  Send,
  ShieldAlert,
  Star,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  Wrench,
  XCircle,
} from 'lucide-react';
import {
  CHANNEL_LABEL,
  IMPACT_LABEL,
  LEVEL_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TICKET_TYPE_LABEL,
  type ImpactLevel,
  type SupportLevel,
  type TicketPriority,
  type TicketStatus,
  type TicketType,
} from '@/shared';
import { api, errorText, fetcher } from '@/lib/api';
import { useLookups, useSession } from '@/lib/session';
import type { Named, SlaSummary } from '@/lib/types';
import { fmtBytes, fmtDateTime, timeAgo } from '@/lib/format';
import {
  Avatar,
  Badge,
  Button,
  ErrorBanner,
  Field,
  Input,
  KeyVal,
  Modal,
  Panel,
  PriorityBadge,
  Select,
  SlaFuse,
  Spinner,
  StatusBadge,
  Textarea,
  useToast,
} from '@/components/ui';

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  commentId: string | null;
  createdAt: string;
  uploadedBy?: { name: string };
}
interface Comment {
  id: string;
  body: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  createdAt: string;
  author: { id: string; name: string; isExternal: boolean; teamId: string | null };
  attachments: Attachment[];
}
interface Activity {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  actorName: string | null;
}
interface TicketDetail {
  id: string;
  ticketNo: string;
  type: TicketType;
  title: string;
  description: string;
  priority: TicketPriority;
  impact: ImpactLevel;
  urgency: ImpactLevel;
  status: TicketStatus;
  channel: keyof typeof CHANNEL_LABEL;
  escalationLevel: SupportLevel;
  vendorName: string | null;
  vendorReference: string | null;
  contactPhone: string | null;
  createdAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenCount: number;
  category: Named;
  subcategory: Named | null;
  location: (Named & { type: string }) | null;
  requester: { id: string; name: string; email: string; phone: string | null; employeeCode: string; position: string | null; department: { name: string } | null; location: { name: string } | null };
  assignee: Named | null;
  team: (Named & { level: SupportLevel }) | null;
  asset: { id: string; assetTag: string; brand: string; model: string; type: string; serialNumber: string | null; status: string } | null;
  comments: Comment[];
  attachments: Attachment[];
  escalations: Array<{ id: string; fromLevel: SupportLevel; toLevel: SupportLevel; reason: string; isAutomatic: boolean; vendorName: string | null; escalatedAt: string }>;
  resolutions: Array<{ id: string; resolutionCode: string; solution: string; rootCause: string | null; resolvedAt: string; resolvedBy: { name: string } }>;
  survey: { rating: number; comment: string | null } | null;
  activities: Activity[];
  sla: SlaSummary;
  actions: {
    canUpdate: boolean;
    canAssign: boolean;
    canTake: boolean;
    canEscalate: boolean;
    canResolve: boolean;
    canClose: boolean;
    canConfirm: boolean;
    canSurvey: boolean;
    canComment: boolean;
    canCommentInternal: boolean;
    canCancel: boolean;
    allowedStatuses: TicketStatus[];
  };
}

const RESOLUTION_CODES: Record<string, string> = {
  FIXED: 'Diperbaiki',
  WORKAROUND: 'Solusi sementara',
  REPLACED: 'Perangkat/part diganti',
  CONFIGURED: 'Konfigurasi diubah',
  USER_EDUCATION: 'Panduan ke user',
  DUPLICATE: 'Duplikat tiket lain',
  NO_FAULT_FOUND: 'Tidak ditemukan masalah',
  VENDOR_FIXED: 'Diperbaiki vendor',
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: t, error, mutate } = useSWR<TicketDetail>(`/tickets/${id}`, fetcher, { refreshInterval: 30_000 });
  const [modal, setModal] = useState<null | 'assign' | 'escalate' | 'resolve' | 'close' | 'cancel' | 'reopen'>(null);
  const { user, isAgent } = useSession();
  const toast = useToast();

  if (error) return <ErrorBanner error={error} onRetry={() => mutate()} />;
  if (!t) return <Spinner label="Memuat tiket…" />;

  const a = t.actions;
  const take = async () => {
    try {
      await api.post(`/tickets/${t.id}/assign`, { assigneeId: user.id, reason: 'Diambil sendiri' });
      toast('Tiket diambil');
      mutate();
    } catch (e) {
      toast(errorText(e), 'error');
    }
  };

  return (
    <div>
      <Link href="/tickets" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-teal">
        <ChevronLeft className="h-4 w-4" /> {isAgent ? "Antrean tiket" : "Tiket saya"}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-text-muted">{t.ticketNo}</span>
            <PriorityBadge priority={t.priority} />
            <Badge tone="neutral">{TICKET_TYPE_LABEL[t.type]}</Badge>
            {t.escalationLevel !== 'L1' && <Badge tone="copper">{LEVEL_LABEL[t.escalationLevel]}</Badge>}
            {t.reopenCount > 0 && <Badge tone="danger">Dibuka ulang {t.reopenCount}×</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-ink">{t.title}</h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Dilaporkan {t.requester.name}, {fmtDateTime(t.createdAt)} via {CHANNEL_LABEL[t.channel]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.canTake && (
            <Button onClick={take} variant="secondary">
              <UserPlus className="h-4 w-4" /> Ambil tiket
            </Button>
          )}
          {a.canAssign && (
            <Button onClick={() => setModal('assign')} variant="secondary">
              <UserPlus className="h-4 w-4" /> Assign
            </Button>
          )}
          {a.canEscalate && (
            <Button onClick={() => setModal('escalate')} variant="secondary">
              <ArrowUpRight className="h-4 w-4" /> Eskalasi
            </Button>
          )}
          {a.canResolve && (
            <Button onClick={() => setModal('resolve')}>
              <CheckCircle2 className="h-4 w-4" /> Selesaikan
            </Button>
          )}
          {a.canClose && (
            <Button onClick={() => setModal('close')} variant="secondary">
              Tutup tiket
            </Button>
          )}
        </div>
      </header>

      <SlaPanel t={t} />

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {(a.canConfirm || a.canSurvey) && <ConfirmBox t={t} onDone={mutate} onReopen={() => setModal('reopen')} />}
          {t.resolutions[0] && <ResolutionCard r={t.resolutions[0]} survey={t.survey} />}

          <Panel title="Deskripsi">
            <p className="whitespace-pre-line text-[15px] leading-7 text-text">{t.description}</p>
            <AttachmentList ticketId={t.id} items={t.attachments.filter((x) => !x.commentId)} />
          </Panel>

          <Timeline t={t} />
          {a.canComment && <Composer t={t} onSent={mutate} />}
        </div>

        <aside className="space-y-6">
          <ClassificationPanel t={t} onSaved={mutate} />
          <Panel title="Penanganan">
            <dl className="divide-y divide-line/70">
              <KeyVal k="Level">{LEVEL_LABEL[t.escalationLevel]}</KeyVal>
              <KeyVal k="Tim">{t.team?.name ?? '—'}</KeyVal>
              <KeyVal k="Petugas">{t.assignee?.name ?? <span className="text-copper-600">Belum di-assign</span>}</KeyVal>
              {t.vendorName && <KeyVal k="Vendor">{t.vendorName}</KeyVal>}
              {t.vendorReference && <KeyVal k="Ref. vendor">{t.vendorReference}</KeyVal>}
              <KeyVal k="Respons pertama">{t.firstResponseAt ? fmtDateTime(t.firstResponseAt) : 'Belum'}</KeyVal>
            </dl>
            {t.escalations.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-xs font-semibold text-text-muted">Riwayat eskalasi</p>
                <ol className="space-y-2.5">
                  {t.escalations.map((e) => (
                    <li key={e.id} className="text-sm">
                      <span className="font-semibold text-ink">
                        {e.fromLevel} ke {e.toLevel === 'MANAGEMENT' ? 'Manajemen' : e.toLevel}
                      </span>
                      {e.isAutomatic && <Badge tone="copper" className="ml-2">Otomatis</Badge>}
                      <span className="block text-xs text-text-muted">{e.reason}</span>
                      <span className="block text-2xs text-text-faint">{fmtDateTime(e.escalatedAt)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Panel>
          <Panel title="Pelapor">
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={t.requester.name} size={40} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{t.requester.name}</p>
                <p className="truncate text-xs text-text-muted">{t.requester.position ?? t.requester.employeeCode}</p>
              </div>
            </div>
            <dl className="divide-y divide-line/70">
              <KeyVal k="Divisi">{t.requester.department?.name ?? '—'}</KeyVal>
              <KeyVal k="Email">
                <a href={`mailto:${t.requester.email}`} className="link font-medium">{t.requester.email}</a>
              </KeyVal>
              {(t.contactPhone || t.requester.phone) && (
                <KeyVal k="Telepon">
                  <a href={`tel:${t.contactPhone ?? t.requester.phone}`} className="link font-medium">{t.contactPhone ?? t.requester.phone}</a>
                </KeyVal>
              )}
              <KeyVal k="Lokasi">{t.location?.name ?? t.requester.location?.name ?? '—'}</KeyVal>
            </dl>
          </Panel>
          {t.asset && (
            <Panel title="Aset terkait">
              <Link href={`/assets/${t.asset.id}`} className="flex items-center gap-3 rounded-lg border border-line p-3 hover:border-teal">
                <HardDrive className="h-5 w-5 text-teal" />
                <span>
                  <span className="block text-sm font-bold text-ink">{t.asset.assetTag}</span>
                  <span className="block text-xs text-text-muted">
                    {t.asset.brand} {t.asset.model}
                  </span>
                </span>
              </Link>
            </Panel>
          )}
          {a.canCancel && (
            <button onClick={() => setModal('cancel')} className="w-full rounded-lg py-2 text-sm font-semibold text-text-muted hover:bg-danger-50 hover:text-danger">
              Batalkan tiket
            </button>
          )}
        </aside>
      </div>

      <AssignModal open={modal === 'assign'} t={t} onClose={() => setModal(null)} onDone={mutate} />
      <EscalateModal open={modal === 'escalate'} t={t} onClose={() => setModal(null)} onDone={mutate} />
      <ResolveModal open={modal === 'resolve'} t={t} onClose={() => setModal(null)} onDone={mutate} />
      <SimpleReasonModal
        open={modal === 'close'}
        title="Tutup tiket"
        label="Catatan penutupan (opsional)"
        cta="Tutup tiket"
        optional
        onClose={() => setModal(null)}
        onSubmit={async (note) => {
          await api.post(`/tickets/${t.id}/close`, { note: note || undefined });
          toast('Tiket ditutup');
          mutate();
        }}
      />
      <SimpleReasonModal
        open={modal === 'cancel'}
        title="Batalkan tiket"
        label="Alasan pembatalan"
        cta="Batalkan tiket"
        danger
        onClose={() => setModal(null)}
        onSubmit={async (reason) => {
          await api.post(`/tickets/${t.id}/cancel`, { reason });
          toast('Tiket dibatalkan');
          mutate();
        }}
      />
      <SimpleReasonModal
        open={modal === 'reopen'}
        title="Masalah belum teratasi"
        label="Apa yang masih terjadi?"
        cta="Buka kembali tiket"
        onClose={() => setModal(null)}
        onSubmit={async (reason) => {
          await api.post(`/tickets/${t.id}/confirm`, { accepted: false, reason });
          toast('Tiket dibuka kembali, petugas sudah dinotifikasi');
          mutate();
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------------ SLA

function SlaPanel({ t }: { t: TicketDetail }) {
  const s = t.sla;
  const responseState = t.firstResponseAt
    ? s.responseMet
      ? { tone: 'text-ok', text: `Direspons ${fmtDateTime(t.firstResponseAt)}` }
      : { tone: 'text-danger', text: `Direspons terlambat, ${fmtDateTime(t.firstResponseAt)}` }
    : s.responseDueAt && new Date(s.responseDueAt) < new Date()
      ? { tone: 'text-danger', text: `Belum direspons, tenggat ${fmtDateTime(s.responseDueAt)}` }
      : { tone: 'text-text', text: `Tenggat ${fmtDateTime(s.responseDueAt)}` };

  return (
    <section className={clsx('panel grid gap-5 p-5 md:grid-cols-[1fr_auto_auto] md:items-center md:gap-8', s.state === 'overdue' && 'border-danger/40')}>
      <div>
        <div className="mb-1 flex items-center gap-2 text-sm font-bold text-ink">
          <Clock3 className="h-4 w-4 text-teal" /> SLA penyelesaian
          <span className="font-normal text-text-muted">{s.policyLabel}</span>
        </div>
        <SlaFuse sla={s} />
        {s.state === 'paused' && <p className="mt-2 text-xs text-text-muted">Jam SLA dijeda selama tiket menunggu tanggapan user/vendor atau konfirmasi penyelesaian.</p>}
      </div>
      <div className="text-sm">
        <p className="text-xs font-semibold text-text-muted">Respons pertama</p>
        <p className={clsx('mt-0.5 font-semibold', responseState.tone)}>{responseState.text}</p>
      </div>
      <div className="text-sm">
        <p className="text-xs font-semibold text-text-muted">Target selesai</p>
        <p className={clsx('mt-0.5 font-semibold', s.state === 'overdue' ? 'text-danger' : 'text-ink')}>{fmtDateTime(s.resolutionDueAt)}</p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Konfirmasi & survei

function ConfirmBox({ t, onDone, onReopen }: { t: TicketDetail; onDone: () => void; onReopen: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await api.post(`/tickets/${t.id}/confirm`, { accepted: true });
      toast('Terima kasih, tiket ditutup');
      onDone();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const survey = async () => {
    setBusy(true);
    try {
      await api.post(`/tickets/${t.id}/survey`, { rating, comment: comment || undefined });
      toast('Survei terkirim, terima kasih');
      onDone();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-panel border-2 border-copper/50 bg-copper-50/60 p-5">
      {t.actions.canConfirm ? (
        <>
          <h2 className="text-base font-bold text-ink">Apakah masalah Anda sudah teratasi?</h2>
          <p className="mt-1 text-sm text-text-muted">Petugas menandai tiket ini selesai. Konfirmasi agar tiket ditutup, atau buka kembali bila masih bermasalah.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={confirm} loading={busy}>
              <ThumbsUp className="h-4 w-4" /> Ya, sudah teratasi
            </Button>
            <Button variant="secondary" onClick={onReopen}>
              <ThumbsDown className="h-4 w-4" /> Belum, buka kembali
            </Button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-base font-bold text-ink">Bagaimana layanan kami?</h2>
          <p className="mt-1 text-sm text-text-muted">Penilaian Anda masuk ke laporan kepuasan bulanan tim IT.</p>
          <div className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating 1 sampai 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} bintang`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="p-0.5"
              >
                <Star className={clsx('h-7 w-7 transition-colors', (hover || rating) >= n ? 'fill-copper text-copper' : 'text-line-strong')} />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div className="mt-3 space-y-3">
              <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ceritakan pengalaman Anda (opsional)" className="!min-h-[64px]" />
              <Button onClick={survey} loading={busy}>
                Kirim penilaian
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ResolutionCard({ r, survey }: { r: TicketDetail['resolutions'][number]; survey: TicketDetail['survey'] }) {
  return (
    <section className="panel overflow-hidden border-ok/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ok/20 bg-ok-50 px-5 py-3">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ok">
          <CheckCircle2 className="h-4 w-4" /> Solusi
        </h2>
        <span className="text-xs text-text-muted">
          {RESOLUTION_CODES[r.resolutionCode] ?? r.resolutionCode}, oleh {r.resolvedBy.name}, {fmtDateTime(r.resolvedAt)}
        </span>
      </div>
      <div className="space-y-3 p-5 text-[15px] leading-7">
        <p className="whitespace-pre-line">{r.solution}</p>
        {r.rootCause && (
          <p className="text-sm text-text-muted">
            <b className="text-ink">Akar masalah:</b> {r.rootCause}
          </p>
        )}
        {survey && (
          <p className="flex items-center gap-2 border-t border-line pt-3 text-sm text-text-muted">
            <span className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={clsx('h-4 w-4', survey.rating >= n ? 'fill-copper text-copper' : 'text-line-strong')} />
              ))}
            </span>
            {survey.comment && <span>“{survey.comment}”</span>}
          </p>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Lampiran

function AttachmentList({ ticketId, items }: { ticketId: string; items: Attachment[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {items.map((f) => (
        <li key={f.id}>
          <a
            href={`/api/v1/tickets/${ticketId}/attachments/${f.id}`}
            target="_blank"
            rel="noopener"
            className="inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-line bg-paper/60 px-3 py-2 text-sm hover:border-teal"
          >
            {f.mimeType.startsWith('image/') ? <FileText className="h-4 w-4 text-teal" /> : <Paperclip className="h-4 w-4 text-teal" />}
            <span className="truncate font-medium text-ink">{f.fileName}</span>
            <span className="shrink-0 text-xs text-text-muted">{fmtBytes(f.sizeBytes)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

// ------------------------------------------------------------------ Timeline

function Timeline({ t }: { t: TicketDetail }) {
  const { user } = useSession();
  const items = useMemo(() => {
    const list: Array<{ kind: 'comment'; at: string; c: Comment } | { kind: 'activity'; at: string; a: Activity }> = [
      ...t.comments.map((c) => ({ kind: 'comment' as const, at: c.createdAt, c })),
      ...t.activities.map((a) => ({ kind: 'activity' as const, at: a.createdAt, a })),
    ];
    return list.sort((x, y) => new Date(x.at).getTime() - new Date(y.at).getTime());
  }, [t]);

  const icon = (type: string) =>
    type === 'ESCALATED' ? <ArrowUpRight className="h-3.5 w-3.5" /> : type === 'RESOLVED' ? <CheckCircle2 className="h-3.5 w-3.5" /> : type === 'SLA' ? <ShieldAlert className="h-3.5 w-3.5" /> : type === 'CANCELLED' ? <XCircle className="h-3.5 w-3.5" /> : type === 'ASSIGNED' ? <UserPlus className="h-3.5 w-3.5" /> : <Wrench className="h-3.5 w-3.5" />;

  return (
    <Panel title="Riwayat & percakapan" bodyClass="!px-5 !py-4">
      <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-line">
        {items.map((it) =>
          it.kind === 'activity' ? (
            <li key={`a-${it.a.id}`} className="relative flex items-start gap-3 pl-0">
              <span
                className={clsx(
                  'relative z-[1] mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-white',
                  it.a.type === 'SLA' ? 'border-danger/40 text-danger' : it.a.type === 'ESCALATED' ? 'border-copper/50 text-copper' : it.a.type === 'RESOLVED' || it.a.type === 'CLOSED' ? 'border-ok/40 text-ok' : 'border-line text-text-muted',
                )}
              >
                {icon(it.a.type)}
              </span>
              <p className="pt-1 text-sm text-text-muted">
                <span className="text-text">{it.a.message}</span>
                <span className="ml-2 whitespace-nowrap text-2xs text-text-faint" title={fmtDateTime(it.a.createdAt)}>
                  {timeAgo(it.a.createdAt)}
                </span>
              </p>
            </li>
          ) : (
            <li key={`c-${it.c.id}`} className="relative flex items-start gap-3">
              <span className="relative z-[1]">
                <Avatar name={it.c.author.name} size={28} tone={it.c.author.id === t.requester.id ? 'copper' : 'teal'} />
              </span>
              <div
                className={clsx(
                  'min-w-0 flex-1 rounded-lg border px-4 py-3',
                  it.c.visibility === 'INTERNAL' ? 'border-copper/40 bg-copper-50/70' : it.c.author.id === user.id ? 'border-teal-100 bg-teal-50/50' : 'border-line bg-white',
                )}
              >
                <p className="flex flex-wrap items-center gap-x-2 text-xs">
                  <b className="text-sm text-ink">{it.c.author.name}</b>
                  {it.c.author.id === t.requester.id && <span className="text-text-muted">Pelapor</span>}
                  {it.c.author.isExternal && <span className="text-text-muted">Vendor</span>}
                  {it.c.visibility === 'INTERNAL' && (
                    <span className="inline-flex items-center gap-1 font-semibold text-copper-600">
                      <Lock className="h-3 w-3" /> Catatan internal
                    </span>
                  )}
                  <span className="text-text-faint" title={fmtDateTime(it.c.createdAt)}>
                    {timeAgo(it.c.createdAt)}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-text">{it.c.body}</p>
                <AttachmentList ticketId={t.id} items={it.c.attachments} />
              </div>
            </li>
          ),
        )}
      </ol>
    </Panel>
  );
}

function Composer({ t, onSent }: { t: TicketDetail; onSent: () => void }) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const c = await api.post<{ id: string }>(`/tickets/${t.id}/comments`, { body: body.trim(), visibility: internal ? 'INTERNAL' : 'PUBLIC' });
      if (files.length) {
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        form.append('commentId', c.id);
        await api.upload(`/tickets/${t.id}/attachments`, form);
      }
      setBody('');
      setFiles([]);
      onSent();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={clsx('panel p-4', internal && 'border-copper/50 bg-copper-50/40')}>
      {t.actions.canCommentInternal && (
        <div className="mb-3 inline-flex rounded-lg border border-line bg-paper p-0.5 text-sm font-semibold" role="radiogroup" aria-label="Jenis balasan">
          <button role="radio" aria-checked={!internal} onClick={() => setInternal(false)} className={clsx('rounded-md px-3 py-1.5', !internal ? 'bg-white text-ink shadow-sm' : 'text-text-muted')}>
            Balas ke pelapor
          </button>
          <button role="radio" aria-checked={internal} onClick={() => setInternal(true)} className={clsx('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5', internal ? 'bg-white text-copper-600 shadow-sm' : 'text-text-muted')}>
            <Lock className="h-3.5 w-3.5" /> Catatan internal
          </button>
        </div>
      )}
      <label htmlFor="reply" className="sr-only">
        Tulis balasan
      </label>
      <Textarea
        id="reply"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && send()}
        placeholder={internal ? 'Catatan ini hanya terlihat oleh tim IT' : t.status === 'PENDING_USER' && !t.actions.canCommentInternal ? 'Tim IT menunggu informasi dari Anda. Balas di sini.' : 'Tulis balasan'}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-teal">
          <Paperclip className="h-4 w-4" /> {files.length ? `${files.length} file dipilih` : 'Lampirkan file'}
          <input type="file" multiple className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} />
        </label>
        <Button onClick={send} loading={busy} disabled={!body.trim()} variant={internal ? 'copper' : 'primary'}>
          <Send className="h-4 w-4" /> {internal ? 'Simpan catatan' : 'Kirim balasan'}
        </Button>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ Klasifikasi

function ClassificationPanel({ t, onSaved }: { t: TicketDetail; onSaved: () => void }) {
  const { data: lookups } = useLookups();
  const toast = useToast();
  const [form, setForm] = useState({
    type: t.type,
    categoryId: t.category.id,
    subcategoryId: t.subcategory?.id ?? '',
    priority: t.priority,
    impact: t.impact,
    urgency: t.urgency,
    status: t.status,
    locationId: t.location?.id ?? '',
    reason: '',
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setForm((f) => ({ ...f, type: t.type, categoryId: t.category.id, subcategoryId: t.subcategory?.id ?? '', priority: t.priority, impact: t.impact, urgency: t.urgency, status: t.status, locationId: t.location?.id ?? '' }));
  }, [t]);

  if (!t.actions.canUpdate) {
    return (
      <Panel title="Detail tiket">
        <dl className="divide-y divide-line/70">
          <KeyVal k="Status">
            <StatusBadge status={t.status} />
          </KeyVal>
          <KeyVal k="Kategori">
            {t.category.name}
            {t.subcategory ? ` / ${t.subcategory.name}` : ''}
          </KeyVal>
          <KeyVal k="Prioritas">{PRIORITY_LABEL[t.priority]}</KeyVal>
          <KeyVal k="Dampak / urgensi">
            {IMPACT_LABEL[t.impact]} / {IMPACT_LABEL[t.urgency]}
          </KeyVal>
          {t.closedAt && <KeyVal k="Ditutup">{fmtDateTime(t.closedAt)}</KeyVal>}
        </dl>
      </Panel>
    );
  }

  const category = lookups?.categories.find((c) => c.id === form.categoryId);
  const dirty =
    form.type !== t.type ||
    form.categoryId !== t.category.id ||
    form.subcategoryId !== (t.subcategory?.id ?? '') ||
    form.priority !== t.priority ||
    form.impact !== t.impact ||
    form.urgency !== t.urgency ||
    form.status !== t.status ||
    form.locationId !== (t.location?.id ?? '');
  const needsReason = form.priority !== t.priority || form.status === 'CANCELLED';

  const save = async () => {
    setBusy(true);
    try {
      await api.patch(`/tickets/${t.id}`, {
        type: form.type !== t.type ? form.type : undefined,
        categoryId: form.categoryId !== t.category.id ? form.categoryId : undefined,
        subcategoryId: form.subcategoryId !== (t.subcategory?.id ?? '') ? form.subcategoryId || null : undefined,
        priority: form.priority !== t.priority ? form.priority : undefined,
        impact: form.impact !== t.impact ? form.impact : undefined,
        urgency: form.urgency !== t.urgency ? form.urgency : undefined,
        status: form.status !== t.status ? form.status : undefined,
        locationId: form.locationId !== (t.location?.id ?? '') ? form.locationId || null : undefined,
        reason: form.reason || undefined,
      });
      toast('Perubahan tersimpan');
      setForm((f) => ({ ...f, reason: '' }));
      onSaved();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Panel title="Klasifikasi">
      <div className="space-y-3.5">
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value as TicketStatus)}>
            <option value={t.status}>{STATUS_LABEL[t.status]}</option>
            {t.actions.allowedStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prioritas">
            <Select value={form.priority} onChange={(e) => set('priority', e.target.value as TicketPriority)}>
              {(['P1', 'P2', 'P3', 'P4'] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Jenis">
            <Select value={form.type} onChange={(e) => set('type', e.target.value as TicketType)}>
              <option value="INCIDENT">Insiden</option>
              <option value="SERVICE_REQUEST">Service Request</option>
            </Select>
          </Field>
          <Field label="Dampak">
            <Select value={form.impact} onChange={(e) => set('impact', e.target.value as ImpactLevel)}>
              {(['LOW', 'MEDIUM', 'HIGH'] as ImpactLevel[]).map((v) => (
                <option key={v} value={v}>{IMPACT_LABEL[v]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Urgensi">
            <Select value={form.urgency} onChange={(e) => set('urgency', e.target.value as ImpactLevel)}>
              {(['LOW', 'MEDIUM', 'HIGH'] as ImpactLevel[]).map((v) => (
                <option key={v} value={v}>{IMPACT_LABEL[v]}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Kategori">
          <Select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value, subcategoryId: '' }))}>
            {lookups?.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Subkategori">
          <Select value={form.subcategoryId} onChange={(e) => set('subcategoryId', e.target.value)}>
            <option value="">—</option>
            {category?.children.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Lokasi / site">
          <Select value={form.locationId} onChange={(e) => set('locationId', e.target.value)}>
            <option value="">—</option>
            {lookups?.locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </Select>
        </Field>
        {dirty && needsReason && (
          <Field label={form.status === 'CANCELLED' ? 'Alasan pembatalan' : 'Alasan perubahan prioritas'} required>
            <Input value={form.reason} onChange={(e) => set('reason', e.target.value)} placeholder="Wajib dicatat di audit trail" />
          </Field>
        )}
        {form.priority !== t.priority && <p className="text-xs text-copper-600">Target SLA akan dihitung ulang sesuai prioritas baru. Riwayat SLA lama tetap tersimpan.</p>}
        {dirty && (
          <Button onClick={save} loading={busy} disabled={needsReason && form.reason.trim().length < 5} className="w-full">
            Simpan perubahan
          </Button>
        )}
      </div>
    </Panel>
  );
}

// ------------------------------------------------------------------ Modals

function useSubmit(onClose: () => void, onDone: () => void) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast(msg);
      onDone();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function AssignModal({ open, t, onClose, onDone }: { open: boolean; t: TicketDetail; onClose: () => void; onDone: () => void }) {
  const { data: lookups } = useLookups();
  const [assigneeId, setAssigneeId] = useState('');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useSubmit(onClose, onDone);
  const groups = useMemo(() => {
    const g = new Map<string, NonNullable<typeof lookups>['agents']>();
    lookups?.agents.forEach((a) => g.set(a.team.name, [...(g.get(a.team.name) ?? []), a]));
    return [...g.entries()];
  }, [lookups]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign tiket"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} disabled={!assigneeId} onClick={() => run(() => api.post(`/tickets/${t.id}/assign`, { assigneeId, reason: reason || undefined }), 'Tiket di-assign')}>
            Assign
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Petugas" required>
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Pilih petugas</option>
            {groups.map(([team, agents]) => (
              <optgroup key={team} label={team}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id} disabled={a.id === t.assignee?.id}>
                    {a.name}
                    {a.vendorCompany ? ` (${a.vendorCompany})` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Catatan (opsional)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function EscalateModal({ open, t, onClose, onDone }: { open: boolean; t: TicketDetail; onClose: () => void; onDone: () => void }) {
  const { data: lookups } = useLookups();
  const order: SupportLevel[] = ['L1', 'L2', 'L3', 'MANAGEMENT'];
  const options = order.filter((l) => l === 'MANAGEMENT' || order.indexOf(l) > order.indexOf(t.escalationLevel));
  const [toLevel, setToLevel] = useState<SupportLevel>(options[0]);
  const [targetUserId, setTargetUserId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorReference, setVendorReference] = useState('');
  const [reason, setReason] = useState('');
  const { busy, error, run } = useSubmit(onClose, onDone);
  useEffect(() => {
    if (open) {
      setToLevel(options[0]);
      setTargetUserId('');
      setReason('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const targets = lookups?.agents.filter((a) => a.team.level === toLevel) ?? [];
  const desc: Record<SupportLevel, string> = {
    L1: '',
    L2: 'Spesialis infrastruktur atau aplikasi. Wajib bila penanganan L1 melewati 50% waktu SLA.',
    L3: 'Vendor atau prinsipal pihak ketiga. Catat nama vendor dan nomor referensinya.',
    MANAGEMENT: 'Kepala Divisi IT untuk tiket P1 atau SLA yang terlampaui. Petugas saat ini tetap menangani.',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Eskalasi tiket"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant="copper"
            loading={busy}
            disabled={reason.trim().length < 5}
            onClick={() =>
              run(
                () =>
                  api.post(`/tickets/${t.id}/escalate`, {
                    toLevel,
                    reason,
                    targetUserId: targetUserId || undefined,
                    vendorName: vendorName || undefined,
                    vendorReference: vendorReference || undefined,
                  }),
                'Tiket dieskalasi',
              )
            }
          >
            Eskalasi ke {toLevel === 'MANAGEMENT' ? 'manajemen' : toLevel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Saat ini di <b className="text-ink">{LEVEL_LABEL[t.escalationLevel]}</b>. Riwayat penanganan dan assignment sebelumnya tetap tersimpan.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((l) => (
            <label key={l} className={clsx('cursor-pointer rounded-lg border p-3 text-sm', toLevel === l ? 'border-copper bg-copper-50 ring-1 ring-copper' : 'border-line-strong hover:border-copper/60')}>
              <input type="radio" className="sr-only" checked={toLevel === l} onChange={() => { setToLevel(l); setTargetUserId(''); }} />
              <span className="block font-bold text-ink">{LEVEL_LABEL[l]}</span>
              <span className="mt-1 block text-xs leading-5 text-text-muted">{desc[l]}</span>
            </label>
          ))}
        </div>
        {toLevel !== 'MANAGEMENT' && (
          <Field label={toLevel === 'L3' ? 'PIC vendor (opsional)' : 'Spesialis tujuan (opsional)'} hint="Kosongkan untuk mengirim ke antrean tim.">
            <Select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)}>
              <option value="">Antrean tim {toLevel}</option>
              {targets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}, {a.team.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {toLevel === 'L3' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nama vendor" required={!targetUserId}>
              <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="PT …" />
            </Field>
            <Field label="No. referensi vendor">
              <Input value={vendorReference} onChange={(e) => setVendorReference(e.target.value)} placeholder="No. tiket/servis vendor" />
            </Field>
          </div>
        )}
        <Field label="Alasan eskalasi" required>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Apa yang sudah dicoba dan mengapa perlu dieskalasi" />
        </Field>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function ResolveModal({ open, t, onClose, onDone }: { open: boolean; t: TicketDetail; onClose: () => void; onDone: () => void }) {
  const [resolutionCode, setCode] = useState('FIXED');
  const [solution, setSolution] = useState('');
  const [rootCause, setRootCause] = useState('');
  const { busy, error, run } = useSubmit(onClose, onDone);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Selesaikan tiket"
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={busy} disabled={solution.trim().length < 10} onClick={() => run(() => api.post(`/tickets/${t.id}/resolve`, { resolutionCode, solution, rootCause: rootCause || undefined }), 'Tiket diselesaikan, menunggu konfirmasi pelapor')}>
            <CheckCircle2 className="h-4 w-4" /> Tandai selesai
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-text-muted">Pelapor akan diminta mengonfirmasi. Jam SLA berhenti sampai pelapor merespons.</p>
        <Field label="Hasil penanganan" required>
          <Select value={resolutionCode} onChange={(e) => setCode(e.target.value)}>
            {Object.entries(RESOLUTION_CODES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
        </Field>
        <Field label="Solusi yang diterapkan" required hint="Ditampilkan ke pelapor. Tulis langkahnya agar bisa dijadikan artikel knowledge base.">
          <Textarea rows={5} value={solution} onChange={(e) => setSolution(e.target.value)} />
        </Field>
        <Field label="Akar masalah (opsional)">
          <Textarea rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} className="!min-h-[64px]" />
        </Field>
        {error && <p className="text-sm font-medium text-danger">{error}</p>}
      </div>
    </Modal>
  );
}

function SimpleReasonModal({
  open,
  title,
  label,
  cta,
  danger,
  optional,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  label: string;
  cta: string;
  danger?: boolean;
  optional?: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setText('');
      setError(null);
    }
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            disabled={!optional && text.trim().length < 5}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onSubmit(text.trim());
                onClose();
              } catch (e) {
                setError(errorText(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {cta}
          </Button>
        </>
      }
    >
      <Field label={label} required={!optional}>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      {error && <p className="mt-3 text-sm font-medium text-danger">{error}</p>}
    </Modal>
  );
}

'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, PauseCircle, X } from 'lucide-react';
import { PRIORITY_LABEL, STATUS_LABEL, type TicketPriority, type TicketStatus } from '@/shared';
import type { SlaSummary } from '@/lib/types';
import { fmtDateTime, fmtDuration, initials } from '@/lib/format';

// ------------------------------------------------------------------ Button

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'copper';
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 whitespace-nowrap';
const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-teal text-white hover:bg-teal-600 px-4 py-2',
  secondary: 'bg-white text-ink border border-line-strong hover:border-teal hover:text-teal px-4 py-2',
  ghost: 'text-text-muted hover:bg-paper hover:text-ink px-3 py-2',
  danger: 'bg-danger text-white hover:bg-[#912018] px-4 py-2',
  copper: 'bg-copper text-white hover:bg-copper-600 px-4 py-2',
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean; size?: 'sm' | 'md' }
>(function Button({ variant = 'primary', loading, size = 'md', className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(btnBase, btnVariants[variant], size === 'sm' && '!px-3 !py-1.5 text-xs', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export function ButtonLink({ href, variant = 'primary', className, children }: { href: string; variant?: BtnVariant; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={clsx(btnBase, btnVariants[variant], className)}>
      {children}
    </Link>
  );
}

// ------------------------------------------------------------------ Form

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-copper" aria-hidden>*</span>}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={clsx('input', className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={clsx('input min-h-[96px] leading-6', className)} {...p} />;
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) {
  return (
    <select ref={ref} className={clsx('input pr-8', className)} {...p}>
      {children}
    </select>
  );
});

// ------------------------------------------------------------------ Layout bits

export function PageHeader({ title, description, actions, back }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-teal">
          <ChevronLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Panel({ title, actions, children, className, bodyClass }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={clsx('panel', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="text-[15px] font-bold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={clsx('p-5', bodyClass)}>{children}</div>
    </section>
  );
}

export function Avatar({ name, size = 28, tone = 'teal' }: { name?: string | null; size?: number; tone?: 'teal' | 'copper' | 'ink' }) {
  const tones = { teal: 'bg-teal-50 text-teal', copper: 'bg-copper-50 text-copper-600', ink: 'bg-ink text-white' };
  return (
    <span
      className={clsx('inline-flex shrink-0 items-center justify-center rounded-full font-bold', tones[tone])}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ label = 'Memuat…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin text-teal" /> {label}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded-md bg-line/60', className)} />;
}

export function EmptyState({ icon: Icon, title, children, action }: { icon?: React.ComponentType<{ className?: string }>; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <p className="font-bold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger-50 px-4 py-3 text-sm text-danger" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{error instanceof Error ? error.message : String(error)}</div>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline">
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function KeyVal({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-text-muted">{k}</dt>
      <dd className="min-w-0 text-right font-medium text-text">{children}</dd>
    </div>
  );
}

// ------------------------------------------------------------------ Badges

export function Badge({ children, tone = 'neutral', className }: { children: React.ReactNode; tone?: 'neutral' | 'teal' | 'copper' | 'danger' | 'ok' | 'ink'; className?: string }) {
  const tones = {
    neutral: 'bg-paper text-text-muted border-line',
    teal: 'bg-teal-50 text-teal border-teal-100',
    copper: 'bg-copper-50 text-copper-600 border-copper-100',
    danger: 'bg-danger-50 text-danger border-danger-100',
    ok: 'bg-ok-50 text-ok border-[#C6EBD5]',
    ink: 'bg-ink text-white border-ink',
  };
  return <span className={clsx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>;
}

const PRIORITY_STYLE: Record<TicketPriority, string> = {
  P1: 'bg-danger text-white border-danger',
  P2: 'bg-copper-50 text-copper-600 border-copper-100',
  P3: 'bg-teal-50 text-teal border-teal-100',
  P4: 'bg-paper text-text-muted border-line',
};

export function PriorityBadge({ priority, short }: { priority: TicketPriority; short?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center whitespace-nowrap rounded-md border px-1.5 py-0.5 text-xs font-bold', PRIORITY_STYLE[priority])} title={PRIORITY_LABEL[priority]}>
      {short ? priority : PRIORITY_LABEL[priority]}
    </span>
  );
}

const STATUS_DOT: Record<TicketStatus, string> = {
  NEW: 'bg-copper',
  OPEN: 'bg-teal',
  IN_PROGRESS: 'bg-teal',
  PENDING_USER: 'bg-text-faint',
  PENDING_VENDOR: 'bg-text-faint',
  RESOLVED: 'bg-ok',
  CLOSED: 'bg-ink',
  CANCELLED: 'bg-line-strong',
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-text">
      <span className={clsx('h-2 w-2 rounded-full', STATUS_DOT[status], status === 'IN_PROGRESS' && 'ring-2 ring-teal/25')} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

// ------------------------------------------------------------------ SLA fuse (elemen khas)

const SLA_TEXT: Record<SlaSummary['state'], string> = {
  ok: 'Sesuai SLA',
  warning: 'Mendekati batas',
  overdue: 'Terlambat',
  paused: 'SLA dijeda',
  met: 'Tepat waktu',
  breached: 'Melewati SLA',
  cancelled: 'Dibatalkan',
};

/**
 * Sumbu SLA: bar tipis yang "terbakar" menuju tenggat. Warna + label teks
 * (tidak hanya mengandalkan warna, sesuai PRD 12).
 */
export function SlaFuse({ sla, compact, className }: { sla: SlaSummary; compact?: boolean; className?: string }) {
  const pct = Math.max(0, Math.min(100, sla.percent));
  const s = sla.state;
  const fill =
    s === 'overdue' || s === 'breached'
      ? 'fuse-overdue'
      : s === 'warning'
        ? 'bg-copper'
        : s === 'paused'
          ? 'bg-text-faint'
          : s === 'met'
            ? 'bg-ok'
            : s === 'cancelled'
              ? 'bg-line-strong'
              : 'bg-teal';
  const remaining =
    s === 'overdue'
      ? `lewat ${fmtDuration(-sla.remainingMinutes, sla.useBusinessHours)}`
      : s === 'ok' || s === 'warning' || s === 'paused'
        ? `sisa ${fmtDuration(sla.remainingMinutes, sla.useBusinessHours)}`
          : SLA_TEXT[s];
  return (
    <div className={clsx(compact ? 'w-32' : 'w-full', className)} title={`${SLA_TEXT[s]}, tenggat ${fmtDateTime(sla.resolutionDueAt)}`}>
      <div className="flex items-center justify-between gap-2 text-2xs font-semibold">
        <span className={clsx(s === 'overdue' || s === 'breached' ? 'text-danger' : s === 'warning' ? 'text-copper-600' : 'text-text-muted', 'inline-flex items-center gap-1')}>
          {s === 'paused' && <PauseCircle className="h-3 w-3" />}
          {s === 'met' && <CheckCircle2 className="h-3 w-3 text-ok" />}
          {compact ? remaining : SLA_TEXT[s]}
        </span>
        {!compact && <span className="text-text-muted">{remaining}</span>}
      </div>
      <div className={clsx('relative mt-1 h-1.5 overflow-hidden rounded-full bg-line/70', s === 'paused' && 'bg-[repeating-linear-gradient(90deg,#d9e2e3_0_6px,transparent_6px_9px)]')}>
        <div className={clsx('h-full rounded-full transition-[width] duration-700', fill)} style={{ width: `${s === 'overdue' || s === 'breached' || s === 'met' ? 100 : pct}%` }} />
        {(s === 'ok' || s === 'warning') && <div className="absolute inset-y-0 left-1/2 w-px bg-white/90" aria-hidden title="50%: batas eskalasi L2" />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Tabs

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: Array<{ value: T; label: string; count?: number }> }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
            value === it.value ? 'border-copper text-ink' : 'border-transparent text-text-muted hover:text-ink',
          )}
        >
          {it.label}
          {it.count !== undefined && (
            <span className={clsx('rounded-full px-1.5 text-2xs', value === it.value ? 'bg-copper-50 text-copper-600' : 'bg-paper text-text-muted')}>{it.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ meta, onPage }: { meta: { page: number; totalPages: number; total: number; pageSize: number }; onPage: (p: number) => void }) {
  if (meta.total === 0) return null;
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-text-muted">
      <span>
        {from}–{to} dari {meta.total}
      </span>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Halaman sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Halaman berikutnya">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Modal

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={clsx('w-[calc(100%-2rem)] rounded-panel border border-line p-0 text-text shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]', wide ? 'max-w-2xl' : 'max-w-lg')}
    >
      {open && (
        <div className="animate-rise">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-bold text-ink">{title}</h2>
            <button onClick={onClose} className="rounded-md p-1 text-text-muted hover:bg-paper" aria-label="Tutup">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line bg-paper/50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

// ------------------------------------------------------------------ Toast

interface Toast {
  id: number;
  text: string;
  tone: 'ok' | 'error';
}
const ToastCtx = createContext<(text: string, tone?: 'ok' | 'error') => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: 'ok' | 'error' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100%-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'pointer-events-auto flex animate-rise items-start gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg',
              t.tone === 'ok' ? 'border-ink bg-ink text-white' : 'border-danger/30 bg-danger-50 text-danger',
            )}
          >
            {t.tone === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7FD1B2]" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ------------------------------------------------------------------ Stat

export function Stat({ label, value, sub, tone, href }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: 'danger' | 'copper'; href?: string }) {
  const body = (
    <>
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className={clsx('mt-1 text-[28px] font-bold leading-none tracking-tight', tone === 'danger' ? 'text-danger' : tone === 'copper' ? 'text-copper-600' : 'text-ink')}>{value}</p>
      {sub && <p className="mt-2 text-xs text-text-muted">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className="block px-5 py-4 transition-colors hover:bg-paper/60">
      {body}
    </Link>
  ) : (
    <div className="px-5 py-4">{body}</div>
  );
}

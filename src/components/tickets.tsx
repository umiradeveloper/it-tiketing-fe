'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { MapPin, UserRound } from 'lucide-react';
import { LEVEL_LABEL } from '@/shared';
import type { TicketRow } from '@/lib/types';
import { timeAgo } from '@/lib/format';
import { PriorityBadge, SlaFuse, StatusBadge } from './ui';

/** Baris tiket ringkas untuk dashboard & daftar mobile. */
export function TicketCardRow({ t, showRequester = true }: { t: TicketRow; showRequester?: boolean }) {
  const open = !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status);
  return (
    <Link
      href={`/tickets/${t.id}`}
      className={clsx(
        'group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line/70 px-5 py-3.5 transition-colors last:border-0 hover:bg-paper/70 sm:grid-cols-[1fr_150px]',
        t.sla.state === 'overdue' && open && 'bg-danger-50/40',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={t.priority} short />
          <span className="text-xs font-semibold text-text-muted">{t.ticketNo}</span>
          {t.escalationLevel !== 'L1' && <span className="text-2xs font-semibold text-copper-600">{LEVEL_LABEL[t.escalationLevel]}</span>}
        </div>
        <p className="mt-1 truncate font-semibold text-ink group-hover:text-teal">{t.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
          <StatusBadge status={t.status} />
          {showRequester && <span>{t.requester.name}</span>}
          {t.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {t.location.name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <UserRound className="h-3 w-3" />
            {t.assignee?.name ?? <em className="not-italic text-copper-600">Belum di-assign</em>}
          </span>
          <span>{timeAgo(t.createdAt)}</span>
        </p>
      </div>
      <SlaFuse sla={t.sla} compact className="!w-full" />
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { fmtDate } from '@/lib/format';

export function BarList({ items }: { items: Array<{ label: string; value: number; href?: string; tone?: 'teal' | 'copper' | 'danger' }> }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="text-sm text-text-muted">Belum ada data.</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => {
        const bar = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-text">{i.label}</span>
              <span className="font-bold tabular-nums text-ink">{i.value}</span>
            </span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-paper">
              <span
                className={`block h-full rounded-full ${i.tone === 'danger' ? 'bg-danger' : i.tone === 'copper' ? 'bg-copper' : 'bg-teal'}`}
                style={{ width: `${(i.value / max) * 100}%` }}
              />
            </span>
          </>
        );
        return <li key={i.label}>{i.href ? <Link href={i.href} className="block hover:opacity-80">{bar}</Link> : bar}</li>;
      })}
    </ul>
  );
}

export function TrendChart({ data }: { data: Array<{ date: string; created: number; resolved: number }> }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.resolved]));
  return (
    <div>
      <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Grafik tiket masuk dan selesai per hari">
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end justify-center gap-0.5">
            <span className="w-1/2 max-w-[10px] rounded-t bg-teal" style={{ height: `${(d.created / max) * 100}%`, minHeight: d.created ? 3 : 0 }} />
            <span className="w-1/2 max-w-[10px] rounded-t bg-copper" style={{ height: `${(d.resolved / max) * 100}%`, minHeight: d.resolved ? 3 : 0 }} />
            <span className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-2xs font-semibold text-white group-hover:block">
              {fmtDate(d.date)}: {d.created} masuk, {d.resolved} selesai
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-2xs text-text-faint">
        <span>{fmtDate(data[0]?.date)}</span>
        <span>{fmtDate(data[data.length - 1]?.date)}</span>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-teal" /> Masuk
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-copper" /> Selesai
        </span>
      </div>
    </div>
  );
}

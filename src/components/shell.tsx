'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import {
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  HardDrive,
  Home,
  Inbox,
  LogOut,
  Menu,
  Plus,
  Settings2,
  UserRound,
  X,
} from 'lucide-react';
import { ROLE_LABEL } from '@/shared';
import { api, fetcher } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { Avatar } from './ui';
import { Logo } from './brand';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  badge?: number;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, can, isAgent } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const { data: queue } = useSWR<{ meta: { total: number } }>(isAgent ? '/tickets?scope=queue&assigneeId=unassigned&pageSize=1' : null, fetcher, { refreshInterval: 60_000 });

  const nav: NavItem[] = [
    { href: '/', label: 'Beranda', icon: Home, show: true },
    { href: '/tickets', label: isAgent ? 'Antrean tiket' : 'Tiket saya', icon: Inbox, show: true, badge: isAgent ? queue?.meta.total : undefined },
    { href: '/knowledge', label: 'Knowledge base', icon: BookOpen, show: true },
    { href: '/access-requests', label: 'Akses & onboarding', icon: ClipboardCheck, show: can('access.create', 'access.read.all', 'access.approve') },
    { href: '/assets', label: 'Aset & perangkat', icon: HardDrive, show: can('asset.read') },
    { href: '/reports', label: 'Laporan', icon: BarChart3, show: can('report.view') },
    { href: '/admin', label: 'Administrasi', icon: Settings2, show: can('admin.users', 'admin.config', 'audit.read') },
  ];

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link href="/" aria-label="Beranda">
          <Logo inverted />
        </Link>
      </div>
      {can('ticket.create') && (
        <div className="px-4 pb-3 pt-1">
          <Link
            href="/tickets/new"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-copper px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-copper-600"
          >
            <Plus className="h-4 w-4" /> Buat tiket
          </Link>
        </div>
      )}
      <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Navigasi utama">
        {nav
          .filter((n) => n.show)
          .map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={isActive(n.href) ? 'page' : undefined}
              className={clsx(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                isActive(n.href) ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white',
              )}
            >
              {isActive(n.href) && <span className="absolute -left-3 top-1.5 h-[calc(100%-12px)] w-1 rounded-r bg-copper" aria-hidden />}
              <n.icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{n.label}</span>
              {!!n.badge && (
                <span className="rounded-full bg-copper px-1.5 py-px text-2xs font-bold text-white" title="Belum di-assign">
                  {n.badge}
                </span>
              )}
            </Link>
          ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link href="/profile" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
          <Avatar name={user.name} size={32} tone="copper" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
            <span className="block truncate text-xs text-white/55">{user.roles.map((r) => ROLE_LABEL[r] ?? r).join(', ')}</span>
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Lewati ke konten
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-ink lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink shadow-xl">
            <button className="absolute right-3 top-4 p-1 text-white/70" onClick={() => setOpen(false)} aria-label="Tutup menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur sm:px-6 lg:px-8">
        <button className="-ml-1 rounded-md p-2 text-ink lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex-1" />
        <Notifications />
        <UserMenu />
      </header>
      <main id="main" className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  );
}

interface Notif {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
  templateCode: string;
}

function useOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && cb();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && cb();
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [ref, cb]);
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useOutside(ref, () => setOpen(false));
  const { data, mutate } = useSWR<{ data: Notif[]; meta: { unread: number } }>('/notifications', fetcher, { refreshInterval: 30_000 });
  const unread = data?.meta.unread ?? 0;

  const openNotif = async (n: Notif) => {
    if (!n.readAt) await api.post(`/notifications/${n.id}/read`);
    mutate();
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-text-muted hover:bg-white hover:text-ink"
        aria-label={`Notifikasi${unread ? `, ${unread} belum dibaca` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-[min(380px,calc(100vw-2rem))] animate-rise overflow-hidden rounded-panel border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Notifikasi</p>
            {unread > 0 && (
              <button
                className="text-xs font-semibold text-teal hover:underline"
                onClick={async () => {
                  await api.post('/notifications/read-all');
                  mutate();
                }}
              >
                Tandai semua dibaca
              </button>
            )}
          </div>
          <ul className="max-h-[420px] overflow-y-auto">
            {!data?.data.length && <li className="px-4 py-10 text-center text-sm text-text-muted">Belum ada notifikasi.</li>}
            {data?.data.map((n) => (
              <li key={n.id}>
                <button onClick={() => openNotif(n)} className={clsx('flex w-full gap-3 border-b border-line/60 px-4 py-3 text-left hover:bg-paper', !n.readAt && 'bg-teal-50/50')}>
                  <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : /SLA|P1|ESCAL/.test(n.templateCode) ? 'bg-copper' : 'bg-teal')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{n.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-text-muted">{n.body}</span>
                    <span className="mt-1 block text-2xs text-text-faint">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    location.href = '/login';
  };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-white" aria-expanded={open} aria-label="Menu akun">
        <Avatar name={user.name} size={32} />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-60 animate-rise overflow-hidden rounded-panel border border-line bg-white py-1 shadow-xl">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-paper">
            <UserRound className="h-4 w-4 text-text-muted" /> Profil & password
          </Link>
          <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-danger-50">
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      )}
    </div>
  );
}

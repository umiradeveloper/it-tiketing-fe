'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { SessionProvider } from '@/lib/session';
import type { SessionUser } from '@/lib/types';
import { AppShell } from '@/components/shell';
import { ToastProvider } from '@/components/ui';
import { Logo } from '@/components/brand';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { data, error } = useSWR<{ user: SessionUser }>('/auth/session', fetcher, { revalidateOnFocus: false, shouldRetryOnError: false });

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <p className="text-sm text-text-muted">{error ? 'Mengalihkan ke halaman login…' : 'Menyiapkan ruang kerja…'}</p>
        </div>
      </div>
    );
  }

  return (
    <SessionProvider user={data.user}>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}

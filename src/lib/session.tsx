'use client';

import { createContext, useContext } from 'react';
import useSWR from 'swr';
import { fetcher } from './api';
import type { Lookups, SessionUser } from './types';

interface SessionCtx {
  user: SessionUser;
  can: (...perms: string[]) => boolean;
  isAgent: boolean;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const can = (...perms: string[]) => perms.some((p) => user.permissions.includes(p));
  return <Ctx.Provider value={{ user, can, isAgent: can('dashboard.helpdesk') }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession di luar SessionProvider');
  return s;
}

export function useLookups() {
  return useSWR<Lookups>('/lookups', fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
}

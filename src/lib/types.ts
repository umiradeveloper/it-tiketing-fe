import type { TicketPriority, TicketStatus, TicketType, SupportLevel } from '@/shared';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  teamId: string | null;
  isExternal: boolean;
  roles: string[];
  permissions: string[];
}

export type SlaState = 'ok' | 'warning' | 'overdue' | 'paused' | 'met' | 'breached' | 'cancelled';

export interface SlaSummary {
  state: SlaState;
  percent: number;
  remainingMinutes: number;
  responseDueAt: string | null;
  resolutionDueAt: string | null;
  responseMet: boolean | null;
  useBusinessHours: boolean;
  policyLabel: string;
}

export interface Named {
  id: string;
  name: string;
}

export interface TicketRow {
  id: string;
  ticketNo: string;
  type: TicketType;
  title: string;
  priority: TicketPriority;
  status: TicketStatus;
  escalationLevel: SupportLevel;
  createdAt: string;
  updatedAt: string;
  category: Named;
  subcategory?: Named | null;
  requester: { id: string; name: string; department?: { name: string } | null };
  assignee?: Named | null;
  team?: { id: string; name: string; level: SupportLevel } | null;
  location?: { id: string; name: string; type: string } | null;
  sla: SlaSummary;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface Lookups {
  categories: Array<Named & { defaultTeamId: string | null; children: Named[] }>;
  locations: Array<Named & { type: 'HEAD_OFFICE' | 'BRANCH' | 'SITE'; code: string; projectCode: string | null }>;
  departments: Array<Named & { code: string }>;
  teams: Array<Named & { level: SupportLevel; code: string }>;
  agents: Array<Named & { teamId: string; isExternal: boolean; vendorCompany: string | null; team: { name: string; level: SupportLevel } }>;
  slaPolicies: Array<{ priority: TicketPriority; responseMinutes: number; resolutionMinutes: number; useBusinessHours: boolean; description?: string | null }>;
}

/**
 * Kontrak bersama frontend & backend: enum, label Bahasa Indonesia,
 * transisi status, dan kode permission (RBAC).
 */

export type TicketType = 'INCIDENT' | 'SERVICE_REQUEST';
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING_USER'
  | 'PENDING_VENDOR'
  | 'RESOLVED'
  | 'CLOSED'
  | 'CANCELLED';
export type ImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SupportLevel = 'L1' | 'L2' | 'L3' | 'MANAGEMENT';
export type TicketChannel = 'PORTAL' | 'EMAIL' | 'WHATSAPP' | 'PHONE' | 'WALK_IN';
export type AssetType = 'LAPTOP' | 'PC' | 'PRINTER' | 'MONITOR' | 'NETWORK' | 'PHONE' | 'SERVER' | 'OTHER';
export type AssetStatus = 'IN_STOCK' | 'ASSIGNED' | 'IN_REPAIR' | 'DAMAGED' | 'LOST' | 'DISPOSED';
export type AccessRequestType =
  | 'ONBOARDING'
  | 'MUTATION'
  | 'OFFBOARDING'
  | 'SITE_MOBILIZATION'
  | 'SITE_DEMOBILIZATION';
export type AccessRequestStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';
export type AccessItemAction =
  | 'CREATE'
  | 'GRANT'
  | 'CHANGE'
  | 'REVOKE'
  | 'DISABLE'
  | 'HANDOVER'
  | 'RETURN'
  | 'BACKUP'
  | 'OTHER';

export const TICKET_TYPE_LABEL: Record<TicketType, string> = {
  INCIDENT: 'Insiden',
  SERVICE_REQUEST: 'Service Request',
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  P1: 'P1 Kritis',
  P2: 'P2 Tinggi',
  P3: 'P3 Sedang',
  P4: 'P4 Rendah',
};

export const PRIORITY_CRITERIA: Record<TicketPriority, string> = {
  P1: 'Layanan utama mati / berdampak ke banyak user atau operasional proyek',
  P2: 'Gangguan signifikan pada satu divisi / user kunci',
  P3: 'Gangguan individu, ada solusi sementara',
  P4: 'Service request / pertanyaan',
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  NEW: 'Baru',
  OPEN: 'Terbuka',
  IN_PROGRESS: 'Dikerjakan',
  PENDING_USER: 'Menunggu User',
  PENDING_VENDOR: 'Menunggu Vendor',
  RESOLVED: 'Selesai (menunggu konfirmasi)',
  CLOSED: 'Ditutup',
  CANCELLED: 'Dibatalkan',
};

export const IMPACT_LABEL: Record<ImpactLevel, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
};

export const LEVEL_LABEL: Record<SupportLevel, string> = {
  L1: 'L1 Helpdesk',
  L2: 'L2 Spesialis IT',
  L3: 'L3 Vendor',
  MANAGEMENT: 'Manajemen IT',
};

export const CHANNEL_LABEL: Record<TicketChannel, string> = {
  PORTAL: 'Portal',
  EMAIL: 'Email',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Telepon',
  WALK_IN: 'Datang langsung',
};

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  LAPTOP: 'Laptop',
  PC: 'PC Desktop',
  PRINTER: 'Printer',
  MONITOR: 'Monitor',
  NETWORK: 'Perangkat jaringan',
  PHONE: 'Ponsel / Tablet',
  SERVER: 'Server',
  OTHER: 'Lainnya',
};

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  IN_STOCK: 'Stok',
  ASSIGNED: 'Dipakai',
  IN_REPAIR: 'Perbaikan',
  DAMAGED: 'Rusak',
  LOST: 'Hilang',
  DISPOSED: 'Disposal',
};

export const ACCESS_TYPE_LABEL: Record<AccessRequestType, string> = {
  ONBOARDING: 'Onboarding',
  MUTATION: 'Mutasi',
  OFFBOARDING: 'Offboarding',
  SITE_MOBILIZATION: 'Mobilisasi site',
  SITE_DEMOBILIZATION: 'Demobilisasi site',
};

export const ACCESS_STATUS_LABEL: Record<AccessRequestStatus, string> = {
  PENDING_APPROVAL: 'Menunggu persetujuan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  IN_PROGRESS: 'Diproses IT',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

export const ACCESS_ACTION_LABEL: Record<AccessItemAction, string> = {
  CREATE: 'Buat',
  GRANT: 'Beri akses',
  CHANGE: 'Ubah',
  REVOKE: 'Cabut',
  DISABLE: 'Nonaktifkan',
  HANDOVER: 'Serah terima',
  RETURN: 'Pengembalian',
  BACKUP: 'Backup / serah data',
  OTHER: 'Lainnya',
};

/** Status yang dianggap "terbuka" (masih membutuhkan tindakan IT). */
export const OPEN_STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'PENDING_USER',
  'PENDING_VENDOR',
];

/** Status yang menghentikan sementara jam SLA bila kebijakan pause aktif. */
export const PAUSE_STATUSES: TicketStatus[] = ['PENDING_USER', 'PENDING_VENDOR'];

/**
 * Transisi status yang boleh dilakukan petugas (agent) lewat PATCH status.
 * RESOLVED hanya lewat endpoint /resolve (wajib catatan solusi);
 * CLOSED hanya lewat /close atau konfirmasi requester.
 */
export const AGENT_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ['OPEN', 'IN_PROGRESS', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'PENDING_USER', 'PENDING_VENDOR', 'CANCELLED'],
  IN_PROGRESS: ['PENDING_USER', 'PENDING_VENDOR', 'OPEN'],
  PENDING_USER: ['IN_PROGRESS', 'OPEN'],
  PENDING_VENDOR: ['IN_PROGRESS', 'OPEN'],
  RESOLVED: ['IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: [],
};

/** Default SLA dari SOP UMR-IT-04 (menit). Nilai final dikonfigurasi admin. */
export const DEFAULT_SLA: Record<
  TicketPriority,
  { responseMinutes: number; resolutionMinutes: number; useBusinessHours: boolean; label: string }
> = {
  P1: { responseMinutes: 15, resolutionMinutes: 4 * 60, useBusinessHours: false, label: '15 menit / 4 jam' },
  P2: { responseMinutes: 30, resolutionMinutes: 8 * 60, useBusinessHours: true, label: '30 menit / 8 jam' },
  P3: { responseMinutes: 2 * 60, resolutionMinutes: 2 * 9 * 60, useBusinessHours: true, label: '2 jam / 2 hari kerja' },
  P4: { responseMinutes: 9 * 60, resolutionMinutes: 5 * 9 * 60, useBusinessHours: true, label: '1 hari kerja / 5 hari kerja' },
};

/** Matriks dampak × urgensi → saran prioritas (prioritas final ditetapkan L1). */
export function suggestPriority(impact: ImpactLevel, urgency: ImpactLevel): TicketPriority {
  const score = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  const s = score[impact] + score[urgency];
  if (s >= 6) return 'P1';
  if (s === 5) return 'P2';
  if (s >= 3) return 'P3';
  return 'P4';
}

export const PERMISSIONS = {
  TICKET_CREATE: 'ticket.create',
  TICKET_READ_OWN: 'ticket.read.own',
  TICKET_READ_ASSIGNED: 'ticket.read.assigned',
  TICKET_READ_ALL: 'ticket.read.all',
  TICKET_UPDATE: 'ticket.update',
  TICKET_ASSIGN: 'ticket.assign',
  TICKET_ESCALATE: 'ticket.escalate',
  TICKET_RESOLVE: 'ticket.resolve',
  TICKET_CLOSE: 'ticket.close',
  TICKET_COMMENT_INTERNAL: 'ticket.comment.internal',
  KB_READ_INTERNAL: 'kb.read.internal',
  KB_MANAGE: 'kb.manage',
  ASSET_READ: 'asset.read',
  ASSET_MANAGE: 'asset.manage',
  ACCESS_CREATE: 'access.create',
  ACCESS_READ_ALL: 'access.read.all',
  ACCESS_APPROVE: 'access.approve',
  ACCESS_FULFILL: 'access.fulfill',
  DASHBOARD_HELPDESK: 'dashboard.helpdesk',
  REPORT_VIEW: 'report.view',
  ADMIN_USERS: 'admin.users',
  ADMIN_CONFIG: 'admin.config',
  AUDIT_READ: 'audit.read',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_LABEL: Record<string, string> = {
  REQUESTER: 'Karyawan',
  HELPDESK_L1: 'Helpdesk L1',
  SPECIALIST_L2: 'Spesialis IT L2',
  VENDOR_L3: 'Vendor / L3',
  IT_MANAGER: 'Kepala Divisi IT',
  HR: 'HR',
  ADMIN: 'Admin Sistem',
};

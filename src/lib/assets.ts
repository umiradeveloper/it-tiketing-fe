import type { AccessRequestStatus, AssetStatus, AssetType } from '@/shared';

export interface AssetRow {
  id: string;
  assetTag: string;
  serialNumber: string | null;
  type: AssetType;
  brand: string;
  model: string;
  status: AssetStatus;
  warrantyUntil: string | null;
  assignedUser: { id: string; name: string } | null;
  location: { id: string; name: string } | null;
  maintenances: Array<{ id: string; plannedAt: string }>;
}

export const ASSET_TONE: Record<AssetStatus, 'teal' | 'neutral' | 'copper' | 'danger' | 'ink'> = {
  ASSIGNED: 'teal',
  IN_STOCK: 'neutral',
  IN_REPAIR: 'copper',
  DAMAGED: 'danger',
  LOST: 'danger',
  DISPOSED: 'ink',
};


export const ACCESS_TONE: Record<AccessRequestStatus, 'copper' | 'teal' | 'danger' | 'ok' | 'neutral'> = {
  PENDING_APPROVAL: 'copper',
  APPROVED: 'teal',
  IN_PROGRESS: 'teal',
  REJECTED: 'danger',
  COMPLETED: 'ok',
  CANCELLED: 'neutral',
};


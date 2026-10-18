import type { User, UserRole } from '../types/api';

export type Permission =
  | 'createCase'
  | 'editCase'
  | 'archiveCase'
  | 'uploadEvidence'
  | 'editEvidence'
  | 'archiveEvidence'
  | 'restoreEvidence'
  | 'generateReport'
  | 'analyzeEvidence'
  | 'addNote'
  | 'verifyIntegrity'
  | 'manageUsers'
  | 'viewReports'
  | 'viewAnalysis'
  | 'viewArchive'
  | 'viewTimeline';

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    'createCase',
    'editCase',
    'archiveCase',
    'uploadEvidence',
    'editEvidence',
    'archiveEvidence',
    'restoreEvidence',
    'generateReport',
    'analyzeEvidence',
    'addNote',
    'verifyIntegrity',
    'manageUsers',
    'viewReports',
    'viewAnalysis',
    'viewArchive',
    'viewTimeline'
  ],
  investigator: [
    'createCase',
    'editCase',
    'archiveCase',
    'uploadEvidence',
    'editEvidence',
    'archiveEvidence',
    'generateReport',
    'analyzeEvidence',
    'addNote',
    'verifyIntegrity',
    'viewReports',
    'viewAnalysis',
    'viewTimeline'
  ],
  auditor: ['viewReports', 'viewAnalysis', 'viewArchive', 'viewTimeline'],
  viewer: []
};

export function roleOf(user?: User | null): UserRole {
  const role = user?.role;
  return role === 'admin' || role === 'investigator' || role === 'auditor' || role === 'viewer'
    ? role
    : 'viewer';
}

export function can(user: User | null | undefined, permission: Permission): boolean {
  return rolePermissions[roleOf(user)].includes(permission);
}

export function hasAny(user: User | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(user, permission));
}

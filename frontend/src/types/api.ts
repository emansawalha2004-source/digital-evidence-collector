export type EntityRef<T = unknown> = string | T | null | undefined;

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginatedMeta;
  message?: string;
  details?: unknown;
}

export interface ListResponse<T> {
  data: T[];
  meta?: PaginatedMeta;
}

export type UserRole = "admin" | "investigator" | "viewer" | "auditor";

export interface User {
  _id: string;
  fullName?: string;
  name?: string;
  email?: string;
  role?: UserRole | string;
  isActive?: boolean;
  lastLoginAt?: string | null;
  mfaEnabled?: boolean;
  mfaEnabledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CaseStatus = "open" | "in_review" | "closed" | "archived";
export type Priority = "low" | "medium" | "high" | "critical";

export interface Case {
  _id: string;
  title: string;
  description?: string;
  status: CaseStatus;
  priority: Priority;
  tags?: string[];
  createdBy?: EntityRef<User>;
  owner?: EntityRef<User>;
  assignedTo?: EntityRef<User>;
  assignedUsers?: EntityRef<User>[];
  evidenceCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type EvidenceStatus = "active" | "archived" | "deleted";

export type EvidenceType =
  | "file"
  | "text"
  | "link"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "other";

export type EvidenceInputMode = "file" | "text" | "link";

export interface EvidenceFile {
  originalName?: string;
  storedName?: string;
  filename?: string;
  relativePath?: string;
  path?: string;
  mimeType?: string;
  size?: number;
  sha256?: string;
  uploadedAt?: string;
}

export interface EvidenceNote {
  _id?: string;
  text?: string;
  content?: string;
  body?: string;
  createdBy?: EntityRef<User>;
  author?: EntityRef<User>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Evidence {
  _id: string;
  title: string;
  description?: string;
  evidenceType: EvidenceType;
  type?: EvidenceType;
  status: EvidenceStatus;
  priority: Priority;
  tags?: string[];
  caseId?: EntityRef<Case>;
  uploadedBy?: EntityRef<User>;
  content?: string;
  url?: string;
  file?: EvidenceFile;
  files?: EvidenceFile[];
  sha256?: string;
  notes?: EvidenceNote[];
  previousVersions?: Evidence[];
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string;
}

export interface EvidenceStats {
  totalEvidence?: number;
  activeEvidence?: number;
  archivedEvidence?: number;
  deletedEvidence?: number;
  evidenceByType?: Array<{
    type: EvidenceType | string;
    count: number;
  }>;
  evidenceByPriority?: Array<{
    priority: Priority | string;
    count: number;
  }>;
}

export interface VerifyIntegrityResult {
  evidenceId?: string;
  evidenceType?: EvidenceType;
  storedSha256?: string;
  currentSha256?: string;
  matches?: boolean;

  matched?: boolean;
  expectedHash?: string;
  actualHash?: string;
  sha256?: string;
  message?: string;
}

export interface AuditLog {
  _id: string;
  action: string;
  actorId?: EntityRef<User>;
  caseId?: EntityRef<Case>;
  evidenceId?: EntityRef<Evidence>;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalysisIndicator {
  key: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface AnalysisResult {
  _id: string;
  evidenceId?: EntityRef<Evidence>;
  caseId?: EntityRef<Case>;
  requestedBy?: EntityRef<User>;
  analysisType: "text" | "link" | "file" | "evidence";
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  indicators: AnalysisIndicator[];
  summary: string;
  recommendation: string;
  rawInput?: unknown;
  createdAt?: string;
}

export interface ReportItem {
  reportName: string;
  relativePath?: string;
  downloadUrl: string;
  size?: number;
  createdAt?: string;
}

export interface DashboardData {
  totalCases?: number;
  openCases?: number;
  totalEvidence?: number;
  activeEvidence?: number;
  archivedEvidence?: number;
  evidenceByType?:
    | Record<string, number>
    | Array<{
        type: EvidenceType | string;
        count: number;
      }>;
  evidenceByPriority?:
    | Record<string, number>
    | Array<{
        priority: Priority | string;
        count: number;
      }>;
  recentEvidence?: Evidence[];
  recentTimeline?: AuditLog[];
}
import { apiClient, type QueryParams } from "./client";
import type { AuditLog, ListResponse } from "../types/api";

export interface TimelineFilters extends QueryParams {
  action?: string;
  caseId?: string;
  evidenceId?: string;
}

export const timelineApi = {
  getTimeline(filters?: TimelineFilters): Promise<ListResponse<AuditLog>> {
    return apiClient.getList<AuditLog>("/timeline", filters);
  },

  getEvidenceTimeline(evidenceId: string): Promise<ListResponse<AuditLog>> {
    return apiClient.getList<AuditLog>(`/timeline/evidence/${evidenceId}`);
  },

  getCaseTimeline(caseId: string): Promise<ListResponse<AuditLog>> {
    return apiClient.getList<AuditLog>(`/timeline/case/${caseId}`);
  }
};
import { apiClient, type QueryParams } from "./client";
import type { Case, Evidence, AuditLog, ListResponse } from "../types/api";

export interface CaseFilters extends QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
}

export interface CasePayload {
  title: string;
  description?: string;
  status?: string;
  tags?: string[];
}

export interface CaseStats {
  totalEvidence?: number;
  activeEvidence?: number;
  archivedEvidence?: number;
  evidenceByType?: Record<string, number>;
  evidenceByPriority?: Record<string, number>;
  timelineCount?: number;
}

export const casesApi = {
  getCases(filters?: CaseFilters): Promise<ListResponse<Case>> {
    return apiClient.getList<Case>("/cases", filters);
  },

  getCase(id: string): Promise<Case> {
    return apiClient.get<Case>(`/cases/${id}`);
  },

  createCase(payload: CasePayload): Promise<Case> {
    return apiClient.post<Case>("/cases", payload);
  },

  updateCase(id: string, payload: Partial<CasePayload>): Promise<Case> {
    return apiClient.put<Case>(`/cases/${id}`, payload);
  },

  deleteCase(id: string): Promise<{ deleted?: boolean; message?: string }> {
    return apiClient.delete<{ deleted?: boolean; message?: string }>(
      `/cases/${id}`
    );
  },

  getCaseEvidence(id: string): Promise<ListResponse<Evidence>> {
    return apiClient.getList<Evidence>(`/cases/${id}/evidence`);
  },

  getCaseTimeline(id: string): Promise<ListResponse<AuditLog>> {
    return apiClient.getList<AuditLog>(`/cases/${id}/timeline`);
  },

  getCaseStats(id: string): Promise<CaseStats> {
    return apiClient.get<CaseStats>(`/cases/${id}/stats`);
  }
};
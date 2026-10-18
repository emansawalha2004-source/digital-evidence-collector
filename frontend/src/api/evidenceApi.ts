import { apiClient, type QueryParams } from "./client";
import type {
  Evidence,
  EvidenceStats,
  EvidenceType,
  ListResponse,
  Priority,
  VerifyIntegrityResult
} from "../types/api";

export interface EvidenceFilters extends QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  caseId?: string;
  status?: string;
  type?: EvidenceType | string;
  evidenceType?: EvidenceType | string;
  priority?: Priority | string;
  tag?: string;
}

export interface EvidencePayload {
  caseId: string;
  title: string;
  description?: string;
  evidenceType: "text" | "link";
  tags?: string[];
  content: string;
}

export interface EvidenceFilePayload {
  caseId: string;
  title: string;
  description?: string;
  evidenceType?: EvidenceType | string;
  tags?: string[];
  content?: string;
  file: File;
}

export interface EvidenceUpdatePayload {
  title?: string;
  description?: string;
  status?: string;
  tags?: string[];
  content?: string;
}

export interface EvidenceNotePayload {
  text: string;
}

function normalizeTags(tags?: string[] | string): string {
  if (!tags) return "";

  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .join(",");
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(",");
}

function appendOptional(formData: FormData, key: string, value?: string | number | null): void {
  if (value === undefined || value === null) return;
  const normalized = String(value).trim();
  if (!normalized) return;
  formData.append(key, normalized);
}

export function buildEvidenceFormData(payload: EvidenceFilePayload): FormData {
  const formData = new FormData();

  formData.append("caseId", payload.caseId);
  formData.append("title", payload.title.trim());
  formData.append("file", payload.file);

  appendOptional(formData, "description", payload.description);
  appendOptional(formData, "evidenceType", payload.evidenceType);
  appendOptional(formData, "content", payload.content);

  const tags = normalizeTags(payload.tags);
  if (tags) {
    formData.append("tags", tags);
  }

  return formData;
}

export const evidenceApi = {
  getEvidence(filters?: EvidenceFilters): Promise<ListResponse<Evidence>> {
    return apiClient.getList<Evidence>("/evidence", filters);
  },

  getEvidenceStats(): Promise<EvidenceStats> {
    return apiClient.get<EvidenceStats>("/evidence/stats");
  },

  getArchivedEvidence(filters?: EvidenceFilters): Promise<ListResponse<Evidence>> {
    return apiClient.getList<Evidence>("/evidence/archived", filters);
  },

  getEvidenceById(id: string): Promise<Evidence> {
    return apiClient.get<Evidence>(`/evidence/${id}`);
  },

  createEvidence(payload: EvidencePayload): Promise<Evidence> {
    return apiClient.post<Evidence>("/evidence", {
      ...payload,
      title: payload.title.trim(),
      description: payload.description?.trim() || "",
      content: payload.content.trim(),
      tags: payload.tags || []
    });
  },

  uploadEvidence(formData: FormData): Promise<Evidence> {
    return apiClient.postFormData<Evidence>("/evidence/upload", formData);
  },

  uploadEvidenceFile(payload: EvidenceFilePayload): Promise<Evidence> {
    return apiClient.postFormData<Evidence>(
      "/evidence/upload",
      buildEvidenceFormData(payload)
    );
  },

  updateEvidence(id: string, payload: EvidenceUpdatePayload): Promise<Evidence> {
    return apiClient.put<Evidence>(`/evidence/${id}`, {
      ...payload,
      title: payload.title?.trim(),
      description: payload.description?.trim(),
      content: payload.content?.trim(),
      tags: payload.tags || undefined
    });
  },

  archiveEvidence(id: string): Promise<Evidence> {
    return apiClient.delete<Evidence>(`/evidence/${id}`);
  },

  restoreEvidence(id: string): Promise<Evidence> {
    return apiClient.put<Evidence>(`/evidence/${id}/restore`);
  },

  addNote(id: string, payload: EvidenceNotePayload): Promise<Evidence> {
    return apiClient.post<Evidence>(`/evidence/${id}/notes`, {
      text: payload.text.trim()
    });
  },

  verifyIntegrity(id: string): Promise<VerifyIntegrityResult> {
    return apiClient.post<VerifyIntegrityResult>(
      `/evidence/${id}/verify-integrity`
    );
  },

  async previewEvidence(id: string): Promise<void> {
    const blob = await apiClient.getBlob(`/evidence/${id}/preview`);
    apiClient.openBlobInNewTab(blob);
  },

  async downloadEvidence(id: string, filename?: string): Promise<void> {
    const safeFilename = filename?.trim() || "evidence-file";
    const blob = await apiClient.getBlob(`/evidence/${id}/download`);
    apiClient.downloadBlob(blob, safeFilename);
  }
};
export type { VerifyIntegrityResult };

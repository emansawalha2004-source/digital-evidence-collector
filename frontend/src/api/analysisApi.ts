import { apiClient } from './client';
import type { AnalysisResult } from '../types/api';

export const analysisApi = {
  analyzeText(text: string): Promise<AnalysisResult> { return apiClient.post<AnalysisResult>('/analysis/text', { text }); },
  analyzeLink(url: string): Promise<AnalysisResult> { return apiClient.post<AnalysisResult>('/analysis/link', { url }); },
  analyzeEvidence(id: string): Promise<AnalysisResult> { return apiClient.post<AnalysisResult>(`/analysis/evidence/${id}`); },
  getEvidenceHistory(id: string): Promise<AnalysisResult[]> { return apiClient.get<AnalysisResult[]>(`/analysis/evidence/${id}/history`); },
};

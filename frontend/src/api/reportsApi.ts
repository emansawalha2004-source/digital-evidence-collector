import { apiClient } from "./client";
import type { ReportItem } from "../types/api";

function getSafeReportName(report: ReportItem): string {
  const name = String(report.reportName || "").trim();

  if (!name) return "report.pdf";
  if (!name.toLowerCase().endsWith(".pdf")) return `${name}.pdf`;

  return name;
}

function getDownloadPath(report: ReportItem): string {
  const reportName = getSafeReportName(report);

  if (report.downloadUrl) {
    try {
      const url = new URL(report.downloadUrl, window.location.origin);
      return url.pathname.replace(/^\/api/, "") + url.search;
    } catch {
      // fallback below
    }
  }

  return `/reports/download/${encodeURIComponent(reportName)}`;
}

export const reportsApi = {
  list(): Promise<ReportItem[]> {
    return apiClient.get<ReportItem[]>("/reports");
  },

  generateEvidenceReport(id: string): Promise<ReportItem> {
    return apiClient.post<ReportItem>(`/reports/evidence/${id}`);
  },

  generateCaseReport(id: string): Promise<ReportItem> {
    return apiClient.post<ReportItem>(`/reports/case/${id}`);
  },

  async download(report: ReportItem): Promise<void> {
    const filename = getSafeReportName(report);
    const path = getDownloadPath(report);

    const blob = await apiClient.getBlob(path);
    apiClient.downloadBlob(blob, filename);
  },

  async downloadByName(reportName: string): Promise<void> {
    const filename = reportName.toLowerCase().endsWith(".pdf")
      ? reportName
      : `${reportName}.pdf`;

    const blob = await apiClient.getBlob(
      `/reports/download/${encodeURIComponent(filename)}`
    );

    apiClient.downloadBlob(blob, filename);
  }
};
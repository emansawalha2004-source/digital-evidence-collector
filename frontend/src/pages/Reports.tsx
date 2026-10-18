import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Download,
  FileText,
  FolderKanban,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { reportsApi } from "../api/reportsApi";
import { casesApi } from "../api/casesApi";
import { evidenceApi } from "../api/evidenceApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Loader } from "../components/common/Loader";
import { Select } from "../components/common/Select";
import { PageHeader } from "../components/layout/PageHeader";
import type { Case, Evidence, ReportItem } from "../types/api";
import {
  formatDate,
  formatFileSize,
  getIdFromRef
} from "../utils/formatters";
import {
  getEvidenceDisplayType,
  getEvidenceTypeLabel
} from "../utils/fileHelpers";
import { isMongoObjectId, safeMongoObjectId } from "../utils/objectId";

export function Reports() {
  const [searchParams] = useSearchParams();

  const [cases, setCases] = useState<Case[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const [caseId, setCaseId] = useState(safeMongoObjectId(searchParams.get("caseId")));
  const [evidenceId, setEvidenceId] = useState(
    safeMongoObjectId(searchParams.get("evidenceId"))
  );

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "case" | "evidence" | "download" | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const caseOptions = useMemo(
    () =>
      cases.map((item) => ({
        value: item._id,
        label: `${item.title} · ${item.status} · ${item.priority}`
      })),
    [cases]
  );

  const evidenceForSelectedCase = useMemo(() => {
    if (!caseId) return evidence;

    return evidence.filter((item) => getIdFromRef(item.caseId) === caseId);
  }, [evidence, caseId]);

  const evidenceOptions = useMemo(
    () =>
      evidenceForSelectedCase.map((item) => {
        const type = getEvidenceDisplayType(item);

        return {
          value: item._id,
          label: `${item.title} · ${getEvidenceTypeLabel(type)} · ${item.priority}`
        };
      }),
    [evidenceForSelectedCase]
  );

  const selectedCase = useMemo(
    () => cases.find((item) => item._id === caseId) || null,
    [cases, caseId]
  );

  const selectedEvidence = useMemo(
    () => evidence.find((item) => item._id === evidenceId) || null,
    [evidence, evidenceId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [caseResult, evidenceResult, reportResult] = await Promise.all([
        casesApi.getCases({ limit: 250 }),
        evidenceApi.getEvidence({ limit: 250 }),
        reportsApi.list()
      ]);

      setCases(caseResult.data);
      setEvidence(evidenceResult.data);
      setReports(reportResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل التقارير.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!caseId || !evidenceId) return;

    const evidenceCaseId = getIdFromRef(selectedEvidence?.caseId);

    if (selectedEvidence && evidenceCaseId && evidenceCaseId !== caseId) {
      setEvidenceId("");
    }
  }, [caseId, evidenceId, selectedEvidence]);

  async function generateCase() {
    if (!caseId || !isMongoObjectId(caseId) || !selectedCase) {
      setError("اختر بلاغ صحيحاً من القائمة.");
      return;
    }

    setActionLoading("case");
    setError(null);
    setMessage(null);

    try {
      const report = await reportsApi.generateCaseReport(caseId);
      setMessage(`تم توليد تقرير البلاغ الرسمي: ${report.reportName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل توليد تقرير البلاغ.");
    } finally {
      setActionLoading(null);
    }
  }

  async function generateEvidence() {
    if (!evidenceId || !isMongoObjectId(evidenceId) || !selectedEvidence) {
      setError("اختر دليلاً صحيحاً من القائمة.");
      return;
    }

    setActionLoading("evidence");
    setError(null);
    setMessage(null);

    try {
      const report = await reportsApi.generateEvidenceReport(evidenceId);
      setMessage(`تم توليد تقرير الدليل الرسمي: ${report.reportName}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل توليد تقرير الدليل.");
    } finally {
      setActionLoading(null);
    }
  }

  async function downloadReport(report: ReportItem) {
    setActionLoading("download");
    setError(null);

    try {
      await reportsApi.download(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل التقرير.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <Loader label="جاري تحميل التقارير..." />;
  }

  if (error && !reports.length && !cases.length && !evidence.length) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="التقارير الرسمية"
        description="توليد تقارير PDF رسمية للمستخدم تشمل الأدلة، التحليل، Hash، وTimeline زمني كامل للبلاغ  أو الدليل."
        actions={
          <Button
            variant="secondary"
            onClick={load}
            disabled={Boolean(actionLoading)}
          >
            <RefreshCw size={16} />
            تحديث
          </Button>
        }
      />

      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert success">{message}</div> : null}

      <div className="two-columns">
        <Card>
          <CardHeader>
            <h2 className="inline-title">
              <FolderKanban size={18} />
              تقرير بلاغ
            </h2>
          </CardHeader>

          <CardBody>
            <div className="form-stack">
              <Select
                label="البلاغ"
                value={caseId}
                onChange={(event) => setCaseId(event.target.value)}
                options={caseOptions}
                placeholder="اختر بلاغ"
              />

              {selectedCase ? (
                <div className="details-grid">
                  <span>الحالة</span>
                  <strong>
                    <Badge>{selectedCase.status}</Badge>
                  </strong>

                  <span>الأولوية</span>
                  <strong>
                    <Badge>{selectedCase.priority}</Badge>
                  </strong>

                  <span>عدد الأدلة</span>
                  <strong>{evidenceForSelectedCase.length}</strong>
                </div>
              ) : null}

              <Button
                onClick={generateCase}
                disabled={actionLoading !== null || !caseId}
              >
                <FileText size={16} />
                {actionLoading === "case"
                  ? "جاري توليد التقرير..."
                  : "توليد تقرير البلاغ PDF"}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="inline-title">
              <ShieldCheck size={18} />
              تقرير دليل
            </h2>
          </CardHeader>

          <CardBody>
            <div className="form-stack">
              <Select
                label="الدليل"
                value={evidenceId}
                onChange={(event) => setEvidenceId(event.target.value)}
                options={evidenceOptions}
                placeholder={
                  caseId
                    ? "اختر دليلاً من البلاغ المحددة"
                    : "اختر دليلاً"
                }
              />

              {selectedEvidence ? (
                <div className="details-grid">
                  <span>النوع</span>
                  <strong>
                    <Badge>
                      {getEvidenceTypeLabel(
                        getEvidenceDisplayType(selectedEvidence)
                      )}
                    </Badge>
                  </strong>

                  <span>الحالة</span>
                  <strong>
                    <Badge>{selectedEvidence.status}</Badge>
                  </strong>

                  <span>الأولوية</span>
                  <strong>
                    <Badge>{selectedEvidence.priority}</Badge>
                  </strong>
                </div>
              ) : null}

              <Button
                onClick={generateEvidence}
                disabled={actionLoading !== null || !evidenceId}
              >
                <FileText size={16} />
                {actionLoading === "evidence"
                  ? "جاري توليد التقرير..."
                  : "توليد تقرير الدليل PDF"}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2>التقارير المولدة</h2>
        </CardHeader>

        <CardBody>
          {reports.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>اسم التقرير</th>
                    <th>تاريخ الإنشاء</th>
                    <th>الحجم</th>
                    <th>الرابط</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>

                <tbody>
                  {reports.map((report) => (
                    <tr key={report.reportName}>
                      <td className="mono">{report.reportName}</td>

                      <td>{formatDate(report.createdAt)}</td>

                      <td>{formatFileSize(report.size)}</td>

                      <td>
                        <a href={report.downloadUrl ? `http://localhost:5000${report.downloadUrl}` : "#"} className="table-link" target="_blank" rel="noopener noreferrer">
                          فتح
                        </a>
                      </td>

                      <td>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionLoading === "download"}
                          onClick={() => void downloadReport(report)}
                        >
                          <Download size={14} />
                          تحميل
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="لا توجد تقارير مولدة"
              description="اختر بلاغ أو دليل ثم اضغط توليد تقرير PDF."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
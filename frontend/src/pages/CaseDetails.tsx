import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FileText, Upload } from "lucide-react";
import { casesApi, type CaseStats } from "../api/casesApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Loader } from "../components/common/Loader";
import { PageHeader } from "../components/layout/PageHeader";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";
import type { AuditLog, Case, Evidence, ListResponse } from "../types/api";
import {
  formatDate,
  formatLabel,
  getEvidenceLabel,
  shortenHash
} from "../utils/formatters";
import { isMongoObjectId } from "../utils/objectId";

export function CaseDetails() {
  const { id } = useParams<{ id: string }>();
  const invalidCaseId = !isMongoObjectId(id);
  const { user } = useAuth();
  const canGenerateReport = can(user, "generateReport");
  const canUploadEvidence = can(user, "uploadEvidence");
  const canViewTimeline = can(user, "viewTimeline");

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [evidence, setEvidence] = useState<ListResponse<Evidence>>({ data: [] });
  const [timeline, setTimeline] = useState<ListResponse<AuditLog>>({ data: [] });
  const [stats, setStats] = useState<CaseStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCaseDetails = useCallback(async () => {
    if (!id || invalidCaseId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [caseResult, evidenceResult, statsResult] =
        await Promise.all([
          casesApi.getCase(id),
          casesApi.getCaseEvidence(id),
          casesApi.getCaseStats(id)
        ]);
      const timelineResult = canViewTimeline ? await casesApi.getCaseTimeline(id) : { data: [] };

      setCaseData(caseResult);
      setEvidence(evidenceResult);
      setTimeline(timelineResult);
      setStats(statsResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "فشل تحميل تفاصيل القضية."
      );
    } finally {
      setLoading(false);
    }
  }, [id, invalidCaseId, canViewTimeline]);

  useEffect(() => {
    void loadCaseDetails();
  }, [loadCaseDetails]);

  if (invalidCaseId) {
    return <Navigate to="/cases" replace />;
  }

  if (loading) {
    return <Loader label="جاري تحميل تفاصيل البلاغ..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadCaseDetails} />;
  }

  if (!caseData) {
    return (
      <EmptyState
        title="البلاغ غير موجود"
        description="البلاغ المحددة غير موجود أو تمت إزالتها."
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={caseData.title}
        description={caseData.description || "Investigation case details."}
        actions={
          <div className="action-row">
            {canGenerateReport ? (
              <Link to={`/reports?caseId=${caseData._id}`}>
                <Button variant="secondary">
                  <FileText size={16} />
                  Generate Report
                </Button>
              </Link>
            ) : null}
            {canUploadEvidence ? (
              <Link to={`/upload?caseId=${caseData._id}`}>
                <Button>
                  <Upload size={16} />
                  Upload Evidence
                </Button>
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="grid-2">
        <Card>
          <CardHeader>
            <h2>معلومات البلاغ</h2>
          </CardHeader>

          <CardBody>
            <div className="details-grid">
              <span>الحالة</span>
              <strong>
                <Badge>{formatLabel(caseData.status)}</Badge>
              </strong>

              <span>الأولوية</span>
              <strong>
                <Badge>{formatLabel(caseData.priority)}</Badge>
              </strong>

              <span>تاريخ الإنشاء</span>
              <strong>{formatDate(caseData.createdAt)}</strong>

              <span>آخر تحديث</span>
              <strong>{formatDate(caseData.updatedAt)}</strong>
            </div>

            {caseData.tags?.length ? (
              <div className="tag-row spaced">
                {caseData.tags.map((tag) => (
                  <span className="tag" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2>إحصائيات البلاغ</h2>
          </CardHeader>

          <CardBody>
            <div className="metric-list">
              <div className="metric-row">
                <span>إجمالي الأدلة</span>
                <strong>{stats?.totalEvidence ?? 0}</strong>
              </div>
              <div className="metric-row">
                <span>الأدلة النشطة</span>
                <strong>{stats?.activeEvidence ?? 0}</strong>
              </div>
              <div className="metric-row">
                <span>الأدلة المؤرشفة</span>
                <strong>{stats?.archivedEvidence ?? 0}</strong>
              </div>
              <div className="metric-row">
                <span>أحداث السجل</span>
                <strong>{stats?.timelineCount ?? 0}</strong>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2>الأدلة</h2>
        </CardHeader>

        <CardBody>
          {evidence.data.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>العنوان</th>
                    <th>النوع</th>
                    <th>الحالة</th>
                    <th>الأولوية</th>
                    <th>SHA-256</th>
                    <th>تاريخ الإنشاء</th>
                  </tr>
                </thead>

                <tbody>
                  {evidence.data.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <Link to={`/evidence/${item._id}`} className="table-link">
                          {item.title}
                        </Link>
                      </td>
                      <td>
                        <Badge>{formatLabel(item.evidenceType || item.type)}</Badge>
                      </td>
                      <td>
                        <Badge>{formatLabel(item.status)}</Badge>
                      </td>
                      <td>
                        <Badge>{formatLabel(item.priority)}</Badge>
                      </td>
                      <td className="mono">
                        {shortenHash(item.sha256 || item.file?.sha256)}
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="لا توجد أدلة مرتبطة"
              description="ارفع أدلة لهذا البلاغ لبدء بناء السجل."
              action={canUploadEvidence ? (
                <Link to={`/upload?caseId=${caseData._id}`}>
                  <Button>رفع دليل</Button>
                </Link>
              ) : undefined}
            />
          )}
        </CardBody>
      </Card>

      {canViewTimeline ? (
        <Card>
          <CardHeader>
            <h2>سجل البلاغ الزمني</h2>
          </CardHeader>

          <CardBody>
            {timeline.data.length ? (
              <div className="timeline-list">
                {timeline.data.map((item) => (
                  <article className="timeline-item" key={item._id}>
                    <div>
                      <Badge>{formatLabel(item.action)}</Badge>
                      <h3>{item.message || getEvidenceLabel(item.evidenceId)}</h3>
                      <p>Evidence: {getEvidenceLabel(item.evidenceId)}</p>
                    </div>
                    <time>{formatDate(item.createdAt)}</time>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد أحداث"
                description="ستظهر نشاطات البلاغ هنا."
              />
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
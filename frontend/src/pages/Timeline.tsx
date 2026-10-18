import { useCallback, useEffect, useMemo, useState } from "react";
import { timelineApi } from "../api/timelineApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Input } from "../components/common/Input";
import { Loader } from "../components/common/Loader";
import { Select } from "../components/common/Select";
import { PageHeader } from "../components/layout/PageHeader";
import type { AuditLog } from "../types/api";
import { AUDIT_ACTIONS } from "../utils/constants";
import {
  formatDate,
  formatLabel,
  getCaseLabel,
  getEvidenceLabel,
  getUserLabel
} from "../utils/formatters";

export function Timeline() {
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [action, setAction] = useState("");
  const [caseId, setCaseId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await timelineApi.getTimeline({
        action,
        caseId,
        evidenceId
      });

      setTimeline(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل السجل الزمني.");
    } finally {
      setLoading(false);
    }
  }, [action, caseId, evidenceId]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const filteredTimeline = useMemo(() => timeline, [timeline]);

  function clearFilters() {
    setAction("");
    setCaseId("");
    setEvidenceId("");
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="السجل الزمني"
        description="سجل تدقيق للبلاغات  والأدلة والتحقق والرفع والملاحظات وعمليات الوصول."
      />

      <Card>
        <CardBody>
          <div className="filters-grid">
            <Select
              label="الإجراء"
              placeholder="كل الإجراءات"
              options={AUDIT_ACTIONS}
              value={action}
              onChange={(event) => setAction(event.target.value)}
            />

            <Input
              label="معرّف البلاغ"
              placeholder="تصفية حسب معرّف البلاغ..."
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
            />

            <Input
              label="معرّف الدليل"
              placeholder="Filter by evidence id..."
              value={evidenceId}
              onChange={(event) => setEvidenceId(event.target.value)}
            />

            <div className="filter-action">
              <Button variant="secondary" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error ? <ErrorState message={error} onRetry={loadTimeline} /> : null}

      <Card>
        <CardHeader>
          <h2>أحداث التدقيق</h2>
        </CardHeader>

        <CardBody>
          {loading ? (
            <Loader label="جاري تحميل السجل..." />
          ) : filteredTimeline.length ? (
            <div className="timeline-list">
              {filteredTimeline.map((item) => (
                <article className="timeline-item expanded" key={item._id}>
                  <div>
                    <div className="timeline-heading">
                      <Badge>{formatLabel(item.action)}</Badge>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>

                    <h3>{item.message || "Audit event"}</h3>

                    <div className="details-grid compact-details">
                      <span>المنفذ</span>
                      <strong>{getUserLabel(item.actorId)}</strong>

                      <span>Case</span>
                      <strong>{getCaseLabel(item.caseId)}</strong>

                      <span>الأدلة</span>
                      <strong>{getEvidenceLabel(item.evidenceId)}</strong>
                    </div>

                    {item.metadata ? (
                      <details className="metadata-box">
                        <summary>البيانات الوصفية</summary>
                        <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
                      </details>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="لا توجد أحداث تدقيق"
              description="لا توجد أحداث تطابق عوامل التصفية الحالية."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, RotateCcw } from "lucide-react";
import { evidenceApi } from "../api/evidenceApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Loader } from "../components/common/Loader";
import { PageHeader } from "../components/layout/PageHeader";
import type { Evidence, ListResponse } from "../types/api";
import {
  formatDate,
  formatLabel,
  getCaseLabel,
  shortenHash
} from "../utils/formatters";

export function ArchivedEvidence() {
  const [response, setResponse] = useState<ListResponse<Evidence>>({ data: [] });
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreTarget, setاستعادةTarget] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadArchived = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await evidenceApi.getArchivedEvidence();
      setResponse(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "فشل تحميل الأدلة المؤرشفة."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArchived();
  }, [loadArchived]);

  async function handleاستعادة() {
    if (!restoreTarget) {
      return;
    }

    setRestoring(true);
    setError(null);

    try {
      await evidenceApi.restoreEvidence(restoreTarget._id);
      setاستعادةTarget(null);
      await loadArchived();
    } catch (err) {
      setError(err instanceof Error ? err.message : "استعادة failed.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="الأدلة المؤرشفة"
        description="مراجعة الأدلة المؤرشفة واستعادتها عند الحاجة."
      />

      {error ? <ErrorState message={error} onRetry={loadArchived} /> : null}

      <Card>
        <CardHeader>
          <h2>السجلات المؤرشفة</h2>
        </CardHeader>

        <CardBody>
          {loading ? (
            <Loader label="جاري تحميل الأدلة المؤرشفة..." />
          ) : response.data.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>العنوان</th>
                    <th>Case</th>
                    <th>النوع</th>
                    <th>الأولوية</th>
                    <th>SHA-256</th>
                    <th>تاريخ الأرشفة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>

                <tbody>
                  {response.data.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <Link to={`/evidence/${item._id}`} className="table-link">
                          {item.title}
                        </Link>
                        {item.description ? (
                          <small className="table-subtext">
                            {item.description}
                          </small>
                        ) : null}
                      </td>

                      <td>{getCaseLabel(item.caseId)}</td>

                      <td>
                        <Badge>{formatLabel(item.evidenceType || item.type)}</Badge>
                      </td>

                      <td>
                        <Badge>{formatLabel(item.priority)}</Badge>
                      </td>

                      <td className="mono">
                        {shortenHash(item.sha256 || item.file?.sha256)}
                      </td>

                      <td>{formatDate(item.archivedAt || item.updatedAt)}</td>

                      <td>
                        <div className="action-row">
                          <Link to={`/evidence/${item._id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye size={15} />
                            </Button>
                          </Link>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setاستعادةTarget(item)}
                          >
                            <RotateCcw size={15} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="لا توجد أدلة مؤرشفة"
              description="ستظهر الأدلة المؤرشفة هنا."
            />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        title="استعادة الدليل"
        message={`استعادة "${restoreTarget?.title}" to active evidence?`}
        confirmLabel="استعادة"
        loading={restoring}
        onCancel={() => setاستعادةTarget(null)}
        onConfirm={handleاستعادة}
      />
    </div>
  );
}

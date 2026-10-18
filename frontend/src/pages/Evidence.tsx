import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  Download,
  Eye,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  ShieldCheck
} from "lucide-react";
import { evidenceApi } from "../api/evidenceApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Input } from "../components/common/Input";
import { Loader } from "../components/common/Loader";
import { Select } from "../components/common/Select";
import { PageHeader } from "../components/layout/PageHeader";
import { useDebounce } from "../hooks/useDebounce";
import { usePagination } from "../hooks/usePagination";
import type { Evidence, EvidenceType, ListResponse } from "../types/api";
import {
  EVIDENCE_STATUSES,
  EVIDENCE_TYPES,
  PRIORITIES
} from "../utils/constants";
import {
  formatDate,
  getCaseLabel,
  getEvidenceFileName,
  shortenHash
} from "../utils/formatters";
import {
  getEvidenceDisplayType,
  getEvidenceTypeLabel,
  isFileEvidence
} from "../utils/fileHelpers";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";

function getEvidenceTypeIcon(type: EvidenceType) {
  if (type === "image") return <FileImage size={15} />;
  if (type === "video") return <FileVideo size={15} />;
  if (type === "audio") return <FileAudio size={15} />;
  return <FileText size={15} />;
}

function isIntegrityMatched(result: { matches?: boolean; matched?: boolean }) {
  return Boolean(result.matches ?? result.matched);
}

export function EvidencePage() {
  const { user } = useAuth();

  const canUploadEvidence = can(user, "uploadEvidence");
  const canArchiveEvidence = can(user, "archiveEvidence");
  const canVerifyIntegrity = can(user, "verifyIntegrity");

  const [response, setResponse] = useState<ListResponse<Evidence>>({
    data: []
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [caseId, setCaseId] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [priority, setPriority] = useState("");
  const [tag, setTag] = useState("");

  const [archiveTarget, setArchiveTarget] = useState<Evidence | null>(null);

  const debouncedSearch = useDebounce(search);
  const debouncedCaseId = useDebounce(caseId);
  const debouncedTag = useDebounce(tag);

  const pagination = usePagination(response.meta);

  const filters = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      search: debouncedSearch,
      caseId: debouncedCaseId,
      status,
      type,
      priority,
      tag: debouncedTag
    }),
    [
      pagination.page,
      pagination.limit,
      debouncedSearch,
      debouncedCaseId,
      status,
      type,
      priority,
      debouncedTag
    ]
  );

  const loadEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await evidenceApi.getEvidence(filters);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الأدلة.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  useEffect(() => {
    pagination.resetPage();
  }, [
    debouncedSearch,
    debouncedCaseId,
    debouncedTag,
    status,
    type,
    priority
  ]);

  async function handlePreview(item: Evidence) {
    setActionLoading(item._id);
    setError(null);

    try {
      await evidenceApi.previewEvidence(item._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل فتح المعاينة.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownload(item: Evidence) {
    setActionLoading(item._id);
    setError(null);

    try {
      await evidenceApi.downloadEvidence(item._id, getEvidenceFileName(item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الدليل.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVerify(item: Evidence) {
    setActionLoading(item._id);
    setError(null);

    try {
      const result = await evidenceApi.verifyIntegrity(item._id);

      window.alert(
        isIntegrityMatched(result)
          ? "Integrity Verified"
          : result.message || "Integrity Failed"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل فحص سلامة الدليل.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleArchive() {
    if (!archiveTarget) return;

    setActionLoading(archiveTarget._id);
    setError(null);

    try {
      await evidenceApi.archiveEvidence(archiveTarget._id);
      setArchiveTarget(null);
      await loadEvidence();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل أرشفة الدليل.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="الأدلة"
        description="البحث في الأدلة وفرزها ومعاينتها والتحقق من سلامتها وأرشفتها."
        actions={
          canUploadEvidence ? (
            <Link to="/upload">
              <Button>رفع دليل</Button>
            </Link>
          ) : null
        }
      />

      <Card>
        <CardBody>
          <div className="filters-grid wide">
            <Input
              label="البحث"
              placeholder="ابحث في الأدلة..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <Input
              label="معرّف البلاغ"
              placeholder="تصفية حسب معرّف البلاغ..."
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
            />

            <Select
              label="الحالة"
              placeholder="كل الحالات"
              options={EVIDENCE_STATUSES}
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            />

            <Select
              label="النوع"
              placeholder="كل الأنواع"
              options={EVIDENCE_TYPES}
              value={type}
              onChange={(event) => setType(event.target.value)}
            />

            <Select
              label="الأولوية"
              placeholder="كل الأولويات"
              options={PRIORITIES}
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            />

            <Input
              label="وسم"
              placeholder="تصفية حسب الوسم..."
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            />
          </div>
        </CardBody>
      </Card>

      {error ? <ErrorState message={error} onRetry={loadEvidence} /> : null}

      <Card>
        <CardHeader>
          <h2>سجلات الأدلة</h2>
        </CardHeader>

        <CardBody>
          {loading ? (
            <Loader label="جاري تحميل الأدلة..." />
          ) : response.data.length ? (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>العنوان</th>
                      <th>النوع</th>
                      <th>البلاغ</th>
                      <th>الحالة</th>
                      <th>الأولوية</th>
                      <th>SHA-256</th>
                      <th>تاريخ الإنشاء</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>

                  <tbody>
                    {response.data.map((item) => {
                      const itemIsFile = isFileEvidence(item);
                      const displayType = getEvidenceDisplayType(item);
                      const busy = actionLoading === item._id;
                      const hash = item.sha256 || item.file?.sha256;

                      return (
                        <tr key={item._id}>
                          <td>
                            <Link
                              to={`/evidence/${item._id}`}
                              className="table-link"
                            >
                              {item.title}
                            </Link>

                            {item.description ? (
                              <small className="table-subtext">
                                {item.description}
                              </small>
                            ) : null}
                          </td>

                          <td>
                            <Badge>
                              <span className="inline-title">
                                {getEvidenceTypeIcon(displayType)}
                                {getEvidenceTypeLabel(displayType)}
                              </span>
                            </Badge>
                          </td>

                          <td>{getCaseLabel(item.caseId)}</td>

                          <td>
                            <Badge>{item.status}</Badge>
                          </td>

                          <td>
                            <Badge>{item.priority}</Badge>
                          </td>

                          <td className="mono">{shortenHash(hash)}</td>

                          <td>{formatDate(item.createdAt)}</td>

                          <td>
                            <div className="action-row">
                              <Link to={`/evidence/${item._id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                >
                                  <Eye size={15} />
                                </Button>
                              </Link>

                              {itemIsFile ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => handlePreview(item)}
                                  >
                                    <Eye size={15} />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => handleDownload(item)}
                                  >
                                    <Download size={15} />
                                  </Button>
                                </>
                              ) : null}

                              {canVerifyIntegrity && itemIsFile ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => handleVerify(item)}
                                >
                                  <ShieldCheck size={15} />
                                </Button>
                              ) : null}

                              {canArchiveEvidence &&
                              item.status !== "archived" &&
                              item.status !== "deleted" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={busy}
                                  onClick={() => setArchiveTarget(item)}
                                >
                                  <Archive size={15} />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <span>
                  صفحة {pagination.page} من {pagination.totalPages} ·{" "}
                  {pagination.totalItems} سجل
                </span>

                <div>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.canGoPrevious}
                    onClick={pagination.goPrevious}
                  >
                    السابق
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!pagination.canGoNext}
                    onClick={pagination.goNext}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="لا توجد أدلة"
              description="ارفع دليلاً أو عدّل عوامل التصفية الحالية."
              action={
                canUploadEvidence ? (
                  <Link to="/upload">
                    <Button>رفع دليل</Button>
                  </Link>
                ) : undefined
              }
            />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="أرشفة الدليل"
        message={`هل تريد أرشفة "${archiveTarget?.title}"؟ سيتم إزالته من قائمة الأدلة النشطة.`}
        confirmLabel="أرشفة"
        danger
        loading={Boolean(actionLoading)}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
      />
    </div>
  );
}
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Archive,
  ClipboardCopy,
  Download,
  Eye,
  FileText,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { evidenceApi, type VerifyIntegrityResult } from "../api/evidenceApi";
import { timelineApi } from "../api/timelineApi";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Loader } from "../components/common/Loader";
import { Textarea } from "../components/common/Textarea";
import { PageHeader } from "../components/layout/PageHeader";
import type { AuditLog, Evidence } from "../types/api";
import {
  formatDate,
  formatFileSize,
  formatLabel,
  getCaseLabel,
  getEvidenceFileName,
  getUserLabel
} from "../utils/formatters";
import { copyToClipboard, isFileEvidence } from "../utils/fileHelpers";
import { useAuth } from "../context/AuthContext";
import { can } from "../utils/permissions";

export function EvidenceDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canGenerateReport = can(user, "generateReport");
  const canViewTimeline = can(user, "viewTimeline");
  const canتحققIntegrity = can(user, "verifyIntegrity");
  const canAddNote = can(user, "addNote");
  const canArchiveEvidence = can(user, "archiveEvidence");
  const canاستعادةEvidence = can(user, "restoreEvidence");

  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [verifyResult, setVerifyResult] = useState<VerifyIntegrityResult | null>(
    null
  );
  const [confirmAction, setConfirmAction] = useState<"archive" | "restore" | null>(
    null
  );

  const loadEvidence = useCallback(async () => {
    if (!id) {
      setError("Missing evidence id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const evidenceResult = await evidenceApi.getEvidenceById(id);
      const timelineResult = canViewTimeline ? await timelineApi.getEvidenceTimeline(id) : { data: [] };

      setEvidence(evidenceResult);
      setTimeline(timelineResult.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "فشل تحميل تفاصيل الدليل."
      );
    } finally {
      setLoading(false);
    }
  }, [id, canViewTimeline]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  async function handlePreview() {
    if (!evidence) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      await evidenceApi.previewEvidence(evidence._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDownload() {
    if (!evidence) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      await evidenceApi.downloadEvidence(evidence._id, getEvidenceFileName(evidence));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تحميل failed.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleتحقق() {
    if (!evidence) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const result = await evidenceApi.verifyIntegrity(evidence._id);
      setVerifyResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحقق من التكامل.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!evidence || !noteText.trim()) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const updated = await evidenceApi.addNote(evidence._id, {
        text: noteText.trim()
      });
      setEvidence(updated);
      setNoteText("");
      await loadEvidence();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إضافة الملاحظة.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleArchiveOrRestore() {
    if (!evidence || !confirmAction) {
      return;
    }

    setActionLoading(true);
    setError(null);

    try {
      const updated =
        confirmAction === "archive"
          ? await evidenceApi.archiveEvidence(evidence._id)
          : await evidenceApi.restoreEvidence(evidence._id);

      setEvidence(updated);
      setConfirmAction(null);
      await loadEvidence();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evidence action failed.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return <Loader label="جاري تحميل تفاصيل الدليل..." />;
  }

  if (error && !evidence) {
    return <ErrorState message={error} onRetry={loadEvidence} />;
  }

  if (!evidence) {
    return (
      <EmptyState
        title="الدليل غير موجود"
        description="سجل الدليل المحدد غير موجود أو تمت إزالته."
      />
    );
  }

  const fileRecord = evidence.file || evidence.files?.[0];
  const sha256 = evidence.sha256 || fileRecord?.sha256;
  const isFile = isFileEvidence(evidence);

  return (
    <div className="page-stack">
      <PageHeader
        title={evidence.title}
        description={evidence.description || "Evidence record details."}
        actions={
          <div className="action-row">
            {isFile ? (
              <>
                <Button variant="secondary" disabled={actionLoading} onClick={handlePreview}>
                  <Eye size={16} />
                  Preview
                </Button>
                <Button variant="secondary" disabled={actionLoading} onClick={handleDownload}>
                  <Download size={16} />
                  تحميل
                </Button>
              </>
            ) : null}

            {canGenerateReport ? (
              <Link to={`/reports?evidenceId=${evidence._id}`}>
                <Button variant="secondary" disabled={actionLoading}>
                  <FileText size={16} />
                  Report
                </Button>
              </Link>
            ) : null}

            {canتحققIntegrity ? (
              <Button variant="secondary" disabled={actionLoading} onClick={handleتحقق}>
                <ShieldCheck size={16} />
                تحقق
              </Button>
            ) : null}

            {evidence.status === "archived" ? (
              canاستعادةEvidence ? (
                <Button
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={() => setConfirmAction("restore")}
                >
                  <RotateCcw size={16} />
                  استعادة
                </Button>
              ) : null
            ) : (
              canArchiveEvidence ? (
                <Button
                  variant="danger"
                  disabled={actionLoading}
                  onClick={() => setConfirmAction("archive")}
                >
                  <Archive size={16} />
                  أرشفة
                </Button>
              ) : null
            )}
          </div>
        }
      />

      {error ? <ErrorState message={error} onRetry={loadEvidence} /> : null}

      {verifyResult ? (
        <Card className={verifyResult.matched ? "verified-card" : "failed-card"}>
          <CardBody>
            <strong>
              {verifyResult.matched ? "Integrity Verified" : "Integrity Failed"}
            </strong>
            <p>{verifyResult.message || "Integrity verification completed."}</p>
            <div className="details-grid">
              <span>البصمة المتوقعة</span>
              <strong className="mono">
                {verifyResult.expectedHash || verifyResult.sha256 || "—"}
              </strong>

              <span>البصمة الحالية</span>
              <strong className="mono">{verifyResult.actualHash || "—"}</strong>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid-2">
        <Card>
          <CardHeader>
            <h2>معلومات الدليل</h2>
          </CardHeader>

          <CardBody>
            <div className="details-grid">
              <span>النوع</span>
              <strong>
                <Badge>{formatLabel(evidence.evidenceType || evidence.type)}</Badge>
              </strong>

              <span>الحالة</span>
              <strong>
                <Badge>{formatLabel(evidence.status)}</Badge>
              </strong>

              <span>الأولوية</span>
              <strong>
                <Badge>{formatLabel(evidence.priority)}</Badge>
              </strong>

              <span>Case</span>
              <strong>
                {typeof evidence.caseId === "object" && evidence.caseId?._id ? (
                  <Link to={`/cases/${evidence.caseId._id}`} className="table-link">
                    {getCaseLabel(evidence.caseId)}
                  </Link>
                ) : (
                  getCaseLabel(evidence.caseId)
                )}
              </strong>

              <span>رُفع بواسطة</span>
              <strong>{getUserLabel(evidence.uploadedBy)}</strong>

              <span>تاريخ الإنشاء</span>
              <strong>{formatDate(evidence.createdAt)}</strong>

              <span>آخر تحديث</span>
              <strong>{formatDate(evidence.updatedAt)}</strong>
            </div>

            {evidence.tags?.length ? (
              <div className="tag-row spaced">
                {evidence.tags.map((tag) => (
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
            <h2>Hash / File Metadata</h2>
          </CardHeader>

          <CardBody>
            {isFile ? (
              <div className="details-grid">
                <span>الاسم الأصلي</span>
                <strong>{fileRecord?.originalName || fileRecord?.filename || "—"}</strong>

                <span>الاسم المخزن</span>
                <strong>{fileRecord?.storedName || "—"}</strong>

                <span>نوع MIME</span>
                <strong>{fileRecord?.mimeType || "—"}</strong>

                <span>الحجم</span>
                <strong>{formatFileSize(fileRecord?.size)}</strong>

                <span>SHA-256</span>
                <strong className="hash-line">
                  <span className="mono">{sha256 || "—"}</span>
                  {sha256 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void copyToClipboard(sha256)}
                    >
                      <ClipboardCopy size={15} />
                    </Button>
                  ) : null}
                </strong>
              </div>
            ) : (
              <div className="content-box">
                <strong>{evidence.evidenceType === "link" ? "Link" : "Content"}</strong>
                {evidence.evidenceType === "link" ? (
                  <a href={evidence.content || evidence.url} target="_blank" rel="noreferrer">
                    {evidence.content || evidence.url || "—"}
                  </a>
                ) : (
                  <p>{evidence.content || "—"}</p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2>الملاحظات</h2>
        </CardHeader>

        <CardBody>
          {canAddNote ? (
            <form className="form-stack compact" onSubmit={handleAddNote}>
            <Textarea
              label="إضافة ملاحظة"
              rows={3}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="اكتب ملاحظة المحقق..."
            />
            <div className="form-actions">
              <Button type="submit" disabled={actionLoading || !noteText.trim()}>
                إضافة ملاحظة
              </Button>
            </div>
            </form>
          ) : null}

          {evidence.notes?.length ? (
            <div className="note-list">
              {evidence.notes.map((note, index) => (
                <article className="note-item" key={note._id || index}>
                  <p>{note.text || note.content || note.body || "—"}</p>
                  <span>
                    {getUserLabel(note.createdBy || note.author)} ·{" "}
                    {formatDate(note.createdAt)}
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="لا توجد ملاحظات"
              description="ستظهر ملاحظات المحققين هنا."
            />
          )}
        </CardBody>
      </Card>

      {canViewTimeline ? (
        <Card>
          <CardHeader>
            <h2>السجل الزمني</h2>
          </CardHeader>

          <CardBody>
            {timeline.length ? (
              <div className="timeline-list">
                {timeline.map((item) => (
                  <article className="timeline-item" key={item._id}>
                    <div>
                      <Badge>{formatLabel(item.action)}</Badge>
                      <h3>{item.message || "Evidence activity"}</h3>
                      {item.metadata ? (
                        <details>
                          <summary>البيانات الوصفية</summary>
                          <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
                        </details>
                      ) : null}
                    </div>
                    <time>{formatDate(item.createdAt)}</time>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="لا توجد أحداث"
                description="ستظهر نشاطات تدقيق الدليل هنا."
              />
            )}
          </CardBody>
        </Card>
      ) : null}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction === "restore" ? "استعادة evidence" : "أرشفة evidence"}
        message={
          confirmAction === "restore"
            ? `استعادة "${evidence.title}" to active evidence?`
            : `أرشفة "${evidence.title}"?`
        }
        confirmLabel={confirmAction === "restore" ? "استعادة" : "أرشفة"}
        danger={confirmAction === "archive"}
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={handleArchiveOrRestore}
      />
    </div>
  );
}
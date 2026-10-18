import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { UploadCloud } from "lucide-react";
import { casesApi } from "../api/casesApi";
import { evidenceApi } from "../api/evidenceApi";
import { Button } from "../components/common/Button";
import { Card, CardBody, CardHeader } from "../components/common/Card";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorState } from "../components/common/ErrorState";
import { Input } from "../components/common/Input";
import { Loader } from "../components/common/Loader";
import { Select } from "../components/common/Select";
import { Textarea } from "../components/common/Textarea";
import { PageHeader } from "../components/layout/PageHeader";
import type { Case, EvidenceInputMode, EvidenceType } from "../types/api";
import { EVIDENCE_TYPES } from "../utils/constants";
import { formatFileSize } from "../utils/formatters";
import {
  detectEvidenceTypeFromFile,
  getEvidenceTypeLabel,
  parseTags
} from "../utils/fileHelpers";
import { safeMongoObjectId } from "../utils/objectId";

const uploadTypes = [
  { value: "file", label: "ملف من الجهاز" },
  { value: "text", label: "نص" },
  { value: "link", label: "رابط" }
] as const;

const fileEvidenceTypes = EVIDENCE_TYPES.filter((item) =>
  ["file", "image", "video", "audio", "document", "other"].includes(item.value)
);

const acceptedEvidenceFiles = [
  // images
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".tif",
  ".tiff",

  // video
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".m4v",

  // audio
  ".mp3",
  ".wav",
  ".m4a",
  ".aac",
  ".ogg",
  ".flac",
  ".wma",

  // documents / archives
  ".pdf",
  ".txt",
  ".doc",
  ".docx",
  ".csv",
  ".json",
  ".xlsx",
  ".xls",
  ".ppt",
  ".pptx",
  ".zip",
  ".rar",
  ".7z"
].join(",");

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function UploadEvidence() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCaseId = safeMongoObjectId(searchParams.get("caseId"));

  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  const [mode, setMode] = useState<EvidenceInputMode>("file");
  const [caseId, setCaseId] = useState(initialCaseId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("file");
  const [tagsInput, setTagsInput] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const caseOptions = useMemo(
    () =>
      cases.map((item) => ({
        value: item._id,
        label: item.title
      })),
    [cases]
  );

  const selectedFileTypeLabel = useMemo(() => {
    if (!file) return "لم يتم اختيار ملف";
    return getEvidenceTypeLabel(detectEvidenceTypeFromFile(file));
  }, [file]);

  const loadCases = useCallback(async () => {
    setLoadingCases(true);
    setCasesError(null);

    try {
      const response = await casesApi.getCases({ limit: 100 });
      setCases(response.data);
    } catch (err) {
      setCasesError(err instanceof Error ? err.message : "فشل تحميل البلاغات.");
    } finally {
      setLoadingCases(false);
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  useEffect(() => {
    if (mode === "text") {
      setEvidenceType("text");
      setFile(null);
      return;
    }

    if (mode === "link") {
      setEvidenceType("link");
      setFile(null);
      return;
    }

    setEvidenceType(file ? detectEvidenceTypeFromFile(file) : "file");
  }, [mode, file]);

  function handleFileChange(selectedFile: File | null) {
    setFile(selectedFile);

    if (selectedFile) {
      setEvidenceType(detectEvidenceTypeFromFile(selectedFile));

      if (!title.trim()) {
        const cleanName = selectedFile.name.replace(/\.[^.]+$/, "");
        setTitle(cleanName);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanContent = content.trim();
    const tags = parseTags(tagsInput);

    if (!caseId) {
      setSubmitError("اختر البلاغ أولاً.");
      return;
    }

    if (!cleanTitle) {
      setSubmitError("عنوان الدليل مطلوب.");
      return;
    }

    if (mode === "file" && !file) {
      setSubmitError("لازم تختار صورة أو فيديو أو صوت أو ملف.");
      return;
    }

    if (mode === "text" && !cleanContent) {
      setSubmitError("نص الدليل مطلوب.");
      return;
    }

    if (mode === "link") {
      if (!cleanContent) {
        setSubmitError("رابط الدليل مطلوب.");
        return;
      }

      if (!isValidHttpUrl(cleanContent)) {
        setSubmitError("الرابط غير صحيح. لازم يبدأ بـ http أو https.");
        return;
      }
    }

    setSubmitting(true);

    try {
      if (mode === "file") {
        await evidenceApi.uploadEvidenceFile({
          caseId,
          title: cleanTitle,
          description: cleanDescription,
          evidenceType,
          tags,
          content: cleanContent,
          file: file as File
        });

        alert("تم رفع الدليل بنجاح");
        navigate("/evidence", { replace: true });
        return;
      }

      await evidenceApi.createEvidence({
        caseId,
        title: cleanTitle,
        description: cleanDescription,
        evidenceType: mode,
        tags,
        content: cleanContent
      });

      alert("تم رفع الدليل بنجاح");
      navigate("/evidence", { replace: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "فشل رفع الدليل.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingCases) {
    return <Loader label="جاري تحميل البلاغات..." />;
  }

  if (casesError) {
    return <ErrorState message={casesError} onRetry={loadCases} />;
  }

  if (!cases.length) {
    return (
      <EmptyState
        title="لا توجد بلاغات متاحة"
        description="أنشئ بلاغ قبل رفع الدليل."
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="رفع دليل"
        description="إضافة دليل حقيقي للبلاغ: صورة، فيديو، صوت، ملف، نص، أو رابط."
      />

      {submitError ? <ErrorState message={submitError} /> : null}

      <Card>
        <CardHeader>
          <h2>بيانات الدليل</h2>
        </CardHeader>

        <CardBody>
          <form className="form-stack" onSubmit={handleSubmit}>
            <div className="grid-2">
              <Select
                label="طريقة إدخال الدليل"
                options={uploadTypes}
                value={mode}
                onChange={(event) =>
                  setMode(event.target.value as EvidenceInputMode)
                }
              />

              <Select
                label="البلاغ"
                placeholder="اختر بلاغ"
                options={caseOptions}
                value={caseId}
                onChange={(event) => setCaseId(event.target.value)}
                required
              />
            </div>

            <Input
              label="عنوان الدليل"
              placeholder="مثال: صورة المحادثة الأصلية"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <Textarea
              label="وصف الدليل"
              rows={3}
              placeholder="اكتب وصف مختصر وواضح للدليل..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />

            <div className="grid-2">
              {mode === "file" ? (
                <Select
                  label="نوع الدليل"
                  options={fileEvidenceTypes}
                  value={evidenceType}
                  onChange={(event) =>
                    setEvidenceType(event.target.value as EvidenceType)
                  }
                />
              ) : (
                <Input
                  label="نوع الدليل"
                  value={mode === "text" ? "نص" : "رابط"}
                  disabled
                />
              )}
            </div>

            <Input
              label="الوسوم"
              placeholder="fraud, phone, social-media"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />

            {mode === "file" ? (
              <>
                <div className="file-drop">
                  <UploadCloud size={34} />
                  <strong>اختر ملف الدليل</strong>
                  <span>
                    يقبل صورة، فيديو، صوت، PDF، Word، Excel، PowerPoint، TXT، أو
                    ملف مضغوط.
                  </span>

                  <input
                    type="file"
                    accept={acceptedEvidenceFiles}
                    onChange={(event) =>
                      handleFileChange(event.target.files?.[0] || null)
                    }
                  />

                  {file ? (
                    <div className="file-meta">
                      <span>{file.name}</span>
                      <span>{file.type || "Unknown MIME type"}</span>
                      <span>{selectedFileTypeLabel}</span>
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                  ) : null}
                </div>

                <Textarea
                  label="ملاحظة مرفقة مع الملف"
                  rows={4}
                  placeholder="اختياري: اكتب أي ملاحظة أو سياق عن هذا الملف..."
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                />
              </>
            ) : (
              <Textarea
                label={mode === "link" ? "رابط الدليل" : "نص الدليل"}
                rows={mode === "link" ? 3 : 8}
                placeholder={
                  mode === "link"
                    ? "https://example.com/source"
                    : "الصق نص الدليل هنا..."
                }
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
              />
            )}

            <div className="form-actions">
              <Button type="submit" disabled={submitting}>
                {submitting ? "جاري الحفظ..." : "حفظ الدليل"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
import type { Evidence, EvidenceFile, EvidenceType } from "../types/api";

const FILE_EVIDENCE_TYPES: EvidenceType[] = [
  "file",
  "image",
  "video",
  "audio",
  "document",
  "other"
];

const CONTENT_EVIDENCE_TYPES: EvidenceType[] = ["text", "link"];

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "tif",
  "tiff"
]);

const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "avi",
  "mkv",
  "webm",
  "m4v"
]);

const AUDIO_EXTENSIONS = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "flac",
  "wma"
]);

const DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "doc",
  "docx",
  "csv",
  "json",
  "xlsx",
  "xls",
  "ppt",
  "pptx"
]);

export function normalizeEvidenceType(type?: string | null): EvidenceType {
  const normalized = String(type || "").toLowerCase().trim();

  if (normalized === "image") return "image";
  if (normalized === "video") return "video";
  if (normalized === "audio") return "audio";
  if (normalized === "document") return "document";
  if (normalized === "text") return "text";
  if (normalized === "link") return "link";
  if (normalized === "other") return "other";

  return "file";
}

export function isFileEvidence(evidence?: Evidence | null): boolean {
  if (!evidence) return false;

  const evidenceType = normalizeEvidenceType(
    evidence.evidenceType || evidence.type
  );

  return (
    FILE_EVIDENCE_TYPES.includes(evidenceType) ||
    Boolean(evidence.file?.relativePath) ||
    Boolean(evidence.file?.path) ||
    Boolean(evidence.file?.storedName) ||
    Boolean(evidence.file?.filename) ||
    Boolean(evidence.files?.length)
  );
}

export function isContentEvidence(evidence?: Evidence | null): boolean {
  if (!evidence) return false;

  const evidenceType = normalizeEvidenceType(
    evidence.evidenceType || evidence.type
  );

  return CONTENT_EVIDENCE_TYPES.includes(evidenceType);
}

export function getPrimaryEvidenceFile(
  evidence?: Evidence | null
): EvidenceFile | null {
  if (!evidence) return null;

  if (evidence.file) return evidence.file;
  if (Array.isArray(evidence.files) && evidence.files.length > 0) {
    return evidence.files[0];
  }

  return null;
}

export function getEvidenceFileName(evidence?: Evidence | null): string {
  const file = getPrimaryEvidenceFile(evidence);

  return (
    file?.originalName ||
    file?.storedName ||
    file?.filename ||
    "evidence-file"
  );
}

export function getEvidenceMimeType(evidence?: Evidence | null): string {
  const file = getPrimaryEvidenceFile(evidence);
  return String(file?.mimeType || "").toLowerCase();
}

export function getEvidenceExtension(fileName?: string | null): string {
  const clean = String(fileName || "").split("?")[0].split("#")[0];
  const parts = clean.split(".");

  if (parts.length < 2) return "";

  return String(parts.pop() || "").toLowerCase().trim();
}

export function detectEvidenceTypeFromFile(file?: File | null): EvidenceType {
  if (!file) return "file";

  const mimeType = String(file.type || "").toLowerCase();
  const extension = getEvidenceExtension(file.name);

  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  if (mimeType.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }

  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return "document";
  }

  return "file";
}

export function getEvidenceDisplayType(evidence?: Evidence | null): EvidenceType {
  if (!evidence) return "file";

  const currentType = normalizeEvidenceType(evidence.evidenceType || evidence.type);

  if (currentType !== "file" && currentType !== "other") {
    return currentType;
  }

  const file = getPrimaryEvidenceFile(evidence);
  const mimeType = String(file?.mimeType || "").toLowerCase();
  const extension = getEvidenceExtension(
    file?.originalName || file?.storedName || file?.filename
  );

  if (mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (mimeType.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
    return "video";
  }

  if (mimeType.startsWith("audio/") || AUDIO_EXTENSIONS.has(extension)) {
    return "audio";
  }

  if (DOCUMENT_EXTENSIONS.has(extension)) {
    return "document";
  }

  return currentType;
}

export function canPreviewMimeType(mimeType?: string | null): boolean {
  const normalized = String(mimeType || "").toLowerCase();

  if (!normalized) return false;

  return (
    normalized.startsWith("image/") ||
    normalized.startsWith("video/") ||
    normalized.startsWith("audio/") ||
    normalized === "application/pdf" ||
    normalized.startsWith("text/")
  );
}

export function canPreviewEvidence(evidence?: Evidence | null): boolean {
  if (!evidence || !isFileEvidence(evidence)) return false;

  const type = getEvidenceDisplayType(evidence);
  const mimeType = getEvidenceMimeType(evidence);

  return (
    type === "image" ||
    type === "video" ||
    type === "audio" ||
    type === "document" ||
    canPreviewMimeType(mimeType)
  );
}

export function getEvidenceTypeLabel(type?: string | null): string {
  const normalized = normalizeEvidenceType(type);

  const labels: Record<EvidenceType, string> = {
    file: "ملف",
    text: "نص",
    link: "رابط",
    image: "صورة",
    video: "فيديو",
    audio: "صوت",
    document: "وثيقة",
    other: "أخرى"
  };

  return labels[normalized];
}

export function getEvidencePreviewLabel(evidence?: Evidence | null): string {
  const type = getEvidenceDisplayType(evidence);

  if (type === "image") return "معاينة الصورة";
  if (type === "video") return "تشغيل الفيديو";
  if (type === "audio") return "تشغيل الصوت";
  if (type === "document") return "معاينة الوثيقة";

  return "معاينة الملف";
}

export function parseTags(value: string | string[] | null | undefined): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return [
      ...new Set(
        value
          .map((tag) => String(tag).trim().toLowerCase())
          .filter(Boolean)
      )
    ];
  }

  const raw = String(value).trim();

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parseTags(parsed);
    }
  } catch {
    // normal comma-separated tags
  }

  return [
    ...new Set(
      raw
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

export function stringifyTags(tags?: string[] | null): string {
  return Array.isArray(tags) ? tags.join(", ") : "";
}

export async function copyToClipboard(value?: string | null): Promise<boolean> {
  if (!value || !navigator.clipboard) return false;

  await navigator.clipboard.writeText(value);
  return true;
}
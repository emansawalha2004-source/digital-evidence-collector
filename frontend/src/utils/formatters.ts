import type {
  Case,
  EntityRef,
  Evidence,
  EvidenceFile,
  Priority,
  User
} from "../types/api";

type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

export function getIdFromRef<T extends { _id?: string; id?: string }>(
  ref?: EntityRef<T>
): string {
  if (!ref) return "";

  if (typeof ref === "string") return ref;

  if (typeof ref === "object") {
    return ref._id || ref.id || "";
  }

  return "";
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatDateOnly(value?: string | Date | null): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

export function formatTimeOnly(value?: string | Date | null): string {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function formatFileSize(size?: number | string | null): string {
  const bytes = Number(size || 0);

  if (!Number.isFinite(bytes) || bytes <= 0) return "—";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;

  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export const formatBytes = formatFileSize;

export function formatNumber(value?: number | string | null): string {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0";

  return new Intl.NumberFormat("en-US").format(number);
}

export function formatPercent(value?: number | string | null): string {
  const number = Number(value);

  if (!Number.isFinite(number)) return "0%";

  return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
}

export function shortenHash(
  hash?: string | null,
  startLength = 10,
  endLength = 8
): string {
  const value = String(hash || "").trim();

  if (!value) return "—";

  if (value.length <= startLength + endLength + 3) return value;

  return `${value.slice(0, startLength)}...${value.slice(-endLength)}`;
}

export function truncateText(
  value?: string | null,
  maxLength = 80,
  fallback = "—"
): string {
  const text = String(value || "").trim();

  if (!text) return fallback;

  if (text.length <= maxLength) return text;

  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

export function capitalize(value?: string | null): string {
  const text = String(value || "").trim();

  if (!text) return "—";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toTitleCase(value?: string | null): string {
  const text = String(value || "")
    .replace(/[_-]+/g, " ")
    .trim();

  if (!text) return "—";

  return text
    .split(/\s+/)
    .map((word) => capitalize(word).replace("—", ""))
    .join(" ");
}

export function formatLabel(value?: string | null): string {
  const text = String(value || "").trim();

  if (!text) return "—";

  const labels: Record<string, string> = {
    open: "Open",
    in_review: "In Review",
    closed: "Closed",
    archived: "Archived",
    active: "Active",
    deleted: "Deleted",

    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",

    admin: "Admin",
    investigator: "Investigator",
    viewer: "Viewer",
    auditor: "Auditor",

    file: "File",
    text: "Text",
    link: "Link",
    image: "Image",
    video: "Video",
    audio: "Audio",
    document: "Document",
    other: "Other",

    upload_evidence: "Upload Evidence",
    create_case: "Create Case",
    update_case: "Update Case",
    update_evidence: "Update Evidence",
    archive_evidence: "Archive Evidence",
    restore_evidence: "Restore Evidence",
    download_evidence: "Download Evidence",
    preview_evidence: "Preview Evidence",
    verify_integrity: "Verify Integrity",
    generate_report: "Generate Report",
    analyze_evidence: "Analyze Evidence",
    add_note: "Add Note",
    login: "Login",
    logout: "Logout",
    register: "Register"
  };

  return labels[text] || toTitleCase(text);
}

export function getPriorityLabel(priority?: Priority | string | null): string {
  return formatLabel(priority);
}

export function getStatusLabel(status?: string | null): string {
  return formatLabel(status);
}

export function getUserLabel(user?: EntityRef<User> | null): string {
  if (!user) return "—";

  if (typeof user === "string") return user;

  return (
    user.fullName ||
    user.name ||
    user.email ||
    user._id ||
    "—"
  );
}

export function getCaseLabel(caseRef?: EntityRef<Case> | null): string {
  if (!caseRef) return "—";

  if (typeof caseRef === "string") return caseRef;

  return caseRef.title || caseRef._id || "—";
}

function getFileNameFromFile(file?: EvidenceFile | null): string {
  if (!file) return "";

  return (
    file.originalName ||
    file.storedName ||
    file.filename ||
    "evidence-file"
  );
}

export function getEvidenceFileName(
  evidenceOrFile?: Evidence | EvidenceFile | null
): string {
  if (!evidenceOrFile) return "evidence-file";

  if (
    "originalName" in evidenceOrFile ||
    "storedName" in evidenceOrFile ||
    "filename" in evidenceOrFile
  ) {
    return getFileNameFromFile(evidenceOrFile as EvidenceFile);
  }

  const evidence = evidenceOrFile as Evidence;

  if (evidence.file) {
    return getFileNameFromFile(evidence.file);
  }

  if (Array.isArray(evidence.files) && evidence.files.length > 0) {
    return getFileNameFromFile(evidence.files[0]);
  }

  return evidence.title || "evidence-file";
}

export function getEvidenceLabel(evidence?: EntityRef<Evidence> | null): string {
  if (!evidence) return "—";

  if (typeof evidence === "string") return evidence;

  return evidence.title || evidence._id || "—";
}

export function getEvidenceHash(evidence?: Evidence | null): string {
  if (!evidence) return "";

  return evidence.sha256 || evidence.file?.sha256 || "";
}

export function getEvidenceSize(evidence?: Evidence | null): string {
  if (!evidence) return "—";

  return formatFileSize(evidence.file?.size || evidence.files?.[0]?.size);
}

export function getInitials(value?: string | null): string {
  const text = String(value || "").trim();

  if (!text) return "NA";

  const parts = text.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatBoolean(value?: boolean | null): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

export function formatRole(value?: string | null): string {
  return formatLabel(value);
}

export function formatMimeType(value?: string | null): string {
  const text = String(value || "").trim();

  if (!text) return "—";

  return text;
}

export function normalizeSearchText(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function formatList(
  values?: Array<string | number | null | undefined> | null,
  fallback = "—"
): string {
  if (!Array.isArray(values)) return fallback;

  const cleanValues = values
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return cleanValues.length ? cleanValues.join(", ") : fallback;
}

export function formatUnknown(value: unknown, fallback = "—"): string {
  if (value === undefined || value === null || value === "") return fallback;

  if (value instanceof Date) return formatDate(value);

  if (Array.isArray(value)) {
    return formatList(value.map((item) => readString(item)));
  }

  if (isObject(value)) {
    if (typeof value.title === "string") return value.title;
    if (typeof value.fullName === "string") return value.fullName;
    if (typeof value.name === "string") return value.name;
    if (typeof value.email === "string") return value.email;
    if (typeof value._id === "string") return value._id;

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return String(value);
}

export function getDownloadFilename(
  baseName?: string | null,
  extension = "pdf"
): string {
  const cleanBase =
    String(baseName || "download")
      .trim()
      .replace(/[^a-z0-9\u0600-\u06ff._-]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "download";

  const cleanExtension = extension.replace(/^\./, "").trim() || "pdf";

  if (cleanBase.toLowerCase().endsWith(`.${cleanExtension.toLowerCase()}`)) {
    return cleanBase;
  }

  return `${cleanBase}.${cleanExtension}`;
}
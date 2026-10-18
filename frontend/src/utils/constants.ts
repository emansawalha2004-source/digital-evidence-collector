export const CASE_STATUSES = [
  { value: "open", label: "مفتوحة" },
  { value: "in_review", label: "قيد المراجعة" },
  { value: "closed", label: "مغلقة" },
  { value: "archived", label: "مؤرشفة" }
] as const;

export const EVIDENCE_STATUSES = [
  { value: "active", label: "نشط" },
  { value: "archived", label: "مؤرشف" },
  { value: "deleted", label: "محذوف" }
] as const;

export const PRIORITIES = [
  { value: "low", label: "منخفضة" },
  { value: "medium", label: "متوسطة" },
  { value: "high", label: "عالية" },
  { value: "critical", label: "حرجة" }
] as const;

export const EVIDENCE_TYPES = [
  { value: "file", label: "ملف" },
  { value: "text", label: "نص" },
  { value: "link", label: "رابط" },
  { value: "image", label: "صورة" },
  { value: "video", label: "فيديو" },
  { value: "audio", label: "صوت" },
  { value: "document", label: "وثيقة" },
  { value: "other", label: "أخرى" }
] as const;

export const AUDIT_ACTIONS = [
  { value: "create_case", label: "إنشاء قضية" },
  { value: "update_case", label: "تحديث قضية" },
  { value: "archive_case", label: "أرشفة قضية" },
  { value: "upload_evidence", label: "رفع دليل" },
  { value: "update_evidence", label: "تحديث دليل" },
  { value: "archive_evidence", label: "أرشفة دليل" },
  { value: "restore_evidence", label: "استعادة دليل" },
  { value: "download_evidence", label: "تحميل دليل" },
  { value: "preview_evidence", label: "معاينة دليل" },
  { value: "verify_integrity", label: "التحقق من التكامل" },
  { value: "add_note", label: "إضافة ملاحظة" },
  { value: "generate_report", label: "توليد تقرير" },
  { value: "analyze_text", label: "تحليل نص" },
  { value: "analyze_link", label: "تحليل رابط" },
  { value: "analyze_evidence", label: "تحليل دليل" },
  { value: "register", label: "تسجيل مستخدم" },
  { value: "login", label: "تسجيل دخول" },
  { value: "password_changed", label: "تغيير كلمة المرور" },
  { value: "mfa_enabled", label: "تفعيل MFA" },
  { value: "mfa_disabled", label: "تعطيل MFA" },
  { value: "otp_challenge_created", label: "إنشاء تحدي OTP" },
  { value: "otp_verified", label: "التحقق من OTP" },
  { value: "otp_failed", label: "فشل OTP" },
  { value: "otp_rate_limited", label: "تقييد OTP" }
] as const;

export const USER_ROLES = [
  { value: "admin", label: "مدير النظام" },
  { value: "investigator", label: "محقق" },
  { value: "viewer", label: "مشاهد" },
  { value: "auditor", label: "مدقق" }
] as const;

export const DEFAULT_PAGE_SIZE = 10;

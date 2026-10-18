import type { ReactNode } from "react";

type BadgeTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

function inferTone(value: string): BadgeTone {
  const normalized = value.toLowerCase();

  if (["active", "open", "verified", "low"].includes(normalized)) {
    return "success";
  }

  if (["medium", "in_review", "pending"].includes(normalized)) {
    return "warning";
  }

  if (["critical", "high", "archived", "deleted", "failed"].includes(normalized)) {
    return "danger";
  }

  if (["file", "text", "link", "image", "video", "audio", "document"].includes(normalized)) {
    return "info";
  }

  return "default";
}

export function Badge({ children, tone, className = "" }: BadgeProps) {
  const content = String(children);
  const resolvedTone = tone || inferTone(content);

  return (
    <span className={`badge badge-${resolvedTone} ${className}`.trim()}>
      {children}
    </span>
  );
}
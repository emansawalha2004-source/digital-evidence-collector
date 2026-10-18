import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onRetry?: () => void;
  action?: ReactNode;
}

export function ErrorState({
  title = "Request failed",
  message = "Something went wrong while loading this section.",
  actionLabel = "Retry",
  onRetry,
  action
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <div className="error-state-icon">
        <AlertTriangle size={28} />
      </div>

      <div>
        <h3>{title}</h3>
        <p>{message}</p>
      </div>

      {action ? (
        <div className="error-state-action">{action}</div>
      ) : onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
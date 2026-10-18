import type { ReactNode } from "react";
import { FileSearch } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  title = "No data found",
  description = "There are no records to display right now.",
  action
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <FileSearch size={28} />
      </div>

      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
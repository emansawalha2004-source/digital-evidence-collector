import { CheckCircle2, Info, XCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  items: ToastMessage[];
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info
};

export function Toast({ items, onDismiss }: ToastProps) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="toast-stack" aria-live="polite">
      {items.map((item) => {
        const Icon = icons[item.type];

        return (
          <button
            key={item.id}
            className={`toast toast-${item.type}`}
            onClick={() => onDismiss(item.id)}
            type="button"
          >
            <Icon size={18} />
            <span>{item.message}</span>
          </button>
        );
      })}
    </div>
  );
}
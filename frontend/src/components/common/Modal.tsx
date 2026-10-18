import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

export function Modal({
  open,
  title,
  description,
  children,
  footer,
  onClose
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="إغلاق النافذة"
          >
            <X size={18} />
          </Button>
        </header>

        <div className="modal-body">{children}</div>

        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}
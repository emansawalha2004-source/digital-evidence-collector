import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...props
}: TextareaProps) {
  const textareaId = id || props.name;

  return (
    <label className="field" htmlFor={textareaId}>
      {label ? <span className="field-label">{label}</span> : null}

      <textarea
        id={textareaId}
        className={`textarea ${error ? "input-error" : ""} ${className}`.trim()}
        {...props}
      />

      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
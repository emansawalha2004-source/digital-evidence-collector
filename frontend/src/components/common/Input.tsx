import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  id,
  className = "",
  ...props
}: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="field" htmlFor={inputId}>
      {label ? <span className="field-label">{label}</span> : null}
      <input
        id={inputId}
        className={`input ${error ? "input-error" : ""} ${className}`.trim()}
        {...props}
      />
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
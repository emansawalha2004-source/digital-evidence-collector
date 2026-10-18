import type { SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: readonly SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  id,
  className = "",
  options,
  placeholder,
  ...props
}: SelectProps) {
  const selectId = id || props.name;

  return (
    <label className="field" htmlFor={selectId}>
      {label ? <span className="field-label">{label}</span> : null}

      <select
        id={selectId}
        className={`select ${error ? "input-error" : ""} ${className}`.trim()}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}

        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
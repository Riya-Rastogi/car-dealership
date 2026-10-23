import type { InputHTMLAttributes } from "react";

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ id, label, error, hint, className = "", ...props }: TextFieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted"
      >
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`w-full rounded-md border bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/50 transition focus:outline-none focus:ring-2 focus:ring-accent/25 ${
          error ? "border-red-400/70" : "border-line focus:border-accent/70"
        } ${className}`}
        {...props}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-xs text-muted/80">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

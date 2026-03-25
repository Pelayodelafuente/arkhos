import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-faint ${
            error
              ? "focus:border-crimson"
              : "focus:border-accent"
          } ${className}`}
          style={{
            borderColor: error ? "var(--crimson)" : "var(--border-medium)",
            color: "var(--text-primary)",
          }}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--crimson)" }}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

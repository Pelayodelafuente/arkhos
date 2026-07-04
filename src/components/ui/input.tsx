import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, onFocus, onBlur, ...props }, ref) => {
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
          className={`w-full rounded-xl border bg-card px-3 py-2 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-text-faint ${
            error
              ? "focus:border-[var(--error)]"
              : "focus:border-accent"
          } ${className}`}
          style={{
            borderColor: error ? "var(--error)" : "var(--border-stone)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-ring)";
            onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = "";
            onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

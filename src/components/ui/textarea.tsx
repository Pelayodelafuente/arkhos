import { type TextareaHTMLAttributes, forwardRef, useId } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full resize-y rounded-md border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-text-faint ${
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

Textarea.displayName = "Textarea";

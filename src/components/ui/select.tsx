import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = "", id, onFocus, onBlur, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none rounded-xl border bg-white/60 px-3 py-2 pr-8 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-text-faint focus:bg-white ${
              error
                ? "focus:border-[var(--error)]"
                : "focus:border-accent"
            } ${className}`}
            style={{
              borderColor: error ? "var(--error)" : "var(--border-medium)",
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
        </div>
        {error && (
          <p className="text-xs" style={{ color: "var(--error)" }}>{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

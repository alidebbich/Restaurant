"use client";

import React from "react";

/* ── Input ── */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[var(--text-tertiary)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute start-3 pointer-events-none text-[var(--text-quaternary)]">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-10 rounded-xl bg-[var(--bg-input)] border text-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] transition-all duration-150 outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--color-brand-primary-tint)] disabled:opacity-50 disabled:bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] ${
              leftIcon ? "ps-9" : "ps-3"
            } ${rightIcon ? "pe-9" : "pe-3"} ${
              error
                ? "border-[var(--status-error-border)] focus:border-[var(--status-error)] focus:ring-[var(--status-error-bg)]"
                : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute end-3 pointer-events-none text-[var(--text-quaternary)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[var(--status-error)]">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[var(--text-quaternary)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ── Select ── */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, children, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[var(--text-tertiary)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-10 rounded-xl bg-[var(--bg-input)] border text-sm text-[var(--text-primary)] px-3 transition-all duration-150 outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--color-brand-primary-tint)] disabled:opacity-50 shadow-[var(--shadow-xs)] ${
            error
              ? "border-[var(--status-error-border)]"
              : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="text-xs text-[var(--status-error)]">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[var(--text-quaternary)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = "Select";

/* ── Textarea ── */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  error?: string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = "", id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-[var(--text-tertiary)]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`w-full rounded-xl bg-[var(--bg-input)] border text-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] p-3 transition-all duration-150 outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--color-brand-primary-tint)] disabled:opacity-50 disabled:bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] ${
            error
              ? "border-[var(--status-error-border)]"
              : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-xs text-[var(--status-error)]">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[var(--text-quaternary)]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

/* ── Switch ── */
export type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
}: SwitchProps) {
  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer select-none ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)] ${
          checked ? "bg-[var(--color-brand-primary)]" : "bg-[var(--border-strong)]"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>}
          {description && <span className="text-[11px] text-[var(--text-quaternary)]">{description}</span>}
        </div>
      )}
    </label>
  );
}

/* ── Checkbox ── */
export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const checkId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <label htmlFor={checkId} className="inline-flex items-center gap-2 cursor-pointer select-none">
        <input
          ref={ref}
          id={checkId}
          type="checkbox"
          className={`h-4 w-4 rounded-md border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)] focus:ring-offset-1 focus:ring-offset-[var(--color-canvas)] ${className}`}
          {...props}
        />
        {label && <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
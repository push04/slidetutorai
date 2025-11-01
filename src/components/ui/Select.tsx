import React, { forwardRef, useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export type Option = { value: string | number; label: string; disabled?: boolean };

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Visual label shown above the field (not just aria) */
  label?: string;
  /** Small helper text below the field */
  helperText?: string;
  /** Error text (turns field red + shows icon). If present, helperText is shown below it. */
  errorText?: string;
  /** Options to render (you can still pass children if you want full control) */
  options?: Option[];
  /** Left icon inside the field */
  startIcon?: React.ReactNode;
  /** Right icon (defaults to chevron) */
  endIcon?: React.ReactNode;
  /** Controlled onChange typed to string */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Force full width (default true) */
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    id,
    label,
    helperText,
    errorText,
    options,
    startIcon,
    endIcon,
    className,
    fullWidth = true,
    required,
    disabled,
    children,
    ...rest
  },
  ref
) {
  const internalId = useId();
  const fieldId = id ?? `st-select-${internalId}`;
  const describedBy: string[] = [];
  const helperId = `${fieldId}-help`;
  const errorId = `${fieldId}-err`;

  if (errorText) describedBy.push(errorId);
  if (helperText) describedBy.push(helperId);

  const base =
    'st-select appearance-none rounded-lg transition-colors outline-none ' +
    'border glass-card text-foreground ' +
    'focus:ring-2 focus:ring-secondary focus:border-secondary ' +
    'dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed ' +
    'px-3 py-2';

  const errored =
    'border-rose-300 focus:border-rose-500 focus:ring-rose-500 ' +
    'dark:border-rose-600';

  return (
    <div className={fullWidth ? 'w-full' : undefined}>
      {label && (
        <label
          htmlFor={fieldId}
          className="mb-2 block text-sm font-medium text-foreground dark:text-slate-300"
        >
          {label}
          {required && <span className="ml-1 text-rose-600">*</span>}
        </label>
      )}

      <div className="relative">
        {/* start icon */}
        {startIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground">
            {startIcon}
          </span>
        )}

        <select
          id={fieldId}
          ref={ref}
          required={required}
          disabled={disabled}
          aria-describedby={describedBy.join(' ') || undefined}
          className={[
            base,
            errorText ? errored : 'border-border',
            startIcon ? 'pl-9' : '',
            endIcon ? 'pr-10' : 'pr-8',
            className || '',
            'w-full',
          ].join(' ')}
          {...rest}
        >
          {options
            ? options.map((opt) => (
                <option key={`${opt.value}`} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {/* end icon (chevron by default) */}
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground">
          {endIcon ?? <ChevronDown className="h-4 w-4" />}
        </span>
      </div>

      {/* error / helper */}
      {errorText && (
        <p
          id={errorId}
          className="mt-1.5 flex items-center gap-1.5 text-sm text-rose-600"
        >
          <AlertCircle className="h-4 w-4" />
          {errorText}
        </p>
      )}
      {helperText && (
        <p id={helperId} className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Select;

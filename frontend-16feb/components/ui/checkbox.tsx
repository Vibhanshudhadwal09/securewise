import * as React from 'react';

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  onCheckedChange?: (checked: boolean) => void;
};

function join(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, disabled, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={join(
        'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-2 focus:ring-primary-600 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      disabled={disabled}
      {...props}
    />
  )
);

Checkbox.displayName = 'Checkbox';

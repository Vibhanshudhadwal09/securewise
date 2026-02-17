import * as React from 'react';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

function join(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  success: 'bg-success-50 text-success-600 ring-success-600/20',
  warning: 'bg-warning-50 text-warning-600 ring-warning-600/20',
  danger: 'bg-danger-50 text-danger-600 ring-danger-600/20',
  info: 'bg-info-50 text-info-600 ring-info-600/20',
};

export function Badge(props: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const { className, variant = 'neutral', ...rest } = props;
  return (
    <span
      className={join(
        'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        variantStyles[variant],
        className
      )}
      {...rest}
    />
  );
}

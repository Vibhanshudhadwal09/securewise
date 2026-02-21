import * as React from 'react';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'active' | 'closed' | 'planned';

function join(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const variantStyles: Record<BadgeVariant, string> = {
  // Light theme-agnostic variants (dark mode tuned)
  neutral: 'bg-slate-500/15 text-slate-300  border border-slate-500/30',
  success: 'bg-green-500/15  text-green-400  border border-green-500/30',
  warning: 'bg-amber-500/15  text-amber-400  border border-amber-500/30',
  danger: 'bg-red-500/15    text-red-400    border border-red-500/30',
  info: 'bg-blue-500/15   text-blue-400   border border-blue-500/30',
  // Semantic audit-period statuses
  active: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  closed: 'bg-slate-500/15   text-slate-400   border border-slate-500/30',
  planned: 'bg-violet-500/15  text-violet-400  border border-violet-500/30',
};

export function Badge(props: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  const { className, variant = 'neutral', ...rest } = props;
  return (
    <span
      className={join(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide',
        variantStyles[variant],
        className
      )}
      {...rest}
    />
  );
}

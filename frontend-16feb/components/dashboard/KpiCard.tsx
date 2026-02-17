'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type KpiStatus = 'neutral' | 'success' | 'warning' | 'danger' | 'partial';

type KpiCardProps = {
  title: string;
  value: string | number;
  helper?: string;
  status?: KpiStatus;
  tooltip: string;
  href?: string;
  actionLabel?: string;
  actionTooltip?: string;
  icon?: LucideIcon;
};

const statusClasses: Record<KpiStatus, string> = {
  neutral: '',
  success: 'border-green-500/30 bg-green-500/10 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
  warning: 'border-amber-500/30 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
  danger: 'border-red-500/30 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
  partial: 'border-amber-500/30 bg-amber-500/10 border-dashed',
};

export function KpiCard({
  title,
  value,
  helper,
  status = 'neutral',
  tooltip,
  href,
  actionLabel = 'View details',
  icon: Icon,
}: KpiCardProps) {

  const router = useRouter();

  const handleClick = () => {
    if (href) router.push(href);
  };

  return (
    <Tooltip className="w-full h-full">
      <TooltipTrigger asChild>

        {/* FIX 1: added flex-1 and h-full */}
        <div
          className={`
            flex flex-col flex-1 h-full w-full
            bg-[var(--card-bg)]
            rounded-xl
            border border-[var(--card-border)]
            shadow-[var(--card-shadow)]
            hover:border-[var(--accent-blue)]
            hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]
            transition-all backdrop-blur-md
            ${statusClasses[status]}
            ${href ? 'cursor-pointer' : ''}
          `}
          onClick={handleClick}
        >

          {/* FIX 2: added flex-1 */}
          <div className="p-5 flex flex-col flex-1">

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold truncate pr-2">
                {title}
              </h3>

              {Icon && (
                <Icon className="w-4 h-4 text-[var(--accent-blue)] opacity-70 flex-shrink-0" />
              )}
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                {value}
              </p>

              {status === 'partial' && (
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] px-1.5 py-0 h-5">
                  Partial
                </Badge>
              )}
            </div>

            {/* Helper */}
            <div className="min-h-[20px]">
              {helper && (
                <p className="text-xs text-[var(--text-secondary)]">
                  {helper}
                </p>
              )}
            </div>

            {/* FIX 3: pushes footer to bottom */}
            <div className="flex-1" />

            {/* Footer */}
            {href && (
              <div className="pt-3 border-t border-[var(--card-border)] flex items-center">
                <span className="text-[var(--accent-blue)] text-xs font-medium hover:text-[var(--accent-cyan)] transition-colors flex items-center gap-1 group">
                  {actionLabel}

                  <svg
                    className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>

                </span>
              </div>
            )}

          </div>
        </div>

      </TooltipTrigger>

      <TooltipContent
        side="bottom"
        align="center"
        className="max-w-[260px] bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--card-border)] backdrop-blur-xl shadow-xl z-50"
      >
        {tooltip}
      </TooltipContent>

    </Tooltip>
  );
}

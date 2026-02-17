'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  success: 'border-green-200 bg-green-50/30',
  warning: 'border-amber-200 bg-amber-50/30',
  danger: 'border-red-200 bg-red-50/30',
  partial: 'border-amber-200 bg-amber-50/30',
};

export function KpiCard({
  title,
  value,
  helper,
  status = 'neutral',
  tooltip,
  href,
  actionLabel = 'View details',
  actionTooltip,
  icon: Icon,
}: KpiCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) router.push(href);
  };

  return (
    <Tooltip className="w-full">
      <TooltipTrigger>
        <div
          className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all ${statusClasses[status]} ${
            href ? 'cursor-pointer' : ''
          }`}
          onClick={handleClick}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-wide text-slate-500 font-medium">{title}</h3>
              {Icon ? <Icon className="w-4 h-4 text-slate-400" /> : null}
            </div>

            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-slate-900">{value}</p>
              {status === 'partial' ? (
                <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-xs">Partial data</Badge>
              ) : null}
            </div>

            {helper ? <p className="text-xs text-slate-500 mt-2">{helper}</p> : null}

            {href ? (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-0">
                      {actionLabel}
                    </Button>
                  </TooltipTrigger>
                  {actionTooltip ? <TooltipContent>{actionTooltip}</TooltipContent> : null}
                </Tooltip>
              </div>
            ) : null}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[260px]">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

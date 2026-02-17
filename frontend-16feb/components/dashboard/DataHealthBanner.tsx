'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type DataSource = { name: string; status: string; lastSeen?: string };

type DataHealthBannerProps = {
  reasons: string[];
  sources: DataSource[];
};

export function DataHealthBanner({ reasons, sources }: DataHealthBannerProps) {
  const router = useRouter();

  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 shadow-[0_0_15px_rgba(245,158,11,0.1)] backdrop-blur-md">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-500">Partial data</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Some panels may be missing metrics because one or more sources are not connected or are still indexing.
          </p>
          {reasons?.length ? (
            <ul className="text-xs text-[var(--text-secondary)] mt-2 list-disc ml-4">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {sources?.length ? (
            <div className="text-xs text-[var(--text-secondary)] mt-2">
              {sources.map((source) => (
                <div key={source.name}>
                  {source.name}: {source.status}
                  {source.lastSeen ? ` - last seen ${source.lastSeen}` : ''}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => router.push('/integrations')}
                className="bg-[rgba(15,23,42,0.6)] text-[var(--text-primary)] hover:bg-[rgba(15,23,42,0.8)] border border-[var(--card-border)]"
              >
                View Data Sources
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--card-border)]">Open integrations and connector health</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="bg-transparent text-[var(--text-primary)] border-[var(--card-border)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]"
              >
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--card-border)]">Recalculate dashboard metrics for the selected time range</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

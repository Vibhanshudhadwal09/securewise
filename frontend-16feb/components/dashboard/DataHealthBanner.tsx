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

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900">Partial data</h3>
          <p className="text-sm text-amber-700 mt-1">
            Some panels may be missing metrics because one or more sources are not connected or are still indexing.
          </p>
          {reasons?.length ? (
            <ul className="text-xs text-amber-700 mt-2 list-disc ml-4">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {sources?.length ? (
            <div className="text-xs text-amber-700 mt-2">
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
              <Button variant="secondary" size="sm" onClick={() => router.push('/integrations')}>
                View Data Sources
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open integrations and connector health</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                Refresh
              </Button>
            </TooltipTrigger>
            <TooltipContent>Recalculate dashboard metrics for the selected time range</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

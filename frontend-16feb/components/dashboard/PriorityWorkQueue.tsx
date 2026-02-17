'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type WorkQueueItem = {
  type: string;
  item_id: string;
  title: string;
  status: string;
  priority: string;
};

type PriorityWorkQueueProps = {
  items: WorkQueueItem[];
};

const priorityStyles: Record<string, string> = {
  high: 'bg-red-500/10 text-red-500 border-red-500/30',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  low: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
};

export function PriorityWorkQueue({ items }: PriorityWorkQueueProps) {
  const router = useRouter();

  const getRouteForItem = (item: WorkQueueItem) => {
    switch (item.type) {
      case 'control_missing_evidence':
        return `/compliance/controls/${encodeURIComponent(item.item_id)}/workbench`;
      case 'evidence_expiring':
        return `/compliance/evidence-collection/${encodeURIComponent(item.item_id)}`;
      case 'failed_test':
        return `/control-testing?testId=${encodeURIComponent(item.item_id)}`;
      default:
        return '/compliance';
    }
  };

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-[var(--card-shadow)] backdrop-blur-md">
      <div className="p-6 border-b border-[var(--card-border)]">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">Priority Work Queue</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">High-priority items requiring immediate attention</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[rgba(15,23,42,0.6)] border-b border-[var(--card-border)] sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-right text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--card-border)]">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-[var(--text-secondary)]">
                  No priority items at this time
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={`${item.type}-${item.item_id}-${index}`} className="hover:bg-[rgba(59,130,246,0.05)] transition-colors">
                  <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-medium">{item.title}</td>
                  <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{item.type.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4">
                    <Badge className="bg-slate-500/10 text-[var(--text-secondary)] border-slate-500/20">{item.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={`${priorityStyles[item.priority] || priorityStyles.low}`}>{item.priority}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(getRouteForItem(item))}
                          className="text-[var(--accent-blue)] hover:text-[var(--accent-cyan)] hover:bg-[rgba(59,130,246,0.1)]"
                        >
                          Open
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-[var(--card-bg)] text-[var(--text-primary)] border-[var(--card-border)]">Open the relevant workbench or review queue</TooltipContent>
                    </Tooltip>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

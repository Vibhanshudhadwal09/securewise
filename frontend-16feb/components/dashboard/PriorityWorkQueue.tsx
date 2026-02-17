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
  high: 'bg-red-50 text-red-600 border-red-200',
  medium: 'bg-amber-50 text-amber-600 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-base font-semibold text-slate-900">Priority Work Queue</h2>
        <p className="text-sm text-slate-600 mt-1">High-priority items requiring immediate attention</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Priority</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                  No priority items at this time
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={`${item.type}-${item.item_id}-${index}`} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm text-slate-900">{item.title}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.type.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-4">
                    <Badge className="bg-slate-50 text-slate-600 border-slate-200">{item.status}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={priorityStyles[item.priority] || priorityStyles.low}>{item.priority}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Tooltip>
                      <TooltipTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(getRouteForItem(item))}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Open
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open the relevant workbench or review queue</TooltipContent>
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

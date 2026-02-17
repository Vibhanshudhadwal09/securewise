import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function EvidenceAutomationCard(props: {
  name: string;
  method: string;
  description?: string | null;
  templateId?: string | null;
  schedule?: string;
  lastRun?: string;
  status?: string;
  onRun?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  deleting?: boolean;
}) {
  const { name, method, description, templateId, schedule, lastRun, status, onRun, onEdit, onDelete, onHistory, deleting } =
    props;
  const statusColor =
    status === 'active'
      ? 'bg-green-50 text-green-700 border-green-200'
      : status === 'failed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <Card className="p-4 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">{description || 'No description'}</div>
        </div>
        <Badge className={statusColor}>{(status || 'paused').toUpperCase()}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span>Method: {method}</span>
          {templateId ? <Badge className="border-blue-200 bg-blue-50 text-blue-700">Template</Badge> : null}
        </div>
        <div>Schedule: {schedule || 'Manual'}</div>
        <div>Last run: {lastRun || 'N/A'}</div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onRun}
        >
          Run now
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onHistory}
        >
          View history
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onEdit}
        >
          Edit
        </button>
        <Button variant="danger" size="sm" loading={deleting} onClick={onDelete}>
          Delete
        </Button>
      </div>
    </Card>
  );
}

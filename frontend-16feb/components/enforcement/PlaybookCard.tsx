import React from 'react';
import { Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type Playbook = {
  playbook_id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  action_count: number;
  avg_execution_time_ms: number;
  last_executed: string | null;
  execution_count: number;
  success_rate: number;
};

export interface PlaybookCardProps {
  playbook: Playbook;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatCategory(category?: string) {
  if (!category) return 'General';
  return category
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatTime(ms?: number) {
  const value = Number(ms || 0);
  if (!value) return '~0s';
  if (value < 1000) return `~${Math.round(value)}ms`;
  return `~${(value / 1000).toFixed(1)}s`;
}

function formatLastExecuted(value?: string | null) {
  if (!value) return 'Never executed';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? `Last executed ${d.toLocaleString()}` : 'Last executed';
}

export function PlaybookCard({ playbook, onToggle, onEdit, onTest, onDelete }: PlaybookCardProps) {
  const categoryLabel = formatCategory(playbook.category);
  const enabled = Boolean(playbook.enabled);

  return (
    <Card className="p-6 transition-shadow hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Zap className="h-4 w-4 text-amber-500" />
            <span>{playbook.name}</span>
          </div>
          <Badge variant="warning" className="w-fit">
            {categoryLabel}
          </Badge>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={enabled}
            onChange={(e) => onToggle(playbook.playbook_id, e.target.checked)}
          />
          <div className="w-9 h-5 bg-gray-200 rounded-full peer-checked:bg-green-500 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
        </label>
      </div>

      <p className="mt-3 text-sm text-gray-600 line-clamp-2">{playbook.description || 'No description'}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
        <span>{playbook.action_count || 0} actions</span>
        <span>{formatTime(playbook.avg_execution_time_ms)}</span>
        <span>Success: {playbook.success_rate || 0}%</span>
      </div>

      <div className="mt-3 text-xs text-gray-500">{formatLastExecuted(playbook.last_executed)}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(playbook.playbook_id)}>
          Edit
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onTest(playbook.playbook_id)}>
          Test
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onDelete(playbook.playbook_id)}>
          Delete
        </Button>
      </div>
    </Card>
  );
}

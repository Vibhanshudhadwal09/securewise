'use client';

import * as React from 'react';
import { Progress } from '@/components/ui/progress';
import type { ChecklistItem } from './checklist-utils';

export interface ChecklistProgressProps {
  items: ChecklistItem[];
}

export function ChecklistProgress({ items }: ChecklistProgressProps) {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;
  const percentage = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600">
        {completed} of {total} completed ({percentage}%)
      </div>
      <Progress value={percentage} />
    </div>
  );
}

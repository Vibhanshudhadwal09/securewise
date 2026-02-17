'use client';

import * as React from 'react';
import { GripVertical, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ChecklistItem } from './checklist-utils';

export interface ChecklistItemProps {
  item: ChecklistItem;
  onUpdate: (item: ChecklistItem) => void;
  onDelete: () => void;
  disabled?: boolean;
  onAddAfter?: () => void;
}

export function ChecklistItemRow({ item, onUpdate, onDelete, disabled, onAddAfter }: ChecklistItemProps) {
  const completedStyles = item.completed ? 'bg-green-50 border-green-100' : 'bg-white';
  const textStyles = item.completed ? 'line-through text-gray-500' : 'text-gray-900';

  return (
    <div className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${completedStyles}`}>
      <GripVertical className="h-4 w-4 text-gray-400" aria-hidden="true" />
      <Checkbox
        checked={item.completed}
        onCheckedChange={(checked) => onUpdate({ ...item, completed: checked })}
        disabled={disabled}
        aria-label="Toggle checklist item"
      />
      <Input
        value={item.text}
        placeholder="Checklist item"
        onChange={(e) => onUpdate({ ...item, text: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onAddAfter?.();
          }
        }}
        disabled={disabled}
        maxLength={500}
        data-checklist-id={item.id}
        aria-label="Checklist item text"
        className={`flex-1 ${textStyles} ${item.completed ? 'bg-green-50' : ''}`}
      />
      {!disabled ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label="Delete checklist item"
          className="text-gray-500 hover:text-red-600 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

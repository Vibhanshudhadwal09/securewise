'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChecklistItemRow } from './ChecklistItem';
import { createChecklistId } from './checklist-utils';
import type { ChecklistItem } from './checklist-utils';

export type { ChecklistItem } from './checklist-utils';

export interface ChecklistBuilderProps {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  disabled?: boolean;
}

const MAX_ITEMS = 50;

export function ChecklistBuilder({ value, onChange, disabled }: ChecklistBuilderProps) {
  const [items, setItems] = React.useState<ChecklistItem[]>(Array.isArray(value) ? value : []);
  const [limitError, setLimitError] = React.useState<string>('');
  const [pendingFocusId, setPendingFocusId] = React.useState<string | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setItems(Array.isArray(value) ? value : []);
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!pendingFocusId) return;
    const id = pendingFocusId;
    setPendingFocusId(null);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(`input[data-checklist-id="${id}"]`);
      if (el) {
        el.focus();
        el.select();
      }
    });
  }, [items, pendingFocusId]);

  React.useEffect(() => {
    if (items.length < MAX_ITEMS && limitError) {
      setLimitError('');
    }
  }, [items.length, limitError]);

  const emitChange = React.useCallback(
    (nextItems: ChecklistItem[]) => {
      if (disabled) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(nextItems), 250);
    },
    [disabled, onChange]
  );

  const addItem = React.useCallback(
    (afterId?: string) => {
      if (disabled) return;
      setLimitError('');
      if (items.length >= MAX_ITEMS) {
        setLimitError('Maximum 50 checklist items allowed');
        return;
      }
      const newItem: ChecklistItem = {
        id: createChecklistId(),
        text: '',
        completed: false,
      };
      let nextItems: ChecklistItem[] = [];
      if (afterId) {
        const idx = items.findIndex((item) => item.id === afterId);
        if (idx >= 0) {
          nextItems = [...items.slice(0, idx + 1), newItem, ...items.slice(idx + 1)];
        } else {
          nextItems = [...items, newItem];
        }
      } else {
        nextItems = [...items, newItem];
      }
      setItems(nextItems);
      emitChange(nextItems);
      setPendingFocusId(newItem.id);
    },
    [disabled, emitChange, items]
  );

  const updateItem = React.useCallback(
    (nextItem: ChecklistItem) => {
      const nextItems = items.map((item) => (item.id === nextItem.id ? nextItem : item));
      setItems(nextItems);
      emitChange(nextItems);
    },
    [emitChange, items]
  );

  const deleteItem = React.useCallback(
    (id: string) => {
      const nextItems = items.filter((item) => item.id !== id);
      setItems(nextItems);
      emitChange(nextItems);
    },
    [emitChange, items]
  );

  return (
    <div className="space-y-3">
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              disabled={disabled}
              onUpdate={updateItem}
              onDelete={() => deleteItem(item.id)}
              onAddAfter={() => addItem(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No checklist items yet.
        </div>
      )}

      {!disabled ? (
        <Button variant="secondary" size="sm" onClick={() => addItem()}>
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      ) : null}

      {limitError ? (
        <div className="text-sm text-red-600" role="alert">
          {limitError}
        </div>
      ) : null}
    </div>
  );
}

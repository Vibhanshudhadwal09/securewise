'use client';

import * as React from 'react';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Workflow } from '@/types/workflows';

export interface WorkflowListProps {
  workflows: Workflow[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
  onDuplicate?: (id: string) => void;
  deletingId?: string | null;
}

export function WorkflowList({ workflows, onEdit, onDelete, onToggleActive, onDuplicate, deletingId }: WorkflowListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Workflow Name</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Steps</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Last Modified</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((wf) => {
            const stepCount = Array.isArray(wf.approval_steps?.steps) ? wf.approval_steps?.steps.length : 0;
            return (
              <tr key={wf.id} className="border-t border-gray-200">
                <td className="px-4 py-3 font-semibold text-gray-900">{wf.workflow_name}</td>
                <td className="px-4 py-3">
                  <Badge className="border-gray-200 text-gray-600">{wf.trigger_entity_type}</Badge>
                </td>
                <td className="px-4 py-3 text-gray-600">{stepCount}</td>
                <td className="px-4 py-3">
                  <label className="inline-flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={wf.is_active}
                      onChange={(e) => onToggleActive(wf.id, e.target.checked)}
                    />
                    {wf.is_active ? 'Active' : 'Inactive'}
                  </label>
                </td>
                <td className="px-4 py-3 text-gray-600">{wf.updated_at ? dayjs(wf.updated_at).format('YYYY-MM-DD') : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onEdit(wf.id)}>
                      Edit
                    </Button>
                    {onDuplicate ? (
                      <Button size="sm" variant="secondary" onClick={() => onDuplicate(wf.id)}>
                        Duplicate
                      </Button>
                    ) : null}
                    <Button size="sm" variant="danger" loading={deletingId === wf.id} onClick={() => onDelete(wf.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {!workflows.length ? (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                No workflows found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

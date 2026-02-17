'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { WorkflowStepTemplate } from '@/types/workflows';

export interface WorkflowStepConfigProps {
  step: WorkflowStepTemplate;
  stepNumber: number;
  onChange: (step: WorkflowStepTemplate) => void;
  onDelete: () => void;
}

export function WorkflowStepConfig({ step, stepNumber, onChange, onDelete }: WorkflowStepConfigProps) {
  const approverValue =
    step.approver_type === 'role'
      ? (step.approver_roles || []).join(', ')
      : (step.approver_emails || []).join(', ');

  return (
    <div className="space-y-3 rounded-md border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-gray-900">Step {stepNumber}</div>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Step name</label>
          <Input
            value={step.step_name}
            onChange={(e) => onChange({ ...step, step_name: e.target.value })}
            placeholder="Manager review"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Approver type</label>
          <select
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={step.approver_type}
            onChange={(e) =>
              onChange({
                ...step,
                approver_type: e.target.value as 'role' | 'user',
                approver_roles: e.target.value === 'role' ? step.approver_roles || [] : [],
                approver_emails: e.target.value === 'user' ? step.approver_emails || [] : [],
              })
            }
          >
            <option value="role">Role</option>
            <option value="user">Specific user</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs text-gray-600">
            {step.approver_type === 'role' ? 'Approver roles (comma separated)' : 'Approver emails (comma separated)'}
          </label>
          <Input
            value={approverValue}
            onChange={(e) => {
              const parts = e.target.value.split(',').map((v) => v.trim()).filter(Boolean);
              if (step.approver_type === 'role') {
                onChange({ ...step, approver_roles: parts, approver_emails: [] });
              } else {
                onChange({ ...step, approver_emails: parts, approver_roles: [] });
              }
            }}
            placeholder={step.approver_type === 'role' ? 'grc_manager, admin' : 'approver@company.com'}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Timeout (hours)</label>
          <Input
            type="number"
            min={1}
            value={step.auto_approve_hours || ''}
            onChange={(e) =>
              onChange({ ...step, auto_approve_hours: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="72"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={Boolean(step.required ?? true)}
            onCheckedChange={(checked) => onChange({ ...step, required: checked })}
          />
          <span className="text-xs text-gray-600">Required step</span>
        </div>
      </div>
    </div>
  );
}

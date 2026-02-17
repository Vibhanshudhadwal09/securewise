'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Workflow, WorkflowStepTemplate } from '@/types/workflows';
import { WorkflowStepConfig } from './WorkflowStepConfig';

export interface WorkflowBuilderProps {
  workflow?: Workflow | null;
  onSave: (workflow: Workflow) => void;
  onCancel: () => void;
}

const ENTITY_TYPES = [
  { value: 'policy', label: 'Policy' },
  { value: 'risk', label: 'Risk' },
  { value: 'control', label: 'Control' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'document', label: 'Document' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'access_request', label: 'Access Request' },
  { value: 'budget', label: 'Budget' },
  { value: 'incident', label: 'Incident' },
  { value: 'audit_finding', label: 'Audit Finding' },
];

function defaultStep(index: number): WorkflowStepTemplate {
  return {
    step_number: index,
    step_name: `Step ${index}`,
    approver_type: 'role',
    approver_roles: [],
    approver_emails: [],
    required: true,
    auto_approve_hours: 72,
  };
}

export function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
  const [name, setName] = React.useState(workflow?.workflow_name || '');
  const [description, setDescription] = React.useState(workflow?.workflow_description || '');
  const [entityType, setEntityType] = React.useState(workflow?.trigger_entity_type || 'policy');
  const [steps, setSteps] = React.useState<WorkflowStepTemplate[]>(
    workflow?.approval_steps?.steps?.length
      ? workflow.approval_steps.steps.map((step, index) => ({
          ...step,
          step_number: step.step_number || index + 1,
          approver_type: step.approver_type || 'role',
          required: step.required !== undefined ? step.required : true,
          auto_approve_hours: step.auto_approve_hours ?? 72,
        }))
      : [defaultStep(1)]
  );
  const [error, setError] = React.useState<string | null>(null);

  function addStep() {
    setSteps((prev) => [...prev, defaultStep(prev.length + 1)]);
  }

  function updateStep(idx: number, next: WorkflowStepTemplate) {
    setSteps((prev) =>
      prev.map((step, i) => (i === idx ? { ...next, step_number: idx + 1 } : { ...step, step_number: i + 1 }))
    );
  }

  function deleteStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((step, i) => ({ ...step, step_number: i + 1 })));
  }

  function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError('Workflow name is required.');
      return;
    }
    const cleanSteps = steps.map((step, index) => ({
      ...step,
      step_number: index + 1,
      step_name: String(step.step_name || `Step ${index + 1}`).trim(),
      approver_roles: step.approver_type === 'role' ? step.approver_roles || [] : [],
      approver_emails: step.approver_type === 'user' ? step.approver_emails || [] : [],
    }));

    onSave({
      ...(workflow || ({} as Workflow)),
      workflow_name: name.trim(),
      workflow_description: description.trim() || null,
      trigger_entity_type: entityType,
      approval_steps: { steps: cleanSteps },
    } as Workflow);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Workflow name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Policy approval workflow" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-600">Entity type</label>
          <select
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
          >
            {ENTITY_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-xs text-gray-600">Description</label>
          <textarea
            className="min-h-[80px] w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the workflow purpose"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Workflow steps</div>
          <Button variant="secondary" size="sm" onClick={addStep}>
            <Plus className="h-4 w-4" />
            Add Step
          </Button>
        </div>
        {steps.map((step, idx) => (
          <WorkflowStepConfig
            key={`${step.step_number}-${idx}`}
            step={step}
            stepNumber={idx + 1}
            onChange={(next) => updateStep(idx, next)}
            onDelete={() => deleteStep(idx)}
          />
        ))}
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onCancel} size="sm">
          Cancel
        </Button>
        <Button onClick={handleSave} size="sm">
          Save Workflow
        </Button>
      </div>
    </div>
  );
}

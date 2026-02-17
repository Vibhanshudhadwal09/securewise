'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Workflow } from '@/types/workflows';
import { message } from 'antd';
import { createApprovalRequest } from '@/lib/api/approval-requests';
import { getWorkflows } from '@/lib/api/workflows';

export interface SubmitForApprovalButtonProps {
  entityType: string;
  entityId: string;
  entityTitle: string;
  entityDescription?: string;
  tenantId?: string;
  onSubmit?: () => void;
}

export function SubmitForApprovalButton({
  entityType,
  entityId,
  entityTitle,
  entityDescription,
  tenantId,
  onSubmit,
}: SubmitForApprovalButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
  const [selected, setSelected] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    getWorkflows(entityType, tenantId)
      .then((res) => setWorkflows(Array.isArray(res?.items) ? res.items : []))
      .catch((err) => setError(String(err?.message || err)));
  }, [entityType, open, tenantId]);

  async function submit() {
    if (!selected) {
      setError('Select a workflow to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createApprovalRequest(
        {
          workflow_id: selected,
          entity_type: entityType,
          entity_id: entityId,
          request_title: `Approval: ${entityTitle}`,
          request_description: entityDescription || null,
          entity_data: { title: entityTitle },
        },
        tenantId
      );
      setOpen(false);
      setSelected('');
      onSubmit?.();
      message.success('Approval request submitted.');
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <CheckCircle2 className="h-4 w-4" />
        Submit for Approval
      </Button>
      <Dialog open={open} onOpenChange={(next) => (next ? undefined : setOpen(false))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit for Approval</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="text-sm text-gray-600">
              Select a workflow for <Badge className="border-gray-200 text-gray-600">{entityType}</Badge>.
            </div>
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <label key={workflow.id} className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3">
                  <input
                    type="radio"
                    name="workflow"
                    checked={selected === workflow.id}
                    onChange={() => setSelected(workflow.id)}
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{workflow.workflow_name}</div>
                    <div className="text-xs text-gray-500">{workflow.workflow_description || 'No description'}</div>
                  </div>
                </label>
              ))}
              {!workflows.length ? (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  No workflows available for this entity type.
                </div>
              ) : null}
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={loading || !workflows.length}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

'use client';

import * as React from 'react';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ApprovalAction, ApprovalRequest, ApprovalStep } from '@/types/workflows';
import { ApprovalActionForm } from './ApprovalActionForm';
import { ApprovalTimeline } from './ApprovalTimeline';

export interface ApprovalRequestDetailsModalProps {
  request: ApprovalRequest;
  steps: ApprovalStep[];
  actions: ApprovalAction[];
  open: boolean;
  onClose: () => void;
  onAction: (action: 'approve' | 'reject', comments: string) => void;
  canApprove: boolean;
  loading?: boolean;
}

function statusBadge(status: string) {
  const v = String(status || '').toLowerCase();
  if (v === 'approved') return 'border-green-200 text-green-700 bg-green-50';
  if (v === 'rejected') return 'border-red-200 text-red-700 bg-red-50';
  if (v === 'in_progress') return 'border-blue-200 text-blue-700 bg-blue-50';
  return 'border-yellow-200 text-yellow-700 bg-yellow-50';
}

function entityLink(request: ApprovalRequest) {
  const type = String(request.entity_type || '');
  const id = String(request.entity_id || '');
  if (!id) return null;
  if (type === 'policy') return `/policies/${encodeURIComponent(id)}`;
  if (type === 'risk') return `/risks/${encodeURIComponent(id)}`;
  if (type === 'control') return `/controls/${encodeURIComponent(id)}`;
  if (type === 'vendor') return `/vendors/${encodeURIComponent(id)}`;
  if (type === 'incident') return `/incidents/${encodeURIComponent(id)}`;
  return null;
}

export function ApprovalRequestDetailsModal({
  request,
  steps,
  actions,
  open,
  onClose,
  onAction,
  canApprove,
  loading,
}: ApprovalRequestDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Approval Request</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
          <Card className="border-gray-200">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base">{request.request_title}</CardTitle>
                <Badge className={statusBadge(request.overall_status)}>{request.overall_status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              {request.request_description ? <div>{request.request_description}</div> : null}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-gray-500">Entity</div>
                  <div className="mt-1">
                    <Badge className="border-gray-200 text-gray-600">{request.entity_type}</Badge>
                    <span className="ml-2 text-xs text-gray-500">ID: {request.entity_id}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Requested By</div>
                  <div className="mt-1">{request.requested_by}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Requested At</div>
                  <div className="mt-1">
                    {request.requested_at ? dayjs(request.requested_at).format('YYYY-MM-DD HH:mm') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Current Step</div>
                  <div className="mt-1">Step {request.current_step_number || 1}</div>
                </div>
              </div>
              {entityLink(request) ? (
                <div>
                  <a className="text-blue-600 underline" href={entityLink(request) as string}>
                    View related entity
                  </a>
                </div>
              ) : null}
              {request.entity_data ? (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                  <div className="mb-2 font-semibold text-gray-600">Entity preview</div>
                  <pre className="whitespace-pre-wrap">{JSON.stringify(request.entity_data, null, 2)}</pre>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm">Workflow Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalTimeline steps={steps} currentStep={request.current_step_number} actions={actions} />
            </CardContent>
          </Card>

          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-sm">Approval History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {actions.length ? (
                actions.map((action) => (
                  <div key={action.id} className="rounded-md border border-gray-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Badge className="border-gray-200 text-gray-600">{action.action}</Badge>
                      <span>Step {action.step_order || 0}</span>
                      <span>{action.approver_email}</span>
                      <span>{dayjs(action.action_date).format('YYYY-MM-DD HH:mm')}</span>
                    </div>
                    {action.comments ? <div className="mt-2 text-sm text-gray-700">{action.comments}</div> : null}
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No actions recorded yet.</div>
              )}
            </CardContent>
          </Card>

          {canApprove ? (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-sm">Action</CardTitle>
              </CardHeader>
              <CardContent>
                <ApprovalActionForm onSubmit={onAction} onCancel={onClose} loading={loading} />
              </CardContent>
            </Card>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

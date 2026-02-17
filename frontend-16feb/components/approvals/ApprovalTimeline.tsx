'use client';

import * as React from 'react';
import dayjs from 'dayjs';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ApprovalAction, ApprovalStep } from '@/types/workflows';

export interface ApprovalTimelineProps {
  steps: ApprovalStep[];
  currentStep: number;
  actions?: ApprovalAction[];
}

function stepStatus(step: ApprovalStep) {
  const status = String(step.step_status || '').toLowerCase();
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'in_progress') return 'current';
  if (status === 'pending') return 'pending';
  return 'pending';
}

function statusBadge(status: string) {
  if (status === 'approved') return 'border-green-200 text-green-700 bg-green-50';
  if (status === 'rejected') return 'border-red-200 text-red-700 bg-red-50';
  if (status === 'current') return 'border-blue-200 text-blue-700 bg-blue-50';
  return 'border-gray-200 text-gray-600 bg-gray-50';
}

function approverLabel(step: ApprovalStep) {
  const emails = step.approver_emails || [];
  const roles = step.approver_roles || [];
  if (emails.length) return emails.join(', ');
  if (roles.length) return roles.join(', ');
  return 'Unassigned';
}

export function ApprovalTimeline({ steps, actions, currentStep }: ApprovalTimelineProps) {
  return (
    <div className="space-y-3">
      {steps.map((step) => {
        let status = stepStatus(step);
        if (status === 'pending' && step.step_number === currentStep) {
          status = 'current';
        }
        const icon =
          status === 'approved' ? (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          ) : status === 'current' ? (
            <Clock className="h-4 w-4 text-blue-600" />
          ) : (
            <Circle className="h-4 w-4 text-gray-400" />
          );
        const action = actions?.find((a) => a.step_order === step.step_number && a.action !== 'comment');
        return (
          <div key={step.id} className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3">
            {icon}
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-gray-900">
                  Step {step.step_number}: {step.step_name}
                </div>
                <Badge className={statusBadge(status)}>{status}</Badge>
              </div>
              <div className="text-xs text-gray-500">Approver: {approverLabel(step)}</div>
              {action?.action_date ? (
                <div className="text-xs text-gray-500">
                  {action.action} on {dayjs(action.action_date).format('YYYY-MM-DD HH:mm')}
                </div>
              ) : null}
              {step.decision_notes ? <div className="text-xs text-gray-600">Notes: {step.decision_notes}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

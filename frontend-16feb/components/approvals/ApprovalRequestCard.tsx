'use client';

import * as React from 'react';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApprovalRequest } from '@/types/workflows';

export interface ApprovalRequestCardProps {
  request: ApprovalRequest;
  onClick: () => void;
}

function statusBadge(status: string) {
  const v = String(status || '').toLowerCase();
  if (v === 'approved') return 'border-green-200 text-green-700 bg-green-50';
  if (v === 'rejected') return 'border-red-200 text-red-700 bg-red-50';
  if (v === 'in_progress') return 'border-blue-200 text-blue-700 bg-blue-50';
  return 'border-yellow-200 text-yellow-700 bg-yellow-50';
}

export function ApprovalRequestCard({ request, onClick }: ApprovalRequestCardProps) {
  return (
    <Card className="border-gray-200">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{request.request_title}</CardTitle>
          <Badge className={statusBadge(request.overall_status)}>{request.overall_status}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-gray-500">
          <Badge className="border-gray-200 text-gray-600">{request.entity_type}</Badge>
          <span>Step {request.current_step_number || 1}</span>
          <span>Requested by {request.requested_by}</span>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          Requested {request.requested_at ? dayjs(request.requested_at).format('YYYY-MM-DD HH:mm') : '—'}
        </div>
        <Button size="sm" variant="outline" onClick={onClick}>
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

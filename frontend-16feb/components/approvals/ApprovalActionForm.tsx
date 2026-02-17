'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export interface ApprovalActionFormProps {
  onSubmit: (action: 'approve' | 'reject', comments: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ApprovalActionForm({ onSubmit, onCancel, loading }: ApprovalActionFormProps) {
  const [action, setAction] = React.useState<'approve' | 'reject'>('approve');
  const [comments, setComments] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  function submit() {
    setError(null);
    if (action === 'reject' && !comments.trim()) {
      setError('Comments are required when rejecting.');
      return;
    }
    if (!confirm(`Confirm ${action} this request?`)) return;
    onSubmit(action, comments.trim());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={action === 'approve' ? 'success' : 'outline'}
          onClick={() => setAction('approve')}
          size="sm"
          loading={loading && action === 'approve'}
        >
          Approve
        </Button>
        <Button
          variant={action === 'reject' ? 'danger' : 'outline'}
          onClick={() => setAction('reject')}
          size="sm"
          loading={loading && action === 'reject'}
        >
          Reject
        </Button>
      </div>
      <textarea
        className="min-h-[96px] w-full rounded-md border border-gray-300 bg-white p-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={action === 'reject' ? 'Add rejection reason (required)' : 'Add comments (optional)'}
        value={comments}
        onChange={(e) => setComments(e.target.value)}
      />
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onCancel} size="sm">
          Cancel
        </Button>
        <Button onClick={submit} size="sm" disabled={loading}>
          Submit
        </Button>
      </div>
    </div>
  );
}

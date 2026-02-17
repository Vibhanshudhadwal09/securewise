import React from 'react';
import { Badge } from '../ui/badge';

type Status = 'pending' | 'approved' | 'executing' | 'completed' | 'failed' | 'rejected' | 'blocked' | string;

function toVariant(status: Status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'success') return 'success';
  if (s === 'failed' || s === 'rejected' || s === 'blocked') return 'danger';
  if (s === 'executing' || s === 'approved') return 'warning';
  if (s === 'pending') return 'info';
  return 'neutral';
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={toVariant(status)}>{String(status || '-')}</Badge>;
}

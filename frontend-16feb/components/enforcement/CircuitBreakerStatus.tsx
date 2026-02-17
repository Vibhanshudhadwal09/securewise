import React from 'react';
import { Badge } from '../ui/badge';

export function CircuitBreakerStatus({ status }: { status?: string }) {
  const s = String(status || 'unknown').toLowerCase();
  const variant = s === 'open' ? 'danger' : s === 'half-open' ? 'warning' : s === 'closed' ? 'success' : 'neutral';
  return <Badge variant={variant}>{String(status || 'Unknown')}</Badge>;
}

import React from 'react';
import { Badge } from '../ui/badge';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | string;

function toVariant(sev: Severity) {
  const s = String(sev || '').toLowerCase();
  if (s === 'critical') return 'danger';
  if (s === 'high') return 'warning';
  if (s === 'medium') return 'info';
  if (s === 'low' || s === 'info') return 'neutral';
  return 'neutral';
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge variant={toVariant(severity)}>{String(severity || '-')}</Badge>;
}

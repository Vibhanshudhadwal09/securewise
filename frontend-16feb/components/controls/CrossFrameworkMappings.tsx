'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Mapping = {
  target_framework: string;
  target_control_id: string;
  target_title?: string | null;
  mapping_type: string;
  confidence: number;
};

export default function CrossFrameworkMappings({
  framework,
  controlId,
  tenantId,
}: {
  framework: string;
  controlId: string;
  tenantId?: string;
}) {
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/control-mappings/${encodeURIComponent(framework)}/${encodeURIComponent(controlId)}`, {
      credentials: 'include',
      headers: tenantId ? { 'x-tenant-id': tenantId } : undefined,
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setMappings(data.mappings || []))
      .catch((err) => setError(String(err?.message || err)));
    return () => controller.abort();
  }, [framework, controlId, tenantId]);

  if (error) {
    return (
      <Card className="p-4 border border-red-200 bg-red-50">
        <p className="text-sm text-red-700">Failed to load cross-framework mappings: {error}</p>
      </Card>
    );
  }

  if (mappings.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Cross-Framework Mappings</h3>
      <div className="space-y-2">
        {mappings.map((m, i) => (
          <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <div>
              <span className="font-mono text-sm">{String(m.target_framework || '').toUpperCase()}</span>{' '}
              <span className="font-semibold">{m.target_control_id}</span>
              {m.target_title ? <span className="text-sm text-gray-600"> — {m.target_title}</span> : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={m.mapping_type === 'equivalent' ? 'success' : 'neutral'}>{m.mapping_type}</Badge>
              <span className="text-xs text-gray-500">{Math.round(Number(m.confidence || 0) * 100)}%</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

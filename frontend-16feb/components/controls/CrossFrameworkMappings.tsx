'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/Loading';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/control-mappings/${encodeURIComponent(framework)}/${encodeURIComponent(controlId)}`, {
      credentials: 'include',
      headers: tenantId ? { 'x-tenant-id': tenantId } : undefined,
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setMappings(data.mappings || []))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(String(err?.message || err));
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [framework, controlId, tenantId]);

  if (loading) return <div className="p-4"><Loading /></div>;

  if (error) {
    return (
      <div className="p-4 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 rounded-xl">
        <p className="text-sm text-red-700 dark:text-red-400">Failed to load cross-framework mappings: {error}</p>
      </div>
    );
  }

  if (mappings.length === 0) return null;

  return (
    <div className="space-y-3">
      {mappings.map((m, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-lg">
          <div>
            <span className="font-mono text-sm text-[var(--accent-blue)] font-semibold">{String(m.target_framework || '').toUpperCase()}</span>{' '}
            <span className="font-semibold text-[var(--text-primary)]">{m.target_control_id}</span>
            {m.target_title ? <span className="text-sm text-[var(--text-secondary)]"> — {m.target_title}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs border ${m.mapping_type === 'equivalent' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}`}>
              {m.mapping_type}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">{Math.round(Number(m.confidence || 0) * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

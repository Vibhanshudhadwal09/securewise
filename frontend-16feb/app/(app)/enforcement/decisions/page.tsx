"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DecisionsList, type EnforcementDecisionRow } from '@/components/enforcement/DecisionsList';
import { Card } from '@/components/ui/card';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

export default function EnforcementDecisionsPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [decisions, setDecisions] = useState<EnforcementDecisionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTenantId(readCookie('sw_tenant') || 'demo-tenant');
  }, []);

  const offset = useMemo(() => (page - 1) * perPage, [page, perPage]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / perPage)), [total, perPage]);

  useEffect(() => {
    if (!tenantId) return;
    let mounted = true;
    let timer: any;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/enforcement/decisions?limit=${perPage}&offset=${offset}`, {
          headers: { 'x-tenant-id': tenantId },
          credentials: 'include',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Failed to load decisions (${res.status})`);
        if (!mounted) return;
        setDecisions(Array.isArray(data?.decisions) ? data.decisions : []);
        setTotal(Number(data?.total || 0));
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load enforcement decisions.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 5000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [tenantId, offset, perPage]);

  return (
    <div className="space-y-6">
      <PageHeader title="Enforcement Decisions" subtitle="Review automated enforcement decisions." icon={ShieldCheck} />

      {error ? (
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-medium">Unable to load decisions.</p>
          <p className="text-xs mt-1">{error}</p>
        </Card>
      ) : null}

      <DecisionsList decisions={decisions} onViewDetails={(id) => router.push(`/enforcement/decisions/${id}`)} />

      <Card className="p-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Page {page} of {totalPages} • {total} total decisions
        </span>
        <div className="flex items-center gap-3">
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-gray-400"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </Card>
    </div>
  );
}

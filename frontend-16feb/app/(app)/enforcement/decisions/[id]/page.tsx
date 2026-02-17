"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { VendorSelectionCard } from '@/components/enforcement/VendorSelectionCard';
import { ExecutionTimeline } from '@/components/enforcement/ExecutionTimeline';
import { StatusBadge } from '@/components/enforcement/StatusBadge';
import { SeverityBadge } from '@/components/enforcement/SeverityBadge';
import { Card } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

export default function DecisionDetailPage() {
  const params = useParams();
  const decisionId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [decision, setDecision] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTenantId(readCookie('sw_tenant') || 'demo-tenant');
  }, []);

  useEffect(() => {
    if (!decisionId || !tenantId) return;
    let mounted = true;
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await fetch(`/api/enforcement/decisions/${decisionId}`, {
          headers: { 'x-tenant-id': tenantId },
          credentials: 'include',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Failed to load decision (${res.status})`);
        if (mounted) setDecision(data?.decision || null);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load decision');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
  }, [decisionId, tenantId]);

  const timelineEvents = useMemo(() => {
    if (!decision) return [];
    return [
      { label: 'Decision created', time: decision.created_at, status: 'pending' },
      { label: 'Approved', time: decision.approved_at, status: decision.requires_approval ? 'approved' : 'completed' },
      { label: 'Executed', time: decision.executed_at || decision.updated_at, status: decision.execution_status },
      { label: 'Completed', time: decision.updated_at, status: decision.execution_status },
    ];
  }, [decision]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading decision details...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-medium">Unable to load decision.</p>
          <p className="text-xs mt-1">{error}</p>
        </Card>
      </div>
    );
  }

  if (!decision) {
    return <div className="p-6 text-sm text-gray-500">Decision not found.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enforcement Decision"
        subtitle={`Decision ${decision.decision_id}`}
        icon={ShieldCheck}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">Signal Context</h3>
          <div className="text-sm text-gray-600">Signal Type: {decision.signal_type || '-'}</div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Severity: <SeverityBadge severity={decision.signal_severity || ''} />
          </div>
          <div className="text-sm text-gray-600">Vendor: {decision.signal_vendor || '-'}</div>
          <div className="text-sm text-gray-600">Title: {decision.signal_title || '-'}</div>
          <div className="text-sm text-gray-600">Asset: {decision.asset_name || '-'}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">Control Violation</h3>
          <div className="text-sm text-gray-600">Control: {decision.control_name || decision.control_id || '-'}</div>
          <div className="text-sm text-gray-600">Violation: {decision.violation_type || '-'}</div>
          <div className="text-sm text-gray-600">Action: {decision.action_type || '-'}</div>
          <div className="text-sm text-gray-600">Target: {decision.target_id || '-'}</div>
        </Card>

        <Card className="p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-800">Execution</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Status: <StatusBadge status={decision.execution_status || '-'} />
          </div>
          <div className="text-sm text-gray-600">Success: {decision.success ? 'Yes' : 'No'}</div>
          <div className="text-sm text-gray-600">Execution Time: {decision.execution_time_ms || 0} ms</div>
          <div className="text-sm text-gray-600">Error: {decision.error_message || 'None'}</div>
        </Card>
      </div>

      <VendorSelectionCard
        vendor={decision.selected_vendor}
        score={decision.vendor_score}
        reasoning={decision.selection_reason}
        warnings={decision.vendor_warnings || []}
      />

      <ExecutionTimeline events={timelineEvents} />

      <Card className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-800">Result Details</h3>
        <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 border rounded p-3">
          {JSON.stringify(decision.result_details || {}, null, 2)}
        </pre>
      </Card>
    </div>
  );
}

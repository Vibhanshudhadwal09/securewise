'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ShieldCheck } from 'lucide-react';
import { ViolationsList, type ViolationRow } from '@/components/enforcement/ViolationsList';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/Toast';
import { usePermissions } from '@/lib/permissions';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

export default function ViolationsPage() {
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [severityFilter, setSeverityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { can, isAdmin, isLoading: permissionsLoading } = usePermissions();
  const canApprove = isAdmin || can('enforcement.approve');

  useEffect(() => {
    setTenantId(readCookie('sw_tenant') || 'demo-tenant');
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (severityFilter) params.set('severity', severityFilter);
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    params.set('limit', '100');
    params.set('offset', '0');
    return params.toString();
  }, [statusFilter, severityFilter, fromDate, toDate]);

  useEffect(() => {
    if (!tenantId) return;
    let mounted = true;
    let timer: any;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/enforcement/violations?${query}`, {
          headers: { 'x-tenant-id': tenantId },
          credentials: 'include',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Failed to load violations (${res.status})`);
        if (!mounted) return;
        setViolations(Array.isArray(data?.violations) ? data.violations : []);
        setCounts({
          total: data?.total || 0,
          pending: data?.pending || 0,
          approved: data?.approved || 0,
          executing: data?.executing || 0,
          completed: data?.completed || 0,
          failed: data?.failed || 0,
          rejected: data?.rejected || 0,
        });
        setSelected(new Set());
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load violations');
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
  }, [tenantId, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) return setSelected(new Set());
    setSelected(new Set(violations.map((v) => v.violation_id)));
  };

  const runAction = async (path: string, ids: string[]) => {
    if (ids.length === 0 || actionBusy) return;
    if (!canApprove) {
      toast.error('Permission denied', 'You do not have enforcement approval permission.');
      return;
    }
    setActionBusy(true);
    try {
      await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/enforcement/violations/${id}/${path}`, {
            method: path === 'retry' ? 'POST' : 'PUT',
            headers: { 'x-tenant-id': tenantId },
            credentials: 'include',
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            throw new Error(data?.error || `Failed to ${path} violation (${res.status})`);
          }
        })
      );
      toast.success(`Violation${ids.length > 1 ? 's' : ''} ${path}ed`);
    } catch (err: any) {
      toast.error(`Failed to ${path} violation`, err?.message || 'Please try again');
    } finally {
      setActionBusy(false);
    }
  };

  const bulkApprove = async () => {
    await runAction('approve', Array.from(selected));
  };

  const bulkReject = async () => {
    await runAction('reject', Array.from(selected));
  };

  const bulkRetry = async () => {
    await runAction('retry', Array.from(selected));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Control Violations"
        subtitle="Monitor violations and manage automated enforcement approvals."
        icon={ShieldCheck}
      />

      {error ? (
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-medium">Unable to load violations.</p>
          <p className="text-xs mt-1">{error}</p>
        </Card>
      ) : null}

      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="text-xs text-gray-600">
            Status
            <select
              className="ml-2 border rounded px-2 py-1 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="executing">Executing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Severity
            <select
              className="ml-2 border rounded px-2 py-1 text-sm"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            From
            <input
              type="date"
              className="ml-2 border rounded px-2 py-1 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="text-xs text-gray-600">
            To
            <input
              type="date"
              className="ml-2 border rounded px-2 py-1 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          <span>Total: {counts.total || 0}</span>
          <span>Pending: {counts.pending || 0}</span>
          <span>Approved: {counts.approved || 0}</span>
          <span>Executing: {counts.executing || 0}</span>
          <span>Completed: {counts.completed || 0}</span>
          <span>Failed: {counts.failed || 0}</span>
          <span>Rejected: {counts.rejected || 0}</span>
        </div>
        <div className="flex gap-3">
          <button
            className="text-xs font-medium text-green-600 hover:text-green-800"
            disabled={selected.size === 0 || loading || actionBusy || permissionsLoading || !canApprove}
            onClick={bulkApprove}
          >
            Approve Selected
          </button>
          <button
            className="text-xs font-medium text-red-600 hover:text-red-800"
            disabled={selected.size === 0 || loading || actionBusy || permissionsLoading || !canApprove}
            onClick={bulkReject}
          >
            Reject Selected
          </button>
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
            disabled={selected.size === 0 || loading || actionBusy || permissionsLoading || !canApprove}
            onClick={bulkRetry}
          >
            Retry Selected
          </button>
        </div>
        {!permissionsLoading && !canApprove ? (
          <p className="text-xs text-amber-600">
            You do not have permission to approve or retry enforcement actions.
          </p>
        ) : null}
      </Card>

      <ViolationsList
        violations={violations}
        selectedIds={selected}
        onToggle={toggle}
        onToggleAll={toggleAll}
        onApprove={(id) => runAction('approve', [id])}
        onReject={(id) => runAction('reject', [id])}
        onRetry={(id) => runAction('retry', [id])}
        actionDisabled={loading || actionBusy || permissionsLoading || !canApprove}
      />
    </div>
  );
}

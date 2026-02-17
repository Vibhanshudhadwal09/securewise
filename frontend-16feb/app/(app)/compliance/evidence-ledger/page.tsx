'use client';

import { useEffect, useState } from 'react';
import { useCompliance } from '@/contexts/ComplianceContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  action_category: string;
  action_description: string;
  target_type: string;
  target_id: string;
  target_name?: string;
  before_state?: any;
  after_state?: any;
  changes?: any;
  created_at: string;
  success: boolean;
  error_message?: string;
}

export default function EvidenceLedgerPage() {
  const { framework, periodId } = useCompliance();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('');
  const [targetIdFilter, setTargetIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, userFilter, targetIdFilter, dateFrom, dateTo]);

  async function loadLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        action_category: 'evidence',
        limit: '100',
      });

      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (userFilter) params.append('user_email', userFilter);
      if (targetIdFilter) params.append('target_id', targetIdFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to load audit logs');
      const data = await res.json();

      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const actionColors: Record<string, string> = {
    'evidence.create': 'bg-blue-100 text-blue-700',
    'evidence.review': 'bg-purple-100 text-purple-700',
    'evidence.approve': 'bg-green-100 text-green-700',
    'evidence.reject': 'bg-red-100 text-red-700',
    'evidence.submit': 'bg-yellow-100 text-yellow-700',
    'evidence.map_control': 'bg-cyan-100 text-cyan-700',
    'evidence.unmap_control': 'bg-slate-100 text-slate-600',
    'evidence.bulk_review': 'bg-purple-100 text-purple-700',
  };

  if (loading) {
    return <div className="p-8">Loading evidence ledger...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Evidence Ledger</h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete audit trail of evidence operations ({total} total events)
        </p>
        <div className="text-xs text-slate-500 mt-2">
          Framework: {framework.toUpperCase()}
          {periodId ? ` · Period: ${periodId}` : ' · Period: All time'}
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Actions</option>
              <option value="evidence.create">Create</option>
              <option value="evidence.review">Review</option>
              <option value="evidence.approve">Approve</option>
              <option value="evidence.reject">Reject</option>
              <option value="evidence.submit">Submit</option>
              <option value="evidence.map_control">Map Control</option>
              <option value="evidence.unmap_control">Unmap Control</option>
              <option value="evidence.bulk_review">Bulk Review</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
            <input
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Search by email"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Evidence ID</label>
            <input
              type="text"
              value={targetIdFilter}
              onChange={(e) => setTargetIdFilter(e.target.value)}
              placeholder="Filter by ID"
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">No audit logs found matching the selected filters.</Card>
        ) : (
          logs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={actionColors[log.action] || 'bg-slate-100 text-slate-600'}>
                      {String(log.action || '').replace('evidence.', '')}
                    </Badge>
                    <span className="text-sm text-slate-600">{new Date(log.created_at).toLocaleString()}</span>
                    <span className="text-sm text-slate-600">by {log.user_email || 'unknown'}</span>
                  </div>

                  <p className="text-sm text-slate-900 mb-2">{log.action_description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Evidence: {String(log.target_id || '').slice(0, 8)}...</span>
                    {log.target_name ? <span>Control: {log.target_name}</span> : null}
                  </div>

                  {log.changes && Object.keys(log.changes).length > 0 ? (
                    <div className="mt-3 p-2 bg-slate-50 rounded text-xs">
                      <span className="font-medium">Changes:</span>
                      <pre className="mt-1 text-slate-600 whitespace-pre-wrap">{JSON.stringify(log.changes, null, 2)}</pre>
                    </div>
                  ) : null}

                  {log.after_state && Object.keys(log.after_state).length > 0 ? (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">View Details</summary>
                      <pre className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600 whitespace-pre-wrap">
                        {JSON.stringify(log.after_state, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>

                {!log.success ? <Badge className="bg-red-100 text-red-700">Failed</Badge> : null}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

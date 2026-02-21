'use client';

import { useEffect, useState } from 'react';
import { useCompliance } from '@/contexts/ComplianceContext';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';
import { BookOpen, Search, ChevronDown } from 'lucide-react';

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

// Map action → badge variant
function actionVariant(action: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  if (action.includes('approve') || action.includes('create')) return 'success';
  if (action.includes('reject')) return 'danger';
  if (action.includes('submit') || action.includes('bulk')) return 'warning';
  if (action.includes('review') || action.includes('map')) return 'info';
  return 'neutral';
}

function actionLabel(action: string) {
  return String(action || '').replace('evidence.', '').replace(/_/g, ' ');
}

const inputCls = 'w-full rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] placeholder:text-[var(--text-tertiary)]';

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
      const params = new URLSearchParams({ action_category: 'evidence', limit: '100' });
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (userFilter) params.append('user_email', userFilter);
      if (targetIdFilter) params.append('target_id', targetIdFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await fetch(`/api/audit-logs?${params.toString()}`, { credentials: 'include' });
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

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <PageHeader
        title="Evidence Ledger"
        description="Complete immutable audit trail of all evidence operations."
        icon={BookOpen}
        breadcrumbs={[
          { label: 'GRC / Compliance' },
          { label: 'Evidence Ledger' },
        ]}
        stats={[
          { label: 'Total Events', value: total },
          { label: 'Showing', value: logs.length },
        ]}
      />

      <div className="max-w-[1400px] mx-auto px-8 py-8 space-y-6">

        {/* Context strip */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <span className="px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--card-border)] font-medium uppercase tracking-wider">
            {framework.toUpperCase()}
          </span>
          <span className="opacity-40">/</span>
          <span>{periodId ? `Period: ${periodId}` : 'All time'}</span>
        </div>

        {/* Filters */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Action */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Action</label>
              <div className="relative">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className={`appearance-none ${inputCls} pr-8`}
                >
                  <option value="all" className="bg-[var(--bg-primary)]">All Actions</option>
                  <option value="evidence.create" className="bg-[var(--bg-primary)]">Create</option>
                  <option value="evidence.review" className="bg-[var(--bg-primary)]">Review</option>
                  <option value="evidence.approve" className="bg-[var(--bg-primary)]">Approve</option>
                  <option value="evidence.reject" className="bg-[var(--bg-primary)]">Reject</option>
                  <option value="evidence.submit" className="bg-[var(--bg-primary)]">Submit</option>
                  <option value="evidence.map_control" className="bg-[var(--bg-primary)]">Map Control</option>
                  <option value="evidence.unmap_control" className="bg-[var(--bg-primary)]">Unmap Control</option>
                  <option value="evidence.bulk_review" className="bg-[var(--bg-primary)]">Bulk Review</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[var(--text-secondary)]" />
              </div>
            </div>

            {/* User */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">User</label>
              <div className="relative">
                <input type="text" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} placeholder="Search by email" className={inputCls + ' pl-9'} />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[var(--text-secondary)]" />
              </div>
            </div>

            {/* Evidence ID */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Evidence ID</label>
              <input type="text" value={targetIdFilter} onChange={(e) => setTargetIdFilter(e.target.value)} placeholder="Filter by ID" className={inputCls} />
            </div>

            {/* From */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">From Date</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls + ' [color-scheme:dark]'} />
            </div>

            {/* To */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">To Date</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls + ' [color-scheme:dark]'} />
            </div>
          </div>
        </div>

        {/* Log list */}
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Audit Events</h3>
            <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--card-border)]">
              {logs.length} of {total} events
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[var(--text-secondary)] animate-pulse">
              Loading evidence ledger…
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-[var(--text-secondary)]">
              No audit logs found matching the selected filters.
            </div>
          ) : (
            <div className="divide-y divide-[var(--card-border)]">
              {logs.map((log) => (
                <div key={log.id} className="p-5 hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Action row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant={actionVariant(log.action)} className="capitalize">
                          {actionLabel(log.action)}
                        </Badge>
                        {!log.success && (
                          <Badge variant="danger">Failed</Badge>
                        )}
                        <span className="text-xs text-[var(--text-secondary)]">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          by <span className="text-[var(--accent-blue)]">{log.user_email || 'unknown'}</span>
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[var(--text-primary)] mb-2">{log.action_description}</p>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-tertiary)]">
                        <span>Evidence: <span className="font-mono text-[var(--accent-blue)]">{String(log.target_id || '').slice(0, 8)}…</span></span>
                        {log.target_name && <span>Control: <span className="text-[var(--text-secondary)]">{log.target_name}</span></span>}
                      </div>

                      {/* Changes diff */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] p-3 text-xs">
                          <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Changes</span>
                          <pre className="mt-1 text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* After state expandable */}
                      {log.after_state && Object.keys(log.after_state).length > 0 && (
                        <details className="mt-2 group">
                          <summary className="text-xs text-[var(--accent-blue)] cursor-pointer hover:underline select-none list-none flex items-center gap-1">
                            <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                            View after state
                          </summary>
                          <pre className="mt-2 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)] text-xs text-[var(--text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                            {JSON.stringify(log.after_state, null, 2)}
                          </pre>
                        </details>
                      )}

                      {/* Error */}
                      {log.error_message && (
                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

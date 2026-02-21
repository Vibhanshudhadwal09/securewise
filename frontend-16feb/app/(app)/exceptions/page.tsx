import React from 'react';
import { FileText, Plus, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../../../lib/server-api';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/PageHeader';

function statusBadge(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return <Badge variant="success">Active</Badge>;
  if (s === 'pending') return <Badge variant="warning">Pending</Badge>;
  if (s === 'rejected') return <Badge variant="danger">Rejected</Badge>;
  if (s === 'draft') return <Badge variant="neutral">Draft</Badge>;
  return <Badge variant="neutral">{s || 'Unknown'}</Badge>;
}

async function getJson(path: string, tenantId?: string) {
  const res = await apiFetch(path, { tenantId: tenantId || 'demo-tenant' });
  return res.json();
}

export default async function Exceptions() {
  const tenantId = 'demo-tenant';
  const data = await getJson('exceptions', tenantId);
  const items = (data.items || []) as any[];

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'control_id', label: 'Control' },
    { key: 'status', label: 'Status' },
    { key: 'valid_until', label: 'Valid Until' },
    { key: 'requested_by', label: 'Requested By' },
    { key: 'approved_by', label: 'Approved By' },
    { key: 'exception_id', label: 'Exception ID' },
  ];

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <PageHeader
        title="Exceptions"
        description="First-class policy exceptions with approval lifecycle and expiry."
        icon={ShieldAlert}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Exceptions' },
        ]}
        stats={[
          { label: 'Total', value: items.length },
          { label: 'Active', value: items.filter((e: any) => String(e.status || '') === 'active').length },
          { label: 'Pending', value: items.filter((e: any) => String(e.status || '') === 'pending').length },
        ]}
        actions={
          <a
            href="/exceptions/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-blue-500 transition-colors text-sm font-semibold shadow-md"
          >
            <Plus className="w-4 h-4" />
            Create Exception
          </a>
        }
      />

      <div className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden shadow-sm">

          {/* Card header */}
          <div className="p-5 border-b border-[var(--card-border)] flex items-center justify-between">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Exception Register</h3>
            <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-3 py-1 rounded-full border border-[var(--card-border)]">
              {items.length} total
            </span>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-8">
              <div className="w-14 h-14 rounded-full bg-[var(--bg-secondary)] border border-[var(--card-border)] flex items-center justify-center">
                <FileText className="w-7 h-7 text-[var(--text-secondary)]" />
              </div>
              <div>
                <div className="text-base font-semibold text-[var(--text-primary)]">No exceptions yet</div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">Create an exception to document and approve policy deviations.</div>
              </div>
              <a
                href="/exceptions/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg text-sm font-semibold hover:bg-blue-500 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Exception
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--bg-secondary)] border-b border-[var(--card-border)] text-[var(--text-secondary)]">
                  <tr>
                    {columns.map((col) => (
                      <th key={col.key} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {items.map((e: any) => (
                    <tr key={e.exception_id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                      {/* Title */}
                      <td className="px-5 py-4">
                        <a href={`/exceptions/${e.exception_id}`} className="block">
                          <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                            {e.title}
                          </div>
                          {e.description && (
                            <div className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{e.description}</div>
                          )}
                        </a>
                      </td>
                      {/* Control */}
                      <td className="px-5 py-4 font-mono text-xs text-[var(--accent-blue)]">{e.control_id || '-'}</td>
                      {/* Status */}
                      <td className="px-5 py-4">{statusBadge(e.status)}</td>
                      {/* Valid Until */}
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {e.valid_until
                          ? new Date(e.valid_until).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : '-'}
                      </td>
                      {/* Requested By */}
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{e.requested_by || '-'}</td>
                      {/* Approved By */}
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">{e.approved_by || '-'}</td>
                      {/* Exception ID */}
                      <td className="px-5 py-4 font-mono text-xs text-[var(--text-tertiary)]">
                        {String(e.exception_id || '').slice(0, 8)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

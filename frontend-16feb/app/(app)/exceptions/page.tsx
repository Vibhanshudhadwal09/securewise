import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { apiFetch } from '../../../lib/server-api';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

function statusBadge(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return <Badge variant="success">Active</Badge>;
  if (s === 'pending') return <Badge variant="warning">Pending</Badge>;
  if (s === 'rejected') return <Badge variant="danger">Rejected</Badge>;
  if (s === 'draft') return <Badge>Draft</Badge>;
  return <Badge>{s || 'Unknown'}</Badge>;
}

async function getJson(path: string, tenantId?: string) {
  const res = await apiFetch(path, { tenantId: tenantId || 'demo-tenant' });
  return res.json();
}

export default async function Exceptions() {
  const tenantId = 'demo-tenant';
  const data = await getJson('exceptions', tenantId);
  const items = (data.items || []) as any[];

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Exceptions"
        description="First-class policy exceptions with approval lifecycle and expiry (audit-only)."
        icon={FileText}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Exceptions' },
        ]}
        stats={[
          { label: 'Total', value: items.length },
          { label: 'Active', value: items.filter((e: any) => String(e.status || '') === 'active').length },
        ]}
        actions={
          <a
            href="/exceptions/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            Create Exception
          </a>
        }
      />

      <div className="p-8 space-y-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          {items.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No exceptions yet"
              description="Create an exception to document and approve policy deviations."
              action={{ label: 'Create Exception', onClick: () => (window.location.href = '/exceptions/new'), icon: Plus }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    {['title', 'control_id', 'status', 'valid_until', 'requested_by', 'approved_by', 'exception_id'].map((h) => (
                      <th key={h} className="px-5 py-3">
                        {h.replace('_', ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((e: any) => (
                    <tr key={e.exception_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <a href={`/exceptions/${e.exception_id}`} className="block">
                          <div className="font-semibold text-gray-900">{e.title}</div>
                          <div className="text-xs text-gray-600">{e.description || ''}</div>
                        </a>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{e.control_id}</td>
                      <td className="px-5 py-3">{statusBadge(e.status)}</td>
                      <td className="px-5 py-3 text-gray-700">{e.valid_until || '-'}</td>
                      <td className="px-5 py-3 text-gray-700">{e.requested_by || '-'}</td>
                      <td className="px-5 py-3 text-gray-700">{e.approved_by || '-'}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{e.exception_id}</td>
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

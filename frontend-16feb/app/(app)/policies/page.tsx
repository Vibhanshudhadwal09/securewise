'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { FormField } from '@/components/ui/FormField';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/PageHeader';

function readCookie(name: string): string | null {
  const cur = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
  return json;
}

function statusBadge(status: string) {
  const s = String(status || 'draft');
  if (s === 'published') return <Badge variant="success">Published</Badge>;
  if (s === 'approved') return <Badge variant="info">Approved</Badge>;
  if (s === 'in_review') return <Badge variant="warning">In review</Badge>;
  if (s === 'archived' || s === 'retired') return <Badge>Archived</Badge>;
  return <Badge>Draft</Badge>;
}

function categoryBadge(category: string) {
  return <Badge variant="info">{String(category || 'other')}</Badge>;
}

function fmtDate(d: any) {
  if (!d) return '-';
  return String(d).slice(0, 10);
}

export default function PoliciesPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const toast = useToast();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createForm, setCreateForm] = useState<any>({
    policy_number: '',
    title: '',
    description: '',
    category: 'security',
    policy_type: 'organizational',
    owner: '',
    effective_date: '',
    review_frequency_days: 365,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filters.status) qs.set('status', filters.status);
      if (filters.category) qs.set('category', filters.category);
      const j = await fetchJson(`/api/policies?${qs.toString()}`, tenantId);
      const rows = Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : [];
      setItems(rows);
    } catch (e) {
      console.error('Failed to load policies:', e);
      setError(e instanceof Error ? e.message : 'Failed to load policies');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, filters.status, filters.category]);

  async function createPolicy() {
    setCreateBusy(true);
    try {
      const payload: any = {
        policy_number: String(createForm.policy_number || '').trim() || undefined,
        title: String(createForm.title || '').trim(),
        description: String(createForm.description || '').trim() || undefined,
        category: String(createForm.category || 'other'),
        policy_type: String(createForm.policy_type || 'organizational'),
        owner: String(createForm.owner || '').trim() || undefined,
        effective_date: String(createForm.effective_date || '').trim() || undefined,
        review_frequency_days: Number(createForm.review_frequency_days || 365),
      };
      if (!payload.title) throw new Error('Title is required');

      const res = await fetch('/api/policies', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));

      setCreateOpen(false);
      setCreateForm({
        policy_number: '',
        title: '',
        description: '',
        category: 'security',
        policy_type: 'organizational',
        owner: '',
        effective_date: '',
        review_frequency_days: 365,
      });
      toast.success('Policy created');
      await load();
    } catch (e) {
      console.error('Failed to create policy:', e);
      toast.error('Failed to create policy', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setCreateBusy(false);
    }
  }

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((p) => {
      const title = String(p.title || '').toLowerCase();
      const desc = String(p.description || '').toLowerCase();
      const num = String(p.policy_number || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || num.includes(q);
    });
  }, [items, searchQuery]);

  const stats = useMemo(() => {
    const total = items.length;
    const published = items.filter((p) => String(p.status || '') === 'published').length;
    const inReview = items.filter((p) => String(p.status || '') === 'in_review').length;
    return { total, published, inReview };
  }, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Policies"
        description="Policy library with version control, control linkages, and attestations."
        icon={FileText}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Policies' },
        ]}
        stats={[
          { label: 'Total', value: stats.total },
          { label: 'Published', value: stats.published },
          { label: 'In review', value: stats.inReview },
        ]}
        actions={
          <Button variant="primary" size="lg" icon={<Plus className="w-5 h-5" />} onClick={() => setCreateOpen(true)}>
            Create policy
          </Button>
        }
      />

      <div className="p-8 space-y-8">

      <div className="rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by policy title, description, or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            />
          </div>
          <select
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          >
            <option value="">All statuses</option>
            <option value="draft">draft</option>
            <option value="in_review">in_review</option>
            <option value="approved">approved</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
            <option value="retired">retired</option>
          </select>
          <select
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
            value={filters.category}
            onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value }))}
          >
            <option value="">All categories</option>
            <option value="security">security</option>
            <option value="privacy">privacy</option>
            <option value="hr">hr</option>
            <option value="compliance">compliance</option>
            <option value="operational">operational</option>
            <option value="financial">financial</option>
            <option value="other">other</option>
          </select>
        </div>
      </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          {loading ? (
            <div className="px-6 py-8 text-sm text-gray-600">Loading…</div>
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No policies found"
              description={searchQuery ? 'Try adjusting your search or filters.' : 'Create your first policy to get started.'}
              action={{ label: 'Create policy', onClick: () => setCreateOpen(true), icon: Plus }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Policy #</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Current version</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Next review</th>
                    <th className="px-5 py-3">Attestations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredItems.map((p) => (
                    <tr
                      key={String(p.id)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => (window.location.href = `/policies/${encodeURIComponent(String(p.id))}`)}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{String(p.policy_number || '-')}</td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-gray-900">{String(p.title || '')}</div>
                        {p.description ? <div className="text-xs text-gray-600">{String(p.description).slice(0, 120)}</div> : null}
                      </td>
                      <td className="px-5 py-3">{categoryBadge(String(p.category || 'other'))}</td>
                      <td className="px-5 py-3">{statusBadge(String(p.status || 'draft'))}</td>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600">{String(p.current_version || '-')}</td>
                      <td className="px-5 py-3 text-gray-700">{String(p.owner || '-')}</td>
                      <td className="px-5 py-3 text-gray-700">{fmtDate(p.next_review_date)}</td>
                      <td className="px-5 py-3 text-gray-700">{String(p.attestation_count ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create policy</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Policy # (optional)"
                name="policy_number"
                value={createForm.policy_number}
                onChange={(e) => setCreateForm((p: any) => ({ ...p, policy_number: e.target.value }))}
                placeholder="POL-001"
              />
              <FormField
                label="Owner (optional)"
                name="owner"
                value={createForm.owner}
                onChange={(e) => setCreateForm((p: any) => ({ ...p, owner: e.target.value }))}
                placeholder="owner@company.com"
              />
            </div>

            <FormField
              label="Title"
              name="title"
              required
              value={createForm.title}
              onChange={(e) => setCreateForm((p: any) => ({ ...p, title: e.target.value }))}
            />

            <FormField
              label="Description"
              name="description"
              type="textarea"
              value={createForm.description}
              onChange={(e) => setCreateForm((p: any) => ({ ...p, description: e.target.value }))}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                label="Category"
                name="category"
                type="select"
                value={createForm.category}
                onChange={(e) => setCreateForm((p: any) => ({ ...p, category: e.target.value }))}
                options={[
                  { value: 'security', label: 'security' },
                  { value: 'privacy', label: 'privacy' },
                  { value: 'hr', label: 'hr' },
                  { value: 'compliance', label: 'compliance' },
                  { value: 'operational', label: 'operational' },
                  { value: 'financial', label: 'financial' },
                  { value: 'other', label: 'other' },
                ]}
              />
              <FormField
                label="Policy type"
                name="policy_type"
                type="select"
                value={createForm.policy_type}
                onChange={(e) => setCreateForm((p: any) => ({ ...p, policy_type: e.target.value }))}
                options={[
                  { value: 'organizational', label: 'organizational' },
                  { value: 'technical', label: 'technical' },
                  { value: 'administrative', label: 'administrative' },
                ]}
              />
              <FormField
                label="Effective date"
                name="effective_date"
                type="date"
                value={createForm.effective_date}
                onChange={(e) => setCreateForm((p: any) => ({ ...p, effective_date: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Review frequency (days)"
                name="review_frequency_days"
                type="number"
                value={createForm.review_frequency_days}
                onChange={(e) => setCreateForm((p: any) => ({ ...p, review_frequency_days: Number(e.target.value || 365) }))}
                helpText="Next review date will be computed from effective date + review frequency."
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={createBusy} onClick={createPolicy}>
              Create policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


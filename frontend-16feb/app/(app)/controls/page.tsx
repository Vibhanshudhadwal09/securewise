'use client';

import React, { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { PageHeader } from '@/components/PageHeader';
import CrossFrameworkMappings from '@/components/controls/CrossFrameworkMappings';

type FrameworkId = 'soc2' | 'iso27001';

type ControlRow = {
  control_id: string;
  title: string;
  enforceability: string | null;
  evidence_status: string | null;
  last_evidence_at: string | null;
  stale: boolean;
  category?: string | null;
  implementation_status?: string | null;
  implementation_notes?: string | null;
  owner_email?: string | null;
  updated_at?: string | null;
};

async function fetchJson(path: string, tenantId: string) {
  const res = await fetch(path, {
    method: 'GET',
    credentials: 'include',
    headers: { 'x-tenant-id': tenantId },
    cache: 'no-store',
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
  return j;
}

function tscGroup(controlId: string): string {
  // SOC2 IDs look like CC1.1, CC2.3, A1.2, etc.
  const s = String(controlId || '');
  const m = s.match(/^([A-Z]{1,3}\d+)(?:\..*)?$/);
  return m?.[1] || s.split('.')[0] || s;
}

function implTag(v: any) {
  const s = String(v || '');
  if (!s) return <Tag>unknown</Tag>;
  if (s === 'implemented') return <Tag color="green">implemented</Tag>;
  if (s === 'in_progress') return <Tag color="gold">in_progress</Tag>;
  if (s === 'not_started') return <Tag>not_started</Tag>;
  if (s === 'blocked') return <Tag color="red">blocked</Tag>;
  return <Tag>{s}</Tag>;
}

function evidenceTag(status: any, stale: any) {
  const s = String(status || '');
  if (!s) return <Tag>n/a</Tag>;
  if (s === 'fresh') return <Tag color="green">fresh</Tag>;
  if (s === 'overdue') return <Tag color="gold">overdue</Tag>;
  if (s === 'missing') return <Tag>missing</Tag>;
  if (stale) return <Tag color="red">stale</Tag>;
  return <Tag>{s}</Tag>;
}

export default function ControlsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tenantId = sp.get('tenantId') || 'demo-tenant';

  const [framework, setFramework] = useState<FrameworkId>((sp.get('framework') as FrameworkId) || 'soc2');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string>('all');
  const [impl, setImpl] = useState<string>('all');
  const [mappingControlId, setMappingControlId] = useState<string>('');

  const apiUrl = useMemo(() => {
    const qs = new URLSearchParams({
      tenantId,
      framework,
      slaHours: String(sp.get('slaHours') || 72),
      enforceability: String(sp.get('enforceability') || 'all'),
      staleOnly: String(sp.get('staleOnly') || 'false'),
    });
    return `/api/controls?${qs.toString()}`;
  }, [tenantId, framework, sp]);

  const { data, error, isLoading, mutate } = useSWR<{ items: ControlRow[] }>(apiUrl, (u) => fetchJson(u, tenantId), {
    revalidateOnFocus: false,
  });

  const items = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data]);
  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const r of items) set.add(tscGroup(r.control_id));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((r) => {
      if (group !== 'all' && tscGroup(r.control_id) !== group) return false;
      if (impl !== 'all' && String(r.implementation_status || '') !== impl) return false;
      if (!qq) return true;
      return (
        String(r.control_id || '').toLowerCase().includes(qq) ||
        String(r.title || '').toLowerCase().includes(qq) ||
        String(r.owner_email || '').toLowerCase().includes(qq)
      );
    });
  }, [items, q, group, impl]);

  useEffect(() => {
    if (!mappingControlId && filtered.length > 0) {
      setMappingControlId(String(filtered[0].control_id));
    }
  }, [filtered, mappingControlId]);

  const metrics = useMemo(() => {
    const total = items.length;
    const implemented = items.filter((r) => String(r.implementation_status || '') === 'implemented').length;
    const inProgress = items.filter((r) => String(r.implementation_status || '') === 'in_progress').length;
    const notStarted = items.filter((r) => String(r.implementation_status || '') === 'not_started').length;
    const coveragePct = total ? Math.round((implemented / total) * 100) : 0;
    return { total, implemented, inProgress, notStarted, coveragePct };
  }, [items]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50 to-gray-50">
      <PageHeader
        title="Controls"
        description="Browse controls for the selected framework and open the Control Workbench to perform compliance actions."
        icon={Shield}
        breadcrumbs={[
          { label: 'GRC / Compliance' },
          { label: 'Controls' },
        ]}
        stats={[
          { label: 'Total Controls', value: metrics.total },
          { label: 'Frameworks', value: 2 },
        ]}
        actions={
          <Space>
            <Button onClick={() => mutate()} loading={isLoading}>
              Refresh
            </Button>
            <Button onClick={() => router.push(`/compliance?tenantId=${encodeURIComponent(tenantId)}`)}>
              Compliance Overview
            </Button>
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Implemented"
            value={metrics.implemented}
            subtitle="Ready for audit"
            icon={CheckCircle}
            color="green"
            progress={metrics.coveragePct}
          />
          <MetricCard
            title="In Progress"
            value={metrics.inProgress}
            subtitle="Being configured"
            icon={Clock}
            color="blue"
            progress={metrics.total ? Math.round((metrics.inProgress / metrics.total) * 100) : 0}
          />
          <MetricCard
            title="Not Started"
            value={metrics.notStarted}
            subtitle="Needs attention"
            icon={AlertCircle}
            color="orange"
            progress={metrics.total ? Math.round((metrics.notStarted / metrics.total) * 100) : 0}
          />
          <MetricCard
            title="Coverage"
            value={`${metrics.coveragePct}%`}
            subtitle="Of required controls"
            icon={Shield}
            color="purple"
            progress={metrics.coveragePct}
          />
        </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card size="small" title="Framework">
          <Select
            value={framework}
            style={{ width: '100%' }}
            options={[
              { value: 'soc2', label: 'SOC 2 Type II (TSC)' },
              { value: 'iso27001', label: 'ISO 27001:2022' },
            ]}
            onChange={(v) => {
              setFramework(v as FrameworkId);
              const next = new URLSearchParams(sp.toString());
              next.set('framework', String(v));
              router.push(`/controls?${next.toString()}`);
            }}
          />
        </Card>
        <Card size="small" title={framework === 'soc2' ? 'Trust Service Criteria' : 'Category'}>
          <Select
            value={group}
            style={{ width: '100%' }}
            options={[{ value: 'all', label: 'All' }, ...groups.map((g) => ({ value: g, label: g }))]}
            onChange={(v) => setGroup(String(v))}
          />
        </Card>
        <Card size="small" title="Implementation status">
          <Select
            value={impl}
            style={{ width: '100%' }}
            options={[
              { value: 'all', label: 'All' },
              { value: 'not_started', label: 'not_started' },
              { value: 'in_progress', label: 'in_progress' },
              { value: 'implemented', label: 'implemented' },
              { value: 'blocked', label: 'blocked' },
            ]}
            onChange={(v) => setImpl(String(v))}
          />
        </Card>
        <Card size="small" title="Search">
          <Input
            placeholder="Search ID / title / owner..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            allowClear
          />
        </Card>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <Card size="small" title="Cross-Framework Mappings">
          <div className="flex flex-col gap-3">
            <Select
              showSearch
              value={mappingControlId || undefined}
              placeholder="Select a control to view mappings"
              options={filtered.map((r) => ({
                value: r.control_id,
                label: `${r.control_id} — ${r.title}`,
              }))}
              onChange={(v) => setMappingControlId(String(v))}
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
            />
            {mappingControlId ? (
              <CrossFrameworkMappings framework={framework} controlId={mappingControlId} tenantId={tenantId} />
            ) : (
              <Typography.Text type="secondary">Select a control to see related frameworks.</Typography.Text>
            )}
          </div>
        </Card>
      </div>

      {error ? (
        <div>
          <Alert type="error" showIcon message="Controls unavailable" description={String((error as any)?.message || error)} />
          <Typography.Paragraph className="mt-2" type="secondary">
            If this is “unauthorized”, log in first. Otherwise confirm the backend is running on port 8080.
          </Typography.Paragraph>
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card">
        <Card>
          <div className="flex items-center justify-between">
            <Typography.Text strong>Total</Typography.Text>
            <Typography.Text>{filtered.length}</Typography.Text>
          </div>
          <div className="mt-3">
            <Table<ControlRow>
              rowKey={(r) => String(r.control_id)}
              size="middle"
              loading={isLoading}
              dataSource={filtered}
              pagination={{ pageSize: 25 }}
              columns={[
                {
                  title: 'Control',
                  dataIndex: 'control_id',
                  render: (v: any, r: any) => (
                    <a href={`/controls/${encodeURIComponent(String(v || ''))}?tenantId=${encodeURIComponent(tenantId)}&framework=${encodeURIComponent(framework)}`}>
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 600 }}>
                        {String(v || '')}
                      </span>
                      <div style={{ fontSize: 12, opacity: 0.8 }}>{String(r.title || '')}</div>
                    </a>
                  ),
                },
                {
                  title: framework === 'soc2' ? 'TSC' : 'Group',
                  width: 120,
                  render: (_: any, r: any) => <Tag>{tscGroup(String(r.control_id))}</Tag>,
                },
                {
                  title: 'Implementation',
                  dataIndex: 'implementation_status',
                  width: 160,
                  render: (v) => implTag(v),
                },
                {
                  title: 'Owner',
                  dataIndex: 'owner_email',
                  width: 220,
                  render: (v) => <span>{String(v || '-')}</span>,
                },
                {
                  title: 'Evidence',
                  width: 140,
                  render: (_: any, r: any) => evidenceTag(r.evidence_status, r.stale),
                },
                {
                  title: 'Updated',
                  width: 120,
                  render: (_: any, r: any) => <span>{r.updated_at ? String(r.updated_at).slice(0, 10) : '-'}</span>,
                },
                {
                  title: 'Action',
                  width: 160,
                  render: (_: any, r: any) => (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() =>
                        router.push(
                          `/compliance/controls/${encodeURIComponent(String(r.control_id))}/workbench?framework=${encodeURIComponent(framework)}`
                        )
                      }
                    >
                      Open Control
                    </Button>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
    </main>
  );
}

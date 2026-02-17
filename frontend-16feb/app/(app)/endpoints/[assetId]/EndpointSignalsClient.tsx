'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Card, Col, Row, Skeleton, Space, Table, Tag, Typography } from 'antd';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { SecuritySignalsAlertsTable } from '../../../../components/security-signals/SecuritySignalsAlertsTable';
import { SecuritySignalsKpiTiles } from '../../../../components/security-signals/SecuritySignalsKpiTiles';
import { SecuritySignalsTimelineChart } from '../../../../components/security-signals/SecuritySignalsTimeline';
import type {
  RangePreset,
  SecuritySignalsAlertsPage,
  SecuritySignalsAlertItem,
  SecuritySignalsCompliance,
  SecuritySignalsSummary,
  SecuritySignalsTimeline,
} from '../../../../components/security-signals/types';
import { useShell } from '../../../../components/layout/AppShell';
import { useSearchParams } from 'next/navigation';

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
  return j;
}

function topMitre(alerts: SecuritySignalsAlertItem[], max = 12) {
  const counts: Record<string, number> = {};
  for (const a of alerts || []) {
    for (const m of a.mitre || []) {
      const k = String(m || '').trim();
      if (!k) continue;
      counts[k] = (counts[k] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k, v]) => ({ k, v }));
}

function topRules(alerts: SecuritySignalsAlertItem[], max = 12) {
  const counts: Record<string, number> = {};
  for (const a of alerts || []) {
    const k = String(a.rule || '').trim();
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k, v]) => ({ k, v }));
}

export function EndpointSignalsClient(props: {
  assetId: string;
  initialTenantId: string;
  initialRange: RangePreset;
  mode: 'overview' | 'endpoint-security' | 'threat-intelligence' | 'compliance';
}) {
  const { reportPartial } = useShell();
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || props.initialTenantId || 'demo-tenant';
  const range = (sp?.get('range') as any) || props.initialRange || '24h';
  const [search, setSearch] = useState('');

  // Phase 2.7 mapping rule: if assetId matches agent id/name, use directly.
  // (Future: translate asset → agentId using asset mappings when needed.)
  const agentId = props.assetId;

  const baseQ = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tenantId', tenantId);
    p.set('range', range);
    p.set('agentId', agentId);
    return p.toString();
  }, [tenantId, props.initialTenantId, range, props.initialRange, agentId]);

  const ssFetcher = (url: string) => fetchJson(url, tenantId || props.initialTenantId || 'demo-tenant');

  const { data: summary, error: summaryErr, isLoading: summaryLoading } = useSWR<SecuritySignalsSummary>(
    `/api/security-signals/summary?${baseQ}`,
    ssFetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const { data: timeline, error: timelineErr, isLoading: timelineLoading } = useSWR<SecuritySignalsTimeline>(
    `/api/security-signals/timeline?${baseQ}`,
    ssFetcher,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const alertsGetKey = (pageIndex: number, prev: SecuritySignalsAlertsPage | null) => {
    if (prev && !prev.nextCursor) return null;
    const cursor = pageIndex === 0 ? '' : `&cursor=${encodeURIComponent(String(prev?.nextCursor || ''))}`;
    return `/api/security-signals/alerts?${baseQ}&limit=50${cursor}`;
  };

  const { data: pages, error: alertsErr, isLoading: alertsLoading, size, setSize } = useSWRInfinite<SecuritySignalsAlertsPage>(
    alertsGetKey as any,
    ssFetcher as any,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const alerts = useMemo(() => ((pages || []) as any[]).flatMap((p) => (p?.items || []) as SecuritySignalsAlertItem[]), [pages]);
  const hasMore = useMemo(() => Boolean(((pages || [])[Math.max(0, (pages || []).length - 1)] as any)?.nextCursor), [pages]);

  const { data: cis } = useSWR<SecuritySignalsCompliance>(
    props.mode === 'compliance' || props.mode === 'endpoint-security' ? `/api/security-signals/compliance?${baseQ}&framework=CIS` : null,
    ssFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const { data: pci } = useSWR<SecuritySignalsCompliance>(
    props.mode === 'compliance' ? `/api/security-signals/compliance?${baseQ}&framework=PCI` : null,
    ssFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const { data: gdpr } = useSWR<SecuritySignalsCompliance>(
    props.mode === 'compliance' ? `/api/security-signals/compliance?${baseQ}&framework=GDPR` : null,
    ssFetcher,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const { data: enforcementViolations } = useSWR<any>(
    `/api/enforcement/violations?asset_id=${encodeURIComponent(agentId)}&limit=10`,
    ssFetcher,
    { refreshInterval: 10_000, revalidateOnFocus: false }
  );
  const { data: enforcementDecisions } = useSWR<any>(
    `/api/enforcement/decisions?target_id=${encodeURIComponent(agentId)}&limit=10`,
    ssFetcher,
    { refreshInterval: 10_000, revalidateOnFocus: false }
  );

  const violations = useMemo<any[]>(
    () => (Array.isArray(enforcementViolations?.violations) ? enforcementViolations.violations : []),
    [enforcementViolations]
  );
  const decisions = useMemo<any[]>(
    () => (Array.isArray(enforcementDecisions?.decisions) ? enforcementDecisions.decisions : []),
    [enforcementDecisions]
  );

  const partialAny = Boolean(summary?.partial || timeline?.partial || (pages || []).some((p: any) => Boolean(p?.partial)) || cis?.partial || pci?.partial || gdpr?.partial);
  React.useEffect(() => reportPartial(`endpoint.${props.assetId}.${props.mode}`, partialAny), [reportPartial, props.assetId, props.mode, partialAny]);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) => `${a.timestamp} ${a.agent} ${a.rule} ${(a.frameworks || []).join(' ')} ${(a.mitre || []).join(' ')} ${a.message}`.toLowerCase().includes(q));
  }, [alerts, search]);

  const topMitreItems = useMemo(() => topMitre(alerts, 12), [alerts]);
  const topRuleItems = useMemo(() => topRules(alerts, 10), [alerts]);

  const anyErr = summaryErr || timelineErr || alertsErr;

  return (
    <main style={{ padding: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Endpoint: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{props.assetId}</span>
          </Typography.Title>
          <Typography.Text type="secondary">
            View: <b>{props.mode}</b> • Range: <b>{range}</b>
          </Typography.Text>
        </div>
        <Space>
          <a href={`/endpoints/${encodeURIComponent(props.assetId)}?tenantId=${encodeURIComponent(tenantId)}&range=${encodeURIComponent(range)}`}>Overview</a>
          <a href={`/endpoints/${encodeURIComponent(props.assetId)}/endpoint-security?tenantId=${encodeURIComponent(tenantId)}&range=${encodeURIComponent(range)}`}>Endpoint security</a>
          <a href={`/endpoints/${encodeURIComponent(props.assetId)}/threat-intelligence?tenantId=${encodeURIComponent(tenantId)}&range=${encodeURIComponent(range)}`}>Threat intelligence</a>
          <a href={`/endpoints/${encodeURIComponent(props.assetId)}/compliance?tenantId=${encodeURIComponent(tenantId)}&range=${encodeURIComponent(range)}`}>Compliance</a>
        </Space>
      </div>

      {anyErr ? (
        <Alert style={{ marginTop: 12 }} type="warning" showIcon message="Some endpoint panels are unavailable" description={String((anyErr as any)?.message || anyErr)} />
      ) : null}

      <div style={{ marginTop: 12 }}>
        <SecuritySignalsKpiTiles
          summary={summary}
          loading={Boolean(summaryLoading)}
          rangeLabel={String(range)}
          onClickSeverity={() => void 0}
          onClickFramework={() => void 0}
        />
      </div>

      <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
        <Col xs={24} lg={12}>
          <SecuritySignalsTimelineChart title="Signals timeline" range={String(range)} timeline={timeline} loading={Boolean(timelineLoading)} />
        </Col>
        <Col xs={24} lg={12}>
          {props.mode === 'threat-intelligence' ? (
            <Card title="Top MITRE (from signals)" size="small">
              {alertsLoading ? (
                <Skeleton active />
              ) : topMitreItems.length ? (
                <Space wrap>
                  {topMitreItems.map((x) => (
                    <Tag key={x.k}>
                      {x.k} • {x.v}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Typography.Text type="secondary">No MITRE tags detected for this endpoint/range.</Typography.Text>
              )}
            </Card>
          ) : props.mode === 'compliance' ? (
            <Card title="Compliance failures (top)" size="small">
              {(cis || pci || gdpr) ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Typography.Text strong>CIS</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      {(cis?.failures || []).slice(0, 10).map((x) => (
                        <Tag key={`cis-${x.control}`}>{x.control} • {x.count}</Tag>
                      ))}
                      {(!cis?.failures || cis.failures.length === 0) ? <Typography.Text type="secondary">No CIS tags detected.</Typography.Text> : null}
                    </div>
                  </div>
                  <div>
                    <Typography.Text strong>PCI DSS</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      {(pci?.failures || []).slice(0, 10).map((x) => (
                        <Tag key={`pci-${x.control}`}>{x.control} • {x.count}</Tag>
                      ))}
                      {(!pci?.failures || pci.failures.length === 0) ? <Typography.Text type="secondary">No PCI tags detected.</Typography.Text> : null}
                    </div>
                  </div>
                  <div>
                    <Typography.Text strong>GDPR</Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      {(gdpr?.failures || []).slice(0, 10).map((x) => (
                        <Tag key={`gdpr-${x.control}`}>{x.control} • {x.count}</Tag>
                      ))}
                      {(!gdpr?.failures || gdpr.failures.length === 0) ? <Typography.Text type="secondary">No GDPR tags detected.</Typography.Text> : null}
                    </div>
                  </div>
                </Space>
              ) : (
                <Skeleton active />
              )}
            </Card>
          ) : (
            <Card title="Top signal rules (heuristic)" size="small">
              {alertsLoading ? (
                <Skeleton active />
              ) : topRuleItems.length ? (
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r.k}
                  columns={[
                    { title: 'Rule', dataIndex: 'k', render: (v) => <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v)}</span> },
                    { title: 'Count', dataIndex: 'v', width: 90 },
                  ]}
                  dataSource={topRuleItems}
                />
              ) : (
                <Typography.Text type="secondary">No rules detected.</Typography.Text>
              )}
            </Card>
          )}
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <Card title="Recent security signals" size="small">
          <SecuritySignalsAlertsTable
            items={filteredAlerts}
            loading={Boolean(alertsLoading)}
            hasMore={Boolean(hasMore)}
            onLoadMore={() => void setSize(size + 1)}
            search={search}
            onSearchChange={setSearch}
          />
        </Card>
      </div>

      {(violations.length > 0 || decisions.length > 0) && (
        <div style={{ marginTop: 12 }}>
          <Card title="Control Violations & Enforcement" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <Typography.Text strong>Recent Violations</Typography.Text>
                <Table<any>
                  size="small"
                  pagination={false}
                  rowKey={(r) => String(r.violation_id)}
                  columns={[
                    { title: 'Detected', dataIndex: 'detected_at', render: (v) => String(v || '').slice(0, 19) },
                    { title: 'Control', dataIndex: 'control_name', render: (v) => String(v || '-') },
                    { title: 'Type', dataIndex: 'violation_type', render: (v) => String(v || '-') },
                    {
                      title: 'Severity',
                      dataIndex: 'severity',
                      render: (v) => <Tag color={String(v || '').toLowerCase() === 'critical' ? 'red' : 'orange'}>{String(v || '-')}</Tag>,
                    },
                    {
                      title: 'Status',
                      dataIndex: 'enforcement_status',
                      render: (v) => <Tag>{String(v || '-')}</Tag>,
                    },
                  ]}
                  dataSource={violations}
                />
              </div>

              <div>
                <Typography.Text strong>Recent Enforcement Decisions</Typography.Text>
                <Table<any>
                  size="small"
                  pagination={false}
                  rowKey={(r) => String(r.decision_id)}
                  columns={[
                    { title: 'Created', dataIndex: 'created_at', render: (v) => String(v || '').slice(0, 19) },
                    { title: 'Action', dataIndex: 'action_type', render: (v) => String(v || '-') },
                    { title: 'Vendor', dataIndex: 'selected_vendor', render: (v) => String(v || '-') },
                    {
                      title: 'Status',
                      dataIndex: 'execution_status',
                      render: (v) => <Tag>{String(v || '-')}</Tag>,
                    },
                  ]}
                  dataSource={decisions}
                />
              </div>
            </Space>
          </Card>
        </div>
      )}
    </main>
  );
}


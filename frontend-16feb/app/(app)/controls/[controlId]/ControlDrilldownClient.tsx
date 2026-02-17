'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { Alert, Badge, Button, Card, Col, Divider, Input, Modal, Row, Select, Skeleton, Space, Table, Tabs, Tag, Typography } from 'antd';
import { Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import { EvidenceRequestModal } from '../../../../components/EvidenceRequestModal';
import { ControlTestingTab } from '../../../../components/ControlTestingTab';
import { LinkedRisksSection } from '../../../../components/RiskControlMappings';
import CrossFrameworkMappings from '../../../../components/controls/CrossFrameworkMappings';

type Summary = {
  control_id: string;
  title: string;
  enforceability: string | null;
  expected_evidence_type: string | null;
  evidence_status: string | null;
  evidence_reason: string | null;
  effective_sla_hours: number | null;
  last_evidence_at: string | null;
  evidence_assets_count: number;
  evidence_total_count: number;
  stale: boolean;
  partial: boolean;
  automation_enabled?: boolean;
  linked_playbook_ids?: string[];
  last_automated_test?: string | null;
  automation_effectiveness_score?: number;
  total_violations?: number;
  auto_remediated_violations?: number;
};

type EvidenceRow = {
  evidence_id: string;
  control_id: string;
  asset_id: string;
  evidence_type: string;
  source: string;
  captured_at: string;
  expires_at: string | null;
  expiration_date?: string | null;
  raw_ref: { index: string; docId: string } | null;
  summary: string;
};

type SignalsPage = { items: Array<any>; nextCursor: string | null; partial: boolean; reason?: string | null };
type EvidenceRequest = any;
type PolicyRow = any;
type LinkedPlaybook = {
  playbook_id: string;
  name: string;
  category?: string | null;
  enabled?: boolean;
  execution_count?: number;
  success_rate?: number;
};

function isoLabel(ts: any): string {
  const s = String(ts || '');
  if (!s) return '';
  try {
    const d = new Date(s);
    if (Number.isFinite(d.getTime())) return d.toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    // ignore
  }
  return s;
}

function severityColor(level: number | undefined): string {
  const n = Number(level || 0);
  if (n >= 12) return 'red';
  if (n >= 8) return 'volcano';
  if (n >= 5) return 'gold';
  if (n >= 3) return 'blue';
  return 'default';
}

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

function statusBadge(status: any, enforce: any) {
  const s = String(status || '');
  const e = String(enforce || '');
  if (e === 'procedural_attestation' && s === 'missing') return <Tag color="blue">Attestation required</Tag>;
  if (s === 'fresh') return <Tag color="green">Fresh</Tag>;
  if (s === 'overdue') return <Tag color="gold">Overdue</Tag>;
  if (s === 'missing') return <Tag>Missing</Tag>;
  return <Tag>{s || '-'}</Tag>;
}

function requestStatusTag(status: any) {
  const s = String(status || '');
  if (s === 'pending') return <Tag color="gold">pending</Tag>;
  if (s === 'uploaded') return <Tag color="green">uploaded</Tag>;
  if (s === 'expired') return <Tag color="red">expired</Tag>;
  if (s === 'rejected') return <Tag color="red">rejected</Tag>;
  return <Tag>{s || '-'}</Tag>;
}

export function ControlDrilldownClient(props: {
  tenantId: string;
  controlId: string;
  framework?: 'iso27001' | 'soc2';
  slaHours: number;
  initialSummary?: Summary | null;
  initialEvidence?: EvidenceRow[];
  initialSignals?: any[];
}) {
  const tenantId = props.tenantId || 'demo-tenant';
  const controlId = props.controlId;
  const slaHours = props.slaHours || 72;
  const framework = (props.framework || 'iso27001') as 'iso27001' | 'soc2';

  const [range, setRange] = useState<string>('30d');
  const [includeHistory, setIncludeHistory] = useState<boolean>(false);
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);

  const summaryUrl = `/api/controls/${encodeURIComponent(controlId)}/summary?tenantId=${encodeURIComponent(tenantId)}&framework=${encodeURIComponent(framework)}&slaHours=${encodeURIComponent(String(slaHours))}&range=${encodeURIComponent(range)}`;
  const evidenceUrl = `/api/controls/${encodeURIComponent(controlId)}/evidence?tenantId=${encodeURIComponent(tenantId)}&limit=200&includeHistory=${encodeURIComponent(
    String(includeHistory)
  )}&framework=${encodeURIComponent(framework)}`;
  const timelineUrl = `/api/controls/${encodeURIComponent(controlId)}/timeline?tenantId=${encodeURIComponent(tenantId)}&framework=${encodeURIComponent(framework)}&range=${encodeURIComponent(range)}`;
  const requestsUrl = `/api/evidence-requests?controlId=${encodeURIComponent(controlId)}`;

  const { data: summary, error: summaryErr, isLoading: summaryLoading } = useSWR<Summary>(
    summaryUrl,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false, fallbackData: props.initialSummary || undefined }
  );
  const linkedPlaybookIds = useMemo(
    () => (Array.isArray(summary?.linked_playbook_ids) ? summary?.linked_playbook_ids : []),
    [summary]
  );
  const playbooksUrl =
    linkedPlaybookIds.length > 0
      ? `/api/playbooks?playbook_ids=${encodeURIComponent(linkedPlaybookIds.join(','))}`
      : null;

  const { data: evidence, error: evidenceErr, isLoading: evidenceLoading } = useSWR<{ currentEvidence: EvidenceRow[]; historyEvidence?: EvidenceRow[] }>(
    evidenceUrl,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false, fallbackData: props.initialEvidence ? { currentEvidence: props.initialEvidence } : undefined }
  );

  const { data: timeline, error: timelineErr, isLoading: timelineLoading } = useSWR<{ interval: string; points: Array<{ ts: string; count: number }>; partial: boolean }>(
    timelineUrl,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const {
    data: requests,
    error: requestsErr,
    isLoading: requestsLoading,
    mutate: refreshRequests,
  } = useSWR<{ items?: EvidenceRequest[] } | EvidenceRequest[]>(
    requestsUrl,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const playbooksKey = playbooksUrl || null;
  const {
    data: linkedPlaybooksData,
    error: linkedPlaybooksErr,
    isLoading: linkedPlaybooksLoading,
  } = useSWR<{ playbooks?: LinkedPlaybook[] }>(
    playbooksKey,
    (u: string) => fetchJson(u, tenantId),
    { revalidateOnFocus: false }
  );

  const signalsGetKey = (pageIndex: number, previousPageData: SignalsPage | null) => {
    if (previousPageData && !previousPageData.nextCursor) return null;
    const cursor = pageIndex === 0 ? '' : `&cursor=${encodeURIComponent(String(previousPageData?.nextCursor || ''))}`;
    return `/api/controls/${encodeURIComponent(controlId)}/signals?tenantId=${encodeURIComponent(tenantId)}&range=${encodeURIComponent(range)}&limit=50${cursor}`;
  };

  const { data: signalsPages, error: signalsErr, isLoading: signalsLoading, size, setSize } = useSWRInfinite<SignalsPage>(
    signalsGetKey as any,
    (u: string) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const signals = useMemo(() => (signalsPages || []).flatMap((p) => (p?.items || []) as any[]), [signalsPages]);
  const signalsHasMore = Boolean((signalsPages || [])[Math.max(0, (signalsPages || []).length - 1)]?.nextCursor);
  const partial = Boolean(summary?.partial || timeline?.partial || (signalsPages || []).some((p) => p?.partial));

  const timelineData = useMemo(() => {
    const pts = (timeline?.points || []) as any[];
    return pts.map((p: any) => ({
      ts: String(p.ts || ''),
      label: dayjs(String(p.ts || '')).isValid() ? dayjs(String(p.ts || '')).format(range.includes('h') ? 'HH:mm' : 'MM-DD') : isoLabel(p.ts),
      count: Number(p.count || 0),
    }));
  }, [timeline, range]);

  const requestItems = useMemo(() => {
    const anyData: any = requests as any;
    if (Array.isArray(anyData)) return anyData;
    if (Array.isArray(anyData?.items)) return anyData.items;
    return [];
  }, [requests]);
  const linkedPlaybooks = useMemo(
    () => (Array.isArray(linkedPlaybooksData?.playbooks) ? linkedPlaybooksData?.playbooks || [] : []),
    [linkedPlaybooksData]
  );

  return (
    <div>
      {partial ? (
        <Alert
          type="warning"
          showIcon
          message="Partial data"
          description="Some drill-down panels are missing data (signals mapping/indexer availability)."
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <div style={{ marginBottom: 12 }}>
        <CrossFrameworkMappings framework={framework} controlId={controlId} tenantId={tenantId} />
      </div>

      <Card>
        {summaryLoading ? (
          <Skeleton active />
        ) : summaryErr ? (
          <Alert type="error" showIcon message="Control summary failed" description={String((summaryErr as any)?.message || summaryErr)} />
        ) : (
          <Row gutter={[12, 12]} align="middle">
            <Col flex="auto">
              <Typography.Title level={4} style={{ margin: 0 }}>
                {summary?.control_id} — {summary?.title}
              </Typography.Title>
              <Space wrap style={{ marginTop: 8 }}>
                <Tag>{String(summary?.enforceability || '-')}</Tag>
                {statusBadge(summary?.evidence_status, summary?.enforceability)}
                <Tag>Expected: {String(summary?.expected_evidence_type || '-')}</Tag>
                <Tag>SLA: {String(summary?.effective_sla_hours ?? '-')}h</Tag>
                <Tag>Last: {summary?.last_evidence_at ? isoLabel(summary.last_evidence_at) : '-'}</Tag>
                <Tag>Assets: {String(summary?.evidence_assets_count ?? 0)}</Tag>
                <Tag>Evidence: {String(summary?.evidence_total_count ?? 0)}</Tag>
              </Space>
              {summary?.evidence_reason ? (
                <div style={{ marginTop: 8, opacity: 0.75 }}>{summary.evidence_reason}</div>
              ) : null}
            </Col>
            <Col>
              <Space direction="vertical" align="end">
                <Badge status={summary?.stale ? 'warning' : 'success'} text={summary?.stale ? 'Needs attention' : 'OK'} />
                <Button type="primary" onClick={() => setShowRequestModal(true)}>
                  Request Evidence
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      {summary?.automation_enabled || linkedPlaybookIds.length > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col flex="auto">
              <Typography.Title level={5} style={{ margin: 0 }}>
                Automated Enforcement
              </Typography.Title>
              <Space wrap style={{ marginTop: 8 }}>
                <Tag color={summary?.automation_enabled ? 'green' : 'default'}>
                  {summary?.automation_enabled ? 'Active' : 'Inactive'}
                </Tag>
                <Tag>Effectiveness: {Number(summary?.automation_effectiveness_score || 0)}%</Tag>
                <Tag>
                  Auto-remediated: {Number(summary?.auto_remediated_violations || 0)} / {Number(summary?.total_violations || 0)}
                </Tag>
                <Tag>
                  Last automated test: {summary?.last_automated_test ? isoLabel(summary.last_automated_test) : 'Never'}
                </Tag>
              </Space>
            </Col>
            <Col>
              <Badge status={summary?.automation_enabled ? 'success' : 'default'} text={`${linkedPlaybookIds.length} playbook(s)`} />
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          {linkedPlaybooksErr ? (
            <Alert type="error" showIcon message="Failed to load linked playbooks" description={String((linkedPlaybooksErr as any)?.message || linkedPlaybooksErr)} />
          ) : linkedPlaybooksLoading ? (
            <Skeleton active />
          ) : linkedPlaybooks.length === 0 ? (
            <div style={{ color: 'rgba(0,0,0,0.45)' }}>No linked playbooks found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {linkedPlaybooks.map((playbook) => (
                <div
                  key={playbook.playbook_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{playbook.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      {String(playbook.category || 'general')} · {Number(playbook.execution_count || 0)} executions · Success {Number(playbook.success_rate || 0)}%
                    </div>
                  </div>
                  <Space>
                    <Tag color={playbook.enabled ? 'green' : 'default'}>{playbook.enabled ? 'Enabled' : 'Disabled'}</Tag>
                    <a href={`/playbooks/builder?playbook=${encodeURIComponent(playbook.playbook_id)}`}>
                      View →
                    </a>
                  </Space>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      <Divider />

      <Tabs
        defaultActiveKey="evidence"
        items={[
          {
            key: 'evidence',
            label: 'Evidence',
            children: (
              <Card
                extra={
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setIncludeHistory((v) => !v);
                    }}
                  >
                    {includeHistory ? 'Show current' : 'Show history'}
                  </a>
                }
              >
                {evidenceLoading ? (
                  <Skeleton active />
                ) : evidenceErr ? (
                  <Alert type="warning" showIcon message="Evidence unavailable" description={String((evidenceErr as any)?.message || evidenceErr)} />
                ) : (
                  <Table<EvidenceRow>
                    rowKey={(r) => String(r.evidence_id)}
                    size="small"
                    pagination={{ pageSize: 25, showSizeChanger: true }}
                    dataSource={includeHistory ? (evidence?.historyEvidence || []) : (evidence?.currentEvidence || [])}
                    columns={[
                      { title: 'captured_at', dataIndex: 'captured_at', width: 200, render: (v) => <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{isoLabel(v)}</Typography.Text> },
                      { title: 'asset_id', dataIndex: 'asset_id', width: 220, render: (v) => <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(v || '')}</Typography.Text> },
                      { title: 'type', dataIndex: 'evidence_type', width: 120, render: (v) => <Tag>{String(v || '')}</Tag> },
                      { title: 'summary', dataIndex: 'summary' },
                      { title: 'expiration', dataIndex: 'expiration_date', width: 180, render: (v) => expirationTag(v) },
                      {
                        title: 'raw',
                        dataIndex: 'raw_ref',
                        width: 110,
                        render: (v) =>
                          v?.index && v?.docId ? (
                            <a href={`/api/wazuh/alerts/raw?index=${encodeURIComponent(v.index)}&id=${encodeURIComponent(v.docId)}`} target="_blank" rel="noreferrer">
                              Open raw
                            </a>
                          ) : (
                            <span style={{ opacity: 0.5 }}>-</span>
                          ),
                      },
                    ]}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'requests',
            label: 'Evidence Requests',
            children: (
              <Card>
                {requestsLoading ? (
                  <Skeleton active />
                ) : requestsErr ? (
                  <Alert type="warning" showIcon message="Requests unavailable" description={String((requestsErr as any)?.message || requestsErr)} />
                ) : requestItems.length === 0 ? (
                  <Typography.Text type="secondary">No evidence requests for this control</Typography.Text>
                ) : (
                  <Table<any>
                    rowKey={(r) => String(r.id || r.request_id || r.requestId || '')}
                    size="small"
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    dataSource={requestItems}
                    columns={[
                      { title: 'Assigned To', dataIndex: 'assigned_to', render: (v) => <Typography.Text>{String(v || '')}</Typography.Text> },
                      { title: 'Type', dataIndex: 'evidence_type', width: 140, render: (v) => <Tag>{String(v || '')}</Tag> },
                      { title: 'Due Date', dataIndex: 'due_date', width: 160, render: (v) => <Typography.Text>{v ? dayjs(String(v)).format('YYYY-MM-DD') : '-'}</Typography.Text> },
                      { title: 'Status', dataIndex: 'status', width: 120, render: (v) => requestStatusTag(v) },
                      { title: 'Created', dataIndex: 'created_at', width: 160, render: (v) => <Typography.Text>{v ? dayjs(String(v)).format('YYYY-MM-DD') : '-'}</Typography.Text> },
                    ]}
                  />
                )}
              </Card>
            ),
          },
          {
            key: 'testing',
            label: 'Testing',
            children: <ControlTestingTab tenantId={tenantId} controlId={controlId} />,
          },
          {
            key: 'linked-risks',
            label: 'Linked Risks',
            children: <LinkedRisksSection tenantId={tenantId} controlId={controlId} />,
          },
          {
            key: 'linked-policies',
            label: 'Linked Policies',
            children: <LinkedPoliciesSection tenantId={tenantId} controlId={controlId} />,
          },
          {
            key: 'signals',
            label: 'Signals',
            children: (
              <Card>
                {signalsErr ? (
                  <Alert type="warning" showIcon message="Signals unavailable" description={String((signalsErr as any)?.message || signalsErr)} />
                ) : signalsLoading ? (
                  <Skeleton active />
                ) : (
                  <>
                    <Table<any>
                      rowKey={(_, i) => String(i)}
                      size="small"
                      pagination={{ pageSize: 25, showSizeChanger: true }}
                      dataSource={signals}
                      columns={[
                        { title: 'timestamp', dataIndex: 'timestamp', width: 200, render: (v) => <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{isoLabel(v)}</Typography.Text> },
                        { title: 'agent', dataIndex: 'agent', width: 180, render: (v) => <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(v || '')}</Typography.Text> },
                        { title: 'severity', dataIndex: 'severity', width: 90, render: (v) => <Tag color={severityColor(Number(v))}>{String(v ?? '')}</Tag> },
                        { title: 'rule', dataIndex: 'rule', width: 360, render: (v) => <Typography.Text>{String(v || '').slice(0, 120)}</Typography.Text> },
                        { title: 'message', dataIndex: 'message', render: (v) => <Typography.Text>{String(v || '').slice(0, 140)}</Typography.Text> },
                        {
                          title: 'raw',
                          dataIndex: 'raw_ref',
                          width: 90,
                          render: (v) =>
                            v?.index && v?.docId ? (
                              <a href={`/api/wazuh/alerts/raw?index=${encodeURIComponent(v.index)}&id=${encodeURIComponent(v.docId)}`} target="_blank" rel="noreferrer">
                                Raw
                              </a>
                            ) : (
                              <span style={{ opacity: 0.5 }}>-</span>
                            ),
                        },
                      ]}
                    />
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography.Text type="secondary">
                        Loaded {signals.length} signals {signalsHasMore ? '• more available' : ''}
                      </Typography.Text>
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (signalsHasMore) setSize(size + 1);
                        }}
                        style={{ opacity: signalsHasMore ? 1 : 0.5 }}
                      >
                        {signalsHasMore ? 'Load more' : 'No more'}
                      </a>
                    </div>
                  </>
                )}
              </Card>
            ),
          },
          {
            key: 'timeline',
            label: 'Timeline',
            children: (
              <Card>
                {timelineErr ? (
                  <Alert type="warning" showIcon message="Timeline unavailable" description={String((timelineErr as any)?.message || timelineErr)} />
                ) : timelineLoading ? (
                  <Skeleton active />
                ) : (
                  <Column
                    data={timelineData}
                    xField="label"
                    yField="count"
                    height={260}
                    xAxis={{ label: { autoRotate: true, autoHide: true } }}
                    tooltip={{ showMarkers: false }}
                    meta={{ label: { alias: 'time' }, count: { alias: 'signals' } }}
                  />
                )}
              </Card>
            ),
          },
        ]}
      />

      <EvidenceRequestModal
        open={showRequestModal}
        tenantId={tenantId}
        controlId={controlId}
        onClose={() => setShowRequestModal(false)}
        onSuccess={() => refreshRequests()}
      />
    </div>
  );
}

function LinkedPoliciesSection(props: { tenantId: string; controlId: string }) {
  const tenantId = props.tenantId || 'demo-tenant';
  const controlId = props.controlId;
  const [items, setItems] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [allPolicies, setAllPolicies] = useState<any[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  async function loadLinked() {
    setLoading(true);
    try {
      const j = await fetchJson(`/api/policies?controlId=${encodeURIComponent(controlId)}`, tenantId);
      const rows = Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : [];
      setItems(rows);
    } catch (e) {
      console.error('Failed to load linked policies:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    try {
      const j = await fetchJson(`/api/policies`, tenantId);
      const rows = Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : [];
      setAllPolicies(rows);
    } catch (e) {
      console.error('Failed to load policies list:', e);
      setAllPolicies([]);
    }
  }

  async function link() {
    if (!selectedPolicyId) return;
    const res = await fetch(`/api/policies/${encodeURIComponent(selectedPolicyId)}/controls`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
      body: JSON.stringify({ control_id: controlId, mapping_notes: notes || undefined }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
    setOpen(false);
    setSelectedPolicyId('');
    setNotes('');
    await loadLinked();
  }

  React.useEffect(() => {
    loadLinked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, controlId]);

  return (
    <Card
      title="Linked Policies"
      extra={
        <Button
          onClick={() => {
            setOpen(true);
            loadAll();
          }}
        >
          Link Policy
        </Button>
      }
    >
      {loading ? (
        <Skeleton active />
      ) : items.length === 0 ? (
        <Typography.Text type="secondary">No policies linked to this control</Typography.Text>
      ) : (
        <Table<any>
          rowKey={(r) => String(r.id)}
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          dataSource={items}
          columns={[
            {
              title: 'Policy',
              dataIndex: 'title',
              render: (_: any, r: any) => (
                <a href={`/policies/${encodeURIComponent(String(r.id))}`} style={{ textDecoration: 'none' }}>
                  {String(r.title || '')}
                </a>
              ),
            },
            { title: 'Category', dataIndex: 'category', width: 140, render: (v: any) => <Tag>{String(v || 'other')}</Tag> },
            { title: 'Status', dataIndex: 'status', width: 140, render: (v: any) => <Tag>{String(v || '')}</Tag> },
            { title: 'Current Version', dataIndex: 'current_version', width: 140, render: (v: any) => <Typography.Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{String(v || '-')}</Typography.Text> },
          ]}
        />
      )}

      <Modal
        open={open}
        title="Link policy to control"
        onCancel={() => setOpen(false)}
        onOk={() => link().catch((e) => alert(String((e as any)?.message || e)))}
        okButtonProps={{ disabled: !selectedPolicyId }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Policy</div>
            <Select
              style={{ width: '100%' }}
              placeholder="Select policy..."
              value={selectedPolicyId || undefined}
              onChange={(v) => setSelectedPolicyId(String(v))}
              options={(allPolicies || []).map((p) => ({ value: String(p.id), label: `${String(p.policy_number || '').trim() ? `${p.policy_number} — ` : ''}${String(p.title || '')}` }))}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>Notes (optional)</div>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mapping notes..." />
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function expirationTag(expirationDate: any) {
  if (!expirationDate) return <span style={{ opacity: 0.6 }}>-</span>;
  const exp = new Date(String(expirationDate));
  if (!Number.isFinite(exp.getTime())) return <Tag>{String(expirationDate)}</Tag>;
  const now = new Date();
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return <Tag color="red">EXPIRED {Math.abs(daysUntil)}d</Tag>;
  if (daysUntil <= 30) return <Tag color="orange">EXPIRES IN {daysUntil}d</Tag>;
  return <Tag color="green">Valid until {dayjs(exp).format('YYYY-MM-DD')}</Tag>;
}


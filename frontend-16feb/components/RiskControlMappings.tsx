'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';

type Mapping = any;

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

async function postJson(path: string, tenantId: string, body: any) {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
  return j;
}

async function delJson(path: string, tenantId: string) {
  const res = await fetch(path, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'x-tenant-id': tenantId },
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);
  return j;
}

function effectivenessTag(v: any) {
  const s = String(v || '');
  if (!s) return <Typography.Text type="secondary">-</Typography.Text>;
  if (s === 'high') return <Tag color="green">high</Tag>;
  if (s === 'medium') return <Tag color="gold">medium</Tag>;
  return <Tag color="red">low</Tag>;
}

export function LinkedControlsSection(props: { tenantId: string; riskId: string }) {
  const tenantId = props.tenantId || 'demo-tenant';
  const riskId = props.riskId;

  const url = `/api/risk-control-mappings?riskId=${encodeURIComponent(riskId)}`;
  const { data, error, isLoading, mutate } = useSWR<{ items?: Mapping[] }>(url, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  const items = useMemo(() => (Array.isArray(data?.items) ? data!.items : []), [data]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [library, setLibrary] = useState<any[]>([]);
  const [libQuery, setLibQuery] = useState('');
  const [selectedControlIds, setSelectedControlIds] = useState<Set<string>>(new Set());

  async function remove(id: string) {
    if (!confirm('Remove this control mapping?')) return;
    try {
      await delJson(`/api/risk-control-mappings/${encodeURIComponent(id)}`, tenantId);
      await mutate();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete mapping', e);
      alert(String(e?.message || 'Failed to delete mapping'));
    }
  }

  async function submit(values: any) {
    setSaving(true);
    try {
      await postJson('/api/risk-control-mappings', tenantId, {
        risk_id: riskId,
        control_id: String(values.control_id || '').trim(),
        mapping_type: values.mapping_type,
        effectiveness: values.effectiveness || null,
        notes: values.notes || '',
      });
      setOpen(false);
      await mutate();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to create mapping', e);
      alert(String(e?.message || 'Failed to link control'));
    } finally {
      setSaving(false);
    }
  }

  async function loadLibrary() {
    if (library.length) return;
    setLibraryLoading(true);
    try {
      const r = await fetchJson(`/api/controls?framework=iso27001&tenantId=${encodeURIComponent(tenantId)}`, tenantId);
      const items = Array.isArray(r?.items) ? r.items : [];
      setLibrary(items);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load control library', e);
    } finally {
      setLibraryLoading(false);
    }
  }

  const filteredLibrary = useMemo(() => {
    const q = libQuery.trim().toLowerCase();
    if (!q) return library;
    return (library || []).filter((c: any) => String(c.control_id || '').toLowerCase().includes(q) || String(c.title || '').toLowerCase().includes(q));
  }, [library, libQuery]);

  async function linkSelected() {
    if (!selectedControlIds.size) {
      alert('Select at least one control.');
      return;
    }
    setSaving(true);
    try {
      await postJson(`/api/risks/${encodeURIComponent(riskId)}/controls`, tenantId, { control_ids: Array.from(selectedControlIds) });
      setSelectedControlIds(new Set());
      setOpen(false);
      await mutate();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to link controls', e);
      alert(String(e?.message || 'Failed to link controls'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Linked Controls"
      extra={
        <Button type="primary" onClick={() => setOpen(true)}>
          Link Control
        </Button>
      }
      style={{ marginTop: 16 }}
    >
      {error ? <Alert type="warning" showIcon message="Mappings unavailable" description={String((error as any)?.message || error)} /> : null}
      {!error && !isLoading && items.length === 0 ? <Typography.Text type="secondary">No controls linked to this risk</Typography.Text> : null}

      {!error && items.length ? (
        <Table<Mapping>
          rowKey={(r) => String(r.id)}
          size="small"
          pagination={false}
          dataSource={items}
          columns={[
            {
              title: 'Control ID',
              dataIndex: 'control_id',
              render: (v) => (
                <a href={`/controls/${encodeURIComponent(String(v || ''))}`} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                  {String(v || '')}
                </a>
              ),
            },
            { title: 'Type', dataIndex: 'mapping_type', width: 140, render: (v) => <Tag>{String(v || '')}</Tag> },
            { title: 'Effectiveness', dataIndex: 'effectiveness', width: 140, render: (v) => effectivenessTag(v) },
            { title: 'Notes', dataIndex: 'notes', render: (v) => <Typography.Text>{String(v || '')}</Typography.Text> },
            { title: 'Action', width: 120, render: (_: any, r: any) => <Button danger size="small" onClick={() => remove(String(r.id))}>Remove</Button> },
          ]}
        />
      ) : null}

      <Modal open={open} title="Link Control to Risk" onCancel={() => setOpen(false)} footer={null} destroyOnClose>
        <div style={{ marginBottom: 12 }}>
          <Typography.Text type="secondary">
            Select from ISO 27001 controls (search + multi-select), or use manual/advanced mapping below.
          </Typography.Text>
        </div>

        <Card size="small" style={{ marginBottom: 12 }} title="Control Library (ISO 27001)">
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Input
              placeholder="Search control id or title..."
              value={libQuery}
              onChange={(e) => setLibQuery(e.target.value)}
              onFocus={() => loadLibrary()}
              style={{ maxWidth: 420 }}
            />
            <Button onClick={() => loadLibrary()} loading={libraryLoading}>
              Load
            </Button>
          </Space>

          <div style={{ marginTop: 12, maxHeight: 280, overflow: 'auto', border: '1px solid #f0f0f0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #f0f0f0' }}>Select</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #f0f0f0' }}>Control</th>
                  <th style={{ textAlign: 'left', padding: 10, borderBottom: '1px solid #f0f0f0' }}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {(filteredLibrary || []).slice(0, 250).map((c: any) => {
                  const cid = String(c.control_id || '');
                  const checked = selectedControlIds.has(cid);
                  return (
                    <tr key={cid}>
                      <td style={{ padding: 10, borderBottom: '1px solid #fafafa' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = new Set(selectedControlIds);
                            if (e.target.checked) next.add(cid);
                            else next.delete(cid);
                            setSelectedControlIds(next);
                          }}
                        />
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fafafa' }}>
                        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 600 }}>{cid}</div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>{String(c.title || '')}</div>
                      </td>
                      <td style={{ padding: 10, borderBottom: '1px solid #fafafa' }}>
                        {c.evidence ? <Tag color={c.stale ? 'red' : 'green'}>{c.stale ? 'stale' : 'fresh'}</Tag> : <Tag>none</Tag>}
                      </td>
                    </tr>
                  );
                })}
                {!libraryLoading && (!filteredLibrary || filteredLibrary.length === 0) ? (
                  <tr>
                    <td colSpan={3} style={{ padding: 12, color: '#888' }}>
                      {library.length ? 'No matches.' : 'Load the library to select controls.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <Space style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Typography.Text type="secondary">Selected: {selectedControlIds.size}</Typography.Text>
            <Button type="primary" onClick={linkSelected} loading={saving}>
              Link Selected
            </Button>
          </Space>
        </Card>

        <Form
          layout="vertical"
          initialValues={{ control_id: '', mapping_type: 'mitigates', effectiveness: 'medium', notes: '' }}
          onFinish={submit}
        >
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Advanced / Manual Mapping
          </Typography.Title>
          <Form.Item label="Control ID *" name="control_id" rules={[{ required: true, message: 'Control ID is required' }]}>
            <Input placeholder="e.g. A.5.12" />
          </Form.Item>

          <Form.Item label="Mapping Type" name="mapping_type">
            <Select
              options={[
                { value: 'mitigates', label: 'Mitigates' },
                { value: 'monitors', label: 'Monitors' },
                { value: 'detects', label: 'Detects' },
                { value: 'prevents', label: 'Prevents' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Effectiveness" name="effectiveness">
            <Select
              options={[
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Link Control
            </Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}

export function LinkedRisksSection(props: { tenantId: string; controlId: string }) {
  const tenantId = props.tenantId || 'demo-tenant';
  const controlId = props.controlId;

  const url = `/api/risk-control-mappings?controlId=${encodeURIComponent(controlId)}`;
  const { data, error, isLoading, mutate } = useSWR<{ items?: Mapping[] }>(url, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  const items = useMemo(() => (Array.isArray(data?.items) ? data!.items : []), [data]);

  // Optional: get risk titles to render nicer rows (best-effort).
  const { data: risksList } = useSWR<any>(
    `/api/risks?tenantId=${encodeURIComponent(tenantId)}&range=90d`,
    (u) => fetchJson(u, tenantId).catch(() => null),
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );
  const riskTitleById = useMemo(() => {
    const m = new Map<string, string>();
    const arr = Array.isArray(risksList?.items) ? risksList.items : Array.isArray(risksList?.risks) ? risksList.risks : [];
    for (const r of arr) {
      const id = String(r.risk_id || r.id || '');
      const title = String(r.title || '');
      if (id) m.set(id, title);
    }
    return m;
  }, [risksList]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function remove(id: string) {
    if (!confirm('Remove this risk mapping?')) return;
    try {
      await delJson(`/api/risk-control-mappings/${encodeURIComponent(id)}`, tenantId);
      await mutate();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete mapping', e);
      alert(String(e?.message || 'Failed to delete mapping'));
    }
  }

  async function submit(values: any) {
    setSaving(true);
    try {
      await postJson('/api/risk-control-mappings', tenantId, {
        risk_id: String(values.risk_id || '').trim(),
        control_id: controlId,
        mapping_type: values.mapping_type,
        effectiveness: values.effectiveness || null,
        notes: values.notes || '',
      });
      setOpen(false);
      await mutate();
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to create mapping', e);
      alert(String(e?.message || 'Failed to link risk'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Linked Risks"
      extra={
        <Button onClick={() => setOpen(true)}>
          Link Risk
        </Button>
      }
    >
      {error ? <Alert type="warning" showIcon message="Mappings unavailable" description={String((error as any)?.message || error)} /> : null}
      {!error && !isLoading && items.length === 0 ? <Typography.Text type="secondary">No risks linked to this control</Typography.Text> : null}

      {!error && items.length ? (
        <Table<Mapping>
          rowKey={(r) => String(r.id)}
          size="small"
          pagination={false}
          dataSource={items}
          columns={[
            {
              title: 'Risk',
              dataIndex: 'risk_id',
              render: (v) => {
                const id = String(v || '');
                const title = riskTitleById.get(id) || '';
                return (
                  <div>
                    <a href={`/risks/${encodeURIComponent(id)}`} style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {id}
                    </a>
                    {title ? <div style={{ fontSize: 12, opacity: 0.75 }}>{title}</div> : null}
                  </div>
                );
              },
            },
            { title: 'Type', dataIndex: 'mapping_type', width: 140, render: (v) => <Tag>{String(v || '')}</Tag> },
            { title: 'Effectiveness', dataIndex: 'effectiveness', width: 140, render: (v) => effectivenessTag(v) },
            { title: 'Notes', dataIndex: 'notes', render: (v) => <Typography.Text>{String(v || '')}</Typography.Text> },
            { title: 'Action', width: 120, render: (_: any, r: any) => <Button danger size="small" onClick={() => remove(String(r.id))}>Remove</Button> },
          ]}
        />
      ) : null}

      <Modal open={open} title="Link Risk to Control" onCancel={() => setOpen(false)} footer={null} destroyOnClose>
        <Form
          layout="vertical"
          initialValues={{ risk_id: '', mapping_type: 'mitigates', effectiveness: 'medium', notes: '' }}
          onFinish={submit}
        >
          <Form.Item label="Risk ID (UUID) *" name="risk_id" rules={[{ required: true, message: 'Risk ID is required' }]}>
            <Input placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000" />
          </Form.Item>

          <Form.Item label="Mapping Type" name="mapping_type">
            <Select
              options={[
                { value: 'mitigates', label: 'Mitigates' },
                { value: 'monitors', label: 'Monitors' },
                { value: 'detects', label: 'Detects' },
                { value: 'prevents', label: 'Prevents' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Effectiveness" name="effectiveness">
            <Select
              options={[
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Notes" name="notes">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={saving}>
              Link Risk
            </Button>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
}


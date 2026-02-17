'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { Alert, Button, Card, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Tag, Typography, message } from 'antd';
import { useParams } from 'next/navigation';
import { usePermissions } from '../../../../lib/permissions';
import { ChecklistBuilder } from '../../../../components/tasks/ChecklistBuilder';
import type { ChecklistItem } from '../../../../components/tasks/ChecklistBuilder';
import { ChecklistProgress } from '../../../../components/tasks/ChecklistProgress';
import { getChecklistProgress, parseChecklist, sanitizeChecklist, serializeChecklist } from '../../../../components/tasks/checklist-utils';

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

async function fetchJson(url: string, tenantId: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('x-tenant-id', tenantId);
  const res = await fetch(url, { credentials: 'include', cache: 'no-store', ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(String(json?.error || `HTTP ${res.status}`)), { status: res.status, body: json });
  return json;
}

const StatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PriorityOptions = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function TaskDetailPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const params = useParams() as any;
  const taskId = String(params?.taskId || '');
  const { can } = usePermissions();

  const { data, error, mutate } = useSWR(taskId ? `/api/tasks/${encodeURIComponent(taskId)}` : null, (u) => fetchJson(u, tenantId));
  const task = (data as any)?.task;
  const comments: any[] = Array.isArray((data as any)?.comments) ? (data as any).comments : [];

  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [editChecklistItems, setEditChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [form] = Form.useForm();
  const checklistSaveRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!task) return;
    setChecklistItems(parseChecklist(task.checklist));
    setChecklistError(null);
  }, [task?.id, task?.checklist]);

  React.useEffect(() => {
    return () => {
      if (checklistSaveRef.current) clearTimeout(checklistSaveRef.current);
    };
  }, []);

  async function postComment() {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}/comments`, tenantId, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ comment_text: comment }),
      });
      setComment('');
      mutate();
    } catch (e: any) {
      message.error(String(e?.body?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(next: string) {
    setBusy(true);
    try {
      await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}/change-status`, tenantId, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ new_status: next }),
      });
      mutate();
    } catch (e: any) {
      message.error(String(e?.body?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(values: any) {
    setBusy(true);
    try {
      const { items: cleanedChecklist, error: checklistValidationError } = sanitizeChecklist(editChecklistItems);
      if (checklistValidationError) {
        message.error(checklistValidationError);
        return;
      }
      const payload: any = {
        task_title: values.task_title,
        task_description: values.task_description || null,
        priority: values.priority,
        status: values.status,
        assigned_to: values.assigned_to || null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        progress_percentage: values.progress_percentage != null ? Number(values.progress_percentage) : undefined,
        checklist: serializeChecklist(cleanedChecklist),
      };
      await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}`, tenantId, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setChecklistItems(cleanedChecklist);
      setEditOpen(false);
      mutate();
    } catch (e: any) {
      message.error(String(e?.body?.error || e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function scheduleChecklistSave(items: ChecklistItem[]) {
    if (!can('tasks.edit')) return;
    if (checklistSaveRef.current) clearTimeout(checklistSaveRef.current);
    checklistSaveRef.current = setTimeout(async () => {
      const { items: cleanedChecklist, error: checklistValidationError } = sanitizeChecklist(items);
      if (checklistValidationError) {
        setChecklistError(checklistValidationError);
        return;
      }
      setChecklistError(null);
      setChecklistSaving(true);
      try {
        const progress = getChecklistProgress(cleanedChecklist);
        await fetchJson(`/api/tasks/${encodeURIComponent(taskId)}`, tenantId, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            checklist: serializeChecklist(cleanedChecklist),
            progress_percentage: progress.percentage,
          }),
        });
        setChecklistItems(cleanedChecklist);
        mutate();
      } catch (e) {
        message.error('Failed to save task. Please try again.');
      } finally {
        setChecklistSaving(false);
      }
    }, 600);
  }

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <Alert type="error" showIcon message="Failed to load task" description={String((error as any)?.body?.error || (error as any)?.message || error)} />
      </div>
    );
  }

  if (!task) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <Typography.Text type="secondary">
              <a href="/tasks">← Tasks</a>
            </Typography.Text>
            <Typography.Title level={3} style={{ margin: 0 }}>
              {String(task.task_number)} — {String(task.task_title || '')}
            </Typography.Title>
            <Space style={{ marginTop: 8 }} wrap>
              <Tag>{String(task.task_type || '')}</Tag>
              <Tag>{String(task.status || '')}</Tag>
              <Tag color={String(task.priority) === 'critical' ? 'red' : String(task.priority) === 'high' ? 'volcano' : String(task.priority) === 'medium' ? 'gold' : 'green'}>
                {String(task.priority || '')}
              </Tag>
            </Space>
          </div>
          <Space>
            {can('tasks.edit') ? (
              <Select
                value={String(task.status || 'open')}
                options={StatusOptions}
                onChange={(v) => changeStatus(String(v))}
                style={{ minWidth: 180 }}
                disabled={busy}
              />
            ) : null}
            {can('tasks.edit') ? (
              <Button onClick={() => { form.setFieldsValue({
                task_title: task.task_title,
                task_description: task.task_description,
                priority: task.priority,
                status: task.status,
                assigned_to: task.assigned_to,
                due_date: task.due_date ? dayjs(String(task.due_date)) : null,
                progress_percentage: task.progress_percentage,
              });
                setEditChecklistItems(parseChecklist(task.checklist));
                setEditOpen(true);
              }}>
                Edit
              </Button>
            ) : null}
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Card title="Task information">
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                <div>
                  <Typography.Text type="secondary">Description</Typography.Text>
                  <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{String(task.task_description || '—')}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <div>
                    <Typography.Text type="secondary">Assigned To</Typography.Text>
                    <div style={{ marginTop: 4 }}>{String(task.assigned_to || '—')}</div>
                  </div>
                  <div>
                    <Typography.Text type="secondary">Due</Typography.Text>
                    <div style={{ marginTop: 4 }}>{task.due_date ? String(task.due_date).slice(0, 10) : '—'}</div>
                  </div>
                  <div>
                    <Typography.Text type="secondary">Progress</Typography.Text>
                    <div style={{ marginTop: 4 }}>
                      {checklistItems.length ? getChecklistProgress(checklistItems).percentage : Number(task.progress_percentage || 0)}%
                    </div>
                  </div>
                </div>
                <div>
                  <Typography.Text type="secondary">Checklist</Typography.Text>
                  <div className="mt-3 space-y-3">
                    <ChecklistProgress items={checklistItems} />
                    <ChecklistBuilder
                      value={checklistItems}
                      onChange={(items) => {
                        setChecklistItems(items);
                        scheduleChecklistSave(items);
                      }}
                      disabled={!can('tasks.edit')}
                    />
                    {checklistSaving ? (
                      <Typography.Text type="secondary">Saving checklist...</Typography.Text>
                    ) : null}
                    {checklistError ? (
                      <Typography.Text type="danger">{checklistError}</Typography.Text>
                    ) : null}
                  </div>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={10}>
            <Card title="Comments / Activity">
              <Space direction="vertical" style={{ width: '100%' }} size={10}>
                {can('tasks.edit') ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (supports @mentions)" />
                    <Button type="primary" onClick={postComment} loading={busy}>
                      Post
                    </Button>
                  </div>
                ) : null}
                <div style={{ maxHeight: 520, overflowY: 'auto' }}>
                  {comments.map((c: any) => (
                    <div key={String(c.id)} style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <Typography.Text strong>{String(c.created_by || 'user')}</Typography.Text>
                        <Typography.Text type="secondary">{String(c.created_at || '').replace('T', ' ').slice(0, 19)}</Typography.Text>
                      </div>
                      <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{String(c.comment_text || '')}</div>
                      {Array.isArray(c.mentioned_users) && c.mentioned_users.length ? (
                        <div style={{ marginTop: 6 }}>
                          {c.mentioned_users.map((m: any) => (
                            <Tag key={String(m)}>@{String(m)}</Tag>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {!comments.length ? <Typography.Text type="secondary">No comments yet.</Typography.Text> : null}
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>

      <Modal title="Edit Task" open={editOpen} onCancel={() => setEditOpen(false)} okText="Save" onOk={() => form.submit()} confirmLoading={busy} destroyOnClose width={760}>
        <Form form={form} layout="vertical" onFinish={saveEdit}>
          <Form.Item name="task_title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="task_description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select options={StatusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select options={PriorityOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="assigned_to" label="Assigned To (email)">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="due_date" label="Due Date">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="progress_percentage" label="Progress (%)">
                <Input type="number" min={0} max={100} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Task Checklist">
            <ChecklistBuilder value={editChecklistItems} onChange={setEditChecklistItems} />
            <Typography.Text type="secondary">Add checklist items for this task.</Typography.Text>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}


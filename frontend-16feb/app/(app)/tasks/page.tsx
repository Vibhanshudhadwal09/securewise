'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { Alert, Button as AntButton, Card, Col, DatePicker, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { CheckCircle, ClipboardList, Clock, ShieldAlert } from 'lucide-react';
import { usePermissions } from '../../../lib/permissions';
import { ChecklistBuilder } from '../../../components/tasks/ChecklistBuilder';
import type { ChecklistItem } from '../../../components/tasks/ChecklistBuilder';
import { TaskTemplateSelector } from '../../../components/tasks/TaskTemplateSelector';
import type { TaskTemplate } from '../../../lib/data/task-templates';
import { createChecklistId, sanitizeChecklist, serializeChecklist } from '../../../components/tasks/checklist-utils';
import { Button as UiButton } from '../../../components/ui/button';
import { HelpButton } from '@/components/help/HelpPanel';
import HelpPanel from '@/components/help/HelpPanel';
import EmptyState from '@/components/help/EmptyState';
import { helpContent } from '@/config/helpContent';
import { useToast } from '@/components/ui/Toast';
import { TableSkeleton } from '@/components/ui/LoadingStates';
import { FadeIn } from '@/components/ui/Transitions';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/MetricCard';
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

function prioColor(p: string) {
  const s = String(p || '').toLowerCase();
  if (s === 'critical') return 'red';
  if (s === 'high') return 'volcano';
  if (s === 'medium') return 'gold';
  return 'green';
}

export default function TasksPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { can } = usePermissions();

  const [filters, setFilters] = useState<{ status?: string; priority?: string; assigned_to?: string; task_type?: string; q?: string; due?: [any, any] | null }>(
    {}
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const toast = useToast();
  const [completing, setCompleting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [form] = Form.useForm();

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.status) p.set('status', filters.status);
    if (filters.priority) p.set('priority', filters.priority);
    if (filters.assigned_to) p.set('assigned_to', filters.assigned_to);
    if (filters.task_type) p.set('task_type', filters.task_type);
    if (filters.q) p.set('search', filters.q);
    if (filters.due?.[0]) p.set('due_from', String(filters.due[0]?.format?.('YYYY-MM-DD') || ''));
    if (filters.due?.[1]) p.set('due_to', String(filters.due[1]?.format?.('YYYY-MM-DD') || ''));
    p.set('limit', '200');
    return p.toString();
  }, [filters]);

  const { data, error, mutate } = useSWR(`/api/tasks${qs ? `?${qs}` : ''}`, (u) => fetchJson(u, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  const items: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];
  const loading = !data && !error;

  const openCount = useMemo(() => items.filter((t) => String(t.status) === 'open').length, [items]);
  const blockedCount = useMemo(() => items.filter((t) => String(t.status) === 'blocked').length, [items]);
  const completedCount = useMemo(() => items.filter((t) => String(t.status) === 'completed').length, [items]);
  const overdueCount = useMemo(() => {
    const today = dayjs().startOf('day');
    return items.filter((t) => t.due_date && dayjs(String(t.due_date)).isBefore(today) && String(t.status) !== 'completed').length;
  }, [items]);
  const dueWeek = useMemo(() => {
    const end = dayjs().add(7, 'day').endOf('day');
    return items.filter((t) => t.due_date && dayjs(String(t.due_date)).isBefore(end) && String(t.status) !== 'completed').length;
  }, [items]);

  async function handleCreateTask(values: any) {
    setCreating(true);
    try {
      const { items: cleanedChecklist, error: checklistError } = sanitizeChecklist(checklistItems);
      if (checklistError) {
        toast.error('Checklist needs attention', checklistError);
        return;
      }
      const payload = {
        task_title: values.task_title,
        task_description: values.task_description || null,
        task_type: values.task_type,
        task_category: values.task_category || null,
        priority: values.priority,
        status: values.status || 'open',
        assigned_to: values.assigned_to || null,
        due_date: values.due_date.format('YYYY-MM-DD'),
        checklist: serializeChecklist(cleanedChecklist),
      };
      await fetchJson('/api/tasks', tenantId, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      toast.success('Task created!', 'Task has been assigned');
      setCreateOpen(false);
      form.resetFields();
      setChecklistItems([]);
      setShowTemplates(false);
      mutate();
    } catch (e: any) {
      toast.error('Failed to create task', String(e?.body?.error || e?.message || e));
    } finally {
      setCreating(false);
    }
  }

  const handleCompleteTask = async (id: string) => {
    setCompleting(id);
    try {
      await fetchJson(`/api/tasks/${encodeURIComponent(id)}/change-status`, tenantId, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ new_status: 'completed' }),
      });
      toast.success('Task completed!', 'Great job!');
      mutate();
    } catch (error: any) {
      toast.error('Failed to complete task', error?.message || 'Please try again');
    } finally {
      setCompleting(null);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return;

    setDeleting(id);
    try {
      await fetchJson(`/api/tasks/${encodeURIComponent(id)}`, tenantId, { method: 'DELETE' });
      toast.success('Task deleted');
      mutate();
    } catch (error: any) {
      toast.error('Failed to delete task', error?.message || 'Please try again');
    } finally {
      setDeleting(null);
    }
  };

  const handleUpdateTask = async (id: string, data: any) => {
    setUpdating(id);
    try {
      await fetchJson(`/api/tasks/${encodeURIComponent(id)}`, tenantId, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data || {}),
      });
      toast.success('Task updated successfully');
      mutate();
    } catch (error: any) {
      toast.error('Failed to update task', error?.message || 'Please try again');
    } finally {
      setUpdating(null);
    }
  };

  function handleTemplateSelect(template: TaskTemplate) {
    form.setFieldsValue({
      task_title: template.name,
      task_description: template.description,
      task_type: template.taskType,
      priority: template.priority,
      due_date: dayjs().add(template.estimatedDays, 'day'),
    });
    setChecklistItems(
      template.checklist.map((item) => ({
        id: createChecklistId(),
        text: item.text,
        completed: false,
      }))
    );
    setShowTemplates(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Tasks"
        description="Manage and track all GRC tasks and assignments."
        icon={ClipboardList}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Tasks' },
        ]}
        stats={[
          { label: 'Open Tasks', value: openCount },
          { label: 'Overdue', value: overdueCount },
        ]}
        actions={
          <Space>
            <HelpButton onClick={() => setShowHelp(true)} />
            <AntButton onClick={() => mutate()}>Refresh</AntButton>
            {can('tasks.create') ? (
              <Button variant="primary" loading={creating} onClick={() => setCreateOpen(true)}>
                Create Task
              </Button>
            ) : null}
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Open Tasks" value={openCount} subtitle="Active work" icon={ClipboardList} color="blue" />
          <MetricCard title="Overdue" value={overdueCount} subtitle="Past due" icon={ShieldAlert} color="red" />
          <MetricCard title="Due This Week" value={dueWeek} subtitle="Upcoming" icon={Clock} color="orange" />
          <MetricCard title="Completed" value={completedCount} subtitle="Finished tasks" icon={CheckCircle} color="green" />
        </div>

      <FadeIn>
        {error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load tasks"
            description={String((error as any)?.body?.error || (error as any)?.message || error)}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Card style={{ marginBottom: 16 }}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={6}>
              <Select allowClear placeholder="Status" value={filters.status} options={StatusOptions} onChange={(v) => setFilters((p) => ({ ...p, status: v || undefined }))} style={{ width: '100%' }} />
            </Col>
            <Col xs={24} md={6}>
              <Select allowClear placeholder="Priority" value={filters.priority} options={PriorityOptions} onChange={(v) => setFilters((p) => ({ ...p, priority: v || undefined }))} style={{ width: '100%' }} />
            </Col>
            <Col xs={24} md={6}>
              <Input placeholder="Assignee email" value={filters.assigned_to} onChange={(e) => setFilters((p) => ({ ...p, assigned_to: e.target.value || undefined }))} />
            </Col>
            <Col xs={24} md={6}>
              <Input placeholder="Search" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value || undefined }))} />
            </Col>
            <Col xs={24}>
              <DatePicker.RangePicker value={filters.due || null} onChange={(v) => setFilters((p) => ({ ...p, due: (v as any) || null }))} style={{ width: '100%' }} />
            </Col>
          </Row>
        </Card>

        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState type="tasks" onAction={() => setCreateOpen(true)} />
        ) : (
          <Card>
            <Table
              rowKey="id"
              dataSource={items}
              pagination={{ pageSize: 20 }}
              columns={[
                {
                  title: 'Task #',
                  dataIndex: 'task_number',
                  render: (v: any, r: any) => (
                    <a href={`/tasks/${encodeURIComponent(String(r.id))}`} style={{ fontWeight: 600 }}>
                      {String(v || '')}
                    </a>
                  ),
                },
                { title: 'Title', dataIndex: 'task_title', render: (v: any) => <span style={{ fontWeight: 600 }}>{String(v || '')}</span> },
                { title: 'Type', dataIndex: 'task_type', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                { title: 'Priority', dataIndex: 'priority', render: (v: any) => <Tag color={prioColor(String(v))}>{String(v || '')}</Tag> },
                { title: 'Status', dataIndex: 'status', render: (v: any) => <Tag>{String(v || '')}</Tag> },
                { title: 'Assigned To', dataIndex: 'assigned_to', render: (v: any) => String(v || '—') },
                { title: 'Due', dataIndex: 'due_date', render: (v: any, r: any) => {
                  const s = v ? String(v).slice(0, 10) : '—';
                  const overdue = v && dayjs(String(v)).isBefore(dayjs().startOf('day')) && String(r.status) !== 'completed';
                  return <span style={overdue ? { color: '#cf1322', fontWeight: 600 } : undefined}>{s}</span>;
                } },
                { title: 'Progress', dataIndex: 'progress_percentage', render: (v: any) => `${Number(v || 0)}%` },
                {
                  title: 'Actions',
                  render: (_: any, task: any) => {
                    const taskId = String(task.id || '');
                    const status = String(task.status || '');
                    const nextStatus = status === 'open' ? 'in_progress' : status === 'in_progress' ? 'pending_review' : status;
                    const canUpdate = can('tasks.edit') && nextStatus !== status;
                    const canComplete = can('tasks.edit') && status !== 'completed' && status !== 'cancelled';

                    return (
                      <div className="flex flex-wrap gap-2">
                        {can('tasks.edit') ? (
                          <Button
                            variant="success"
                            size="sm"
                            loading={completing === taskId}
                            onClick={() => handleCompleteTask(taskId)}
                            disabled={!canComplete}
                          >
                            Complete
                          </Button>
                        ) : null}
                        {can('tasks.edit') ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={updating === taskId}
                            onClick={() => handleUpdateTask(taskId, { status: nextStatus })}
                            disabled={!canUpdate}
                          >
                            Update
                          </Button>
                        ) : null}
                        {can('tasks.delete') ? (
                          <Button
                            variant="danger"
                            size="sm"
                            loading={deleting === taskId}
                            onClick={() => handleDeleteTask(taskId)}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    );
                  },
                },
              ]}
            />
          </Card>
        )}
      </FadeIn>

      <Modal
        title="Create Task"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false);
          setChecklistItems([]);
          setShowTemplates(false);
        }}
        okText="Create"
        confirmLoading={creating}
        onOk={() => form.submit()}
        destroyOnClose
        width={720}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
          initialValues={{
            priority: 'medium',
            status: 'open',
            task_type: 'general',
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <Typography.Text type="secondary">Prefill from a best-practice template.</Typography.Text>
            <UiButton variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
              Browse Templates
            </UiButton>
          </div>
          <Form.Item name="task_title" label="Task Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="task_description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="task_type" label="Task Type" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'review', label: 'Review' },
                    { value: 'approval', label: 'Approval' },
                    { value: 'task', label: 'Task' },
                    { value: 'assessment', label: 'Assessment' },
                    { value: 'attestation', label: 'Attestation' },
                    { value: 'remediation', label: 'Remediation' },
                    { value: 'evidence_collection', label: 'Evidence Collection' },
                    { value: 'audit_task', label: 'Audit Task' },
                    { value: 'general', label: 'General' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select options={PriorityOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="assigned_to" label="Assigned To (email)">
                <Input placeholder="user@company.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="due_date" label="Due Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Task Checklist">
            <ChecklistBuilder value={checklistItems} onChange={setChecklistItems} />
            <Typography.Text type="secondary">Add checklist items for this task.</Typography.Text>
          </Form.Item>
          <Typography.Text type="secondary">
            Tip: use <code>@email</code> mentions in comments on the task detail page.
          </Typography.Text>
        </Form>
      </Modal>
      <TaskTemplateSelector open={showTemplates} onClose={() => setShowTemplates(false)} onSelect={handleTemplateSelect} />

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        content={helpContent.taskManagement}
        title="Task Management Help"
      />
    </div>
    </div>
  );
}


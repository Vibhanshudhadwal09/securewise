'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Alert, Button as AntButton, Card, Select, Space, Tabs, Typography } from 'antd';
import { CheckCircle, Clock, Workflow as WorkflowIcon } from 'lucide-react';
import { usePermissions } from '../../../lib/permissions';
import { ApprovalRequestCard } from '../../../components/approvals/ApprovalRequestCard';
import { ApprovalRequestDetailsModal } from '../../../components/approvals/ApprovalRequestDetailsModal';
import { WorkflowBuilder } from '../../../components/workflows/WorkflowBuilder';
import { WorkflowList } from '../../../components/workflows/WorkflowList';
import { WorkflowTemplateSelector } from '../../../components/workflows/WorkflowTemplateSelector';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button as UiButton } from '../../../components/ui/button';
import { getApprovalRequestDetails, getApprovalRequests, approveRequest, rejectRequest } from '../../../lib/api/approval-requests';
import { activateWorkflow, createWorkflow, deactivateWorkflow, deleteWorkflow, getWorkflows, updateWorkflow } from '../../../lib/api/workflows';
import type { ApprovalAction, ApprovalRequest, ApprovalStep, Workflow, WorkflowTemplate } from '../../../types/workflows';
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

export function ApprovalsHubClient() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { can } = usePermissions();

  const [tab, setTab] = useState('requests');
  const [statusFilter, setStatusFilter] = useState<string | undefined>('in_progress');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);
  const [workflowBuilderOpen, setWorkflowBuilderOpen] = useState(false);
  const [workflowTemplateOpen, setWorkflowTemplateOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const toast = useToast();
  const [approving, setApproving] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: reqsData, error: reqsError, mutate: refreshReqs } = useSWR(
    ['approval-requests', tab, statusFilter, tenantId],
    () => getApprovalRequests({ limit: 200, status: statusFilter }, tenantId),
    { revalidateOnFocus: false, refreshInterval: 30_000 }
  );

  const { data: workflowsData, error: wfError, mutate: refreshWf } = useSWR(
    tab === 'workflows' ? ['approval-workflows', tenantId] : null,
    () => getWorkflows(undefined, tenantId),
    { revalidateOnFocus: false }
  );

  const requestsLoading = tab === 'requests' && !reqsData && !reqsError;
  const workflowsLoading = tab === 'workflows' && !workflowsData && !wfError;

  const requests: ApprovalRequest[] = Array.isArray((reqsData as any)?.items) ? (reqsData as any).items : [];
  const workflows: Workflow[] = Array.isArray((workflowsData as any)?.items) ? (workflowsData as any).items : [];

  const { data: detailData, error: detailError, mutate: refreshDetail } = useSWR(
    selectedRequestId ? ['approval-request-detail', selectedRequestId, tenantId] : null,
    () => getApprovalRequestDetails(selectedRequestId as string, tenantId),
    { revalidateOnFocus: false }
  );

  const detailRequest: ApprovalRequest | null = detailData?.request || null;
  const detailSteps: ApprovalStep[] = Array.isArray(detailData?.steps) ? detailData.steps : [];
  const detailActions: ApprovalAction[] = Array.isArray(detailData?.actions) ? detailData.actions : [];

  const totalRequests = requests.length;
  const inProgressRequests = requests.filter((r) => r.overall_status === 'in_progress').length;
  const approvedRequests = requests.filter((r) => r.overall_status === 'approved').length;
  const workflowCount = workflows.length;

  const currentStep = detailSteps.find((step) => step.step_number === detailRequest?.current_step_number) || detailSteps.find((step) => step.step_status === 'in_progress');
  const canApprove = Boolean(can('approvals.approve') && currentStep && detailRequest?.overall_status === 'in_progress');

  const handleApprove = async (requestId: string, comments?: string) => {
    if (!currentStep) return;
    setApproving(requestId);
    try {
      await approveRequest(requestId, currentStep.id, comments || '', tenantId);
      toast.success('Request approved!', 'Requester has been notified');
      refreshReqs();
      refreshDetail();
    } catch (error: any) {
      toast.error('Failed to approve request', error?.message || 'Please try again');
    } finally {
      setApproving(null);
    }
  };

  const handleReject = async (requestId: string, reason?: string) => {
    if (!currentStep) return;
    setRejecting(requestId);
    try {
      await rejectRequest(requestId, currentStep.id, reason || '', tenantId);
      toast.success('Request rejected', 'Requester has been notified');
      refreshReqs();
      refreshDetail();
    } catch (error: any) {
      toast.error('Failed to reject request', error?.message || 'Please try again');
    } finally {
      setRejecting(null);
    }
  };

  async function handleDecision(action: 'approve' | 'reject', comments: string) {
    if (!detailRequest || !currentStep) return;
    setSavingDecision(true);
    try {
      if (action === 'approve') {
        await handleApprove(detailRequest.id, comments);
      } else {
        await handleReject(detailRequest.id, comments);
      }
    } catch (e: any) {
      toast.error('Failed to update request', String(e?.body?.error || e?.message || e));
    } finally {
      setSavingDecision(false);
    }
  }

  function openRequestDetails(requestId: string) {
    setSelectedRequestId(requestId);
    setDetailOpen(true);
  }

  const handleCreateWorkflow = async (data: Workflow) => {
    setCreating(true);
    try {
      await createWorkflow(data, tenantId);
      toast.success('Workflow created!', 'Workflow is now active');
      setWorkflowBuilderOpen(false);
      setEditingWorkflow(null);
      refreshWf();
    } catch (error: any) {
      toast.error('Failed to create workflow', error?.message || 'Please try again');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;

    setDeleting(id);
    try {
      await deleteWorkflow(id, tenantId);
      toast.success('Workflow deleted');
      refreshWf();
    } catch (error: any) {
      toast.error('Failed to delete workflow', error?.message || 'Please try again');
    } finally {
      setDeleting(null);
    }
  };

  async function saveWorkflow(next: Workflow) {
    try {
      if (next.id) {
        await updateWorkflow(next.id, next, tenantId);
        toast.success('Workflow updated successfully');
        setWorkflowBuilderOpen(false);
        setEditingWorkflow(null);
        refreshWf();
      } else {
        await handleCreateWorkflow(next);
      }
    } catch (e: any) {
      toast.error('Failed to update workflow', String(e?.body?.error || e?.message || e));
    }
  }

  function handleTemplateSelect(template: WorkflowTemplate) {
    setEditingWorkflow({
      id: '',
      tenant_id: tenantId,
      workflow_name: template.name,
      workflow_description: template.description,
      trigger_entity_type: template.entity_type,
      approval_steps: {
        steps: template.steps.map((step, index) => ({
          step_number: index + 1,
          step_name: step.name,
          approver_type: 'role',
          approver_roles: step.role ? [step.role] : [],
          approver_emails: [],
          required: true,
          auto_approve_hours: step.timeout_hours,
        })),
      },
      is_active: true,
      created_by: null,
      created_at: '',
      updated_at: '',
    });
    setWorkflowTemplateOpen(false);
    setWorkflowBuilderOpen(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
      <PageHeader
        title="Approvals"
        description="Manage approval requests and workflow templates."
        icon={WorkflowIcon}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Approvals' },
        ]}
        stats={[
          { label: 'Requests', value: totalRequests },
          { label: 'Workflows', value: workflowCount },
        ]}
        actions={
          <Space>
            <HelpButton onClick={() => setShowHelp(true)} />
            <AntButton onClick={() => { refreshReqs(); refreshWf(); }}>Refresh</AntButton>
            {tab === 'workflows' && can('approvals.delegate') ? (
              <>
                <AntButton onClick={() => setWorkflowTemplateOpen(true)}>Use Template</AntButton>
                <Button
                  variant="primary"
                  loading={creating}
                  onClick={() => {
                    setEditingWorkflow(null);
                    setWorkflowBuilderOpen(true);
                  }}
                >
                  Create Workflow
                </Button>
              </>
            ) : null}
          </Space>
        }
      />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="In Progress" value={inProgressRequests} subtitle="Awaiting decisions" icon={Clock} color="orange" />
          <MetricCard title="Approved" value={approvedRequests} subtitle="Completed" icon={CheckCircle} color="green" />
          <MetricCard title="Total Requests" value={totalRequests} subtitle="All statuses" icon={WorkflowIcon} color="blue" />
          <MetricCard title="Workflows" value={workflowCount} subtitle="Active templates" icon={WorkflowIcon} color="purple" />
        </div>

      {reqsError ? (
        <Alert type="error" showIcon message="Failed to load approval requests" description={String((reqsError as any)?.body?.error || (reqsError as any)?.message || reqsError)} style={{ marginBottom: 16 }} />
      ) : null}
      {wfError ? (
        <Alert type="error" showIcon message="Failed to load workflows" description={String((wfError as any)?.body?.error || (wfError as any)?.message || wfError)} style={{ marginBottom: 16 }} />
      ) : null}

      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'requests',
            label: 'Requests',
            children: (
              <FadeIn>
                {requestsLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Typography.Text type="secondary">Status</Typography.Text>
                      <Select
                        style={{ width: 220 }}
                        value={statusFilter}
                        onChange={(v) => setStatusFilter(v || undefined)}
                        allowClear
                        options={[
                          { value: 'in_progress', label: 'In progress' },
                          { value: 'pending', label: 'Pending' },
                          { value: 'approved', label: 'Approved' },
                          { value: 'rejected', label: 'Rejected' },
                          { value: 'cancelled', label: 'Cancelled' },
                        ]}
                      />
                    </div>
                    {requests.length === 0 ? (
                      <EmptyState
                        type="approvals"
                        title="No approval requests yet"
                        description="Submit an item for approval or create a workflow to start routing requests."
                        onAction={() => {
                          setTab('workflows');
                          setWorkflowTemplateOpen(true);
                        }}
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {requests.map((request) => (
                          <ApprovalRequestCard key={request.id} request={request} onClick={() => openRequestDetails(request.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </FadeIn>
            ),
          },
          {
            key: 'workflows',
            label: 'Workflows',
            children: (
              <FadeIn>
                {workflowsLoading ? (
                  <TableSkeleton rows={5} columns={4} />
                ) : (
                  <div>
                    {workflows.length === 0 ? (
                      <EmptyState
                        type="approvals"
                        title="No workflows configured"
                        description="Create an approval workflow to start routing policy and risk approvals."
                        onAction={() => setWorkflowTemplateOpen(true)}
                      />
                    ) : (
                      <WorkflowList
                        workflows={workflows}
                        onEdit={(id) => {
                          const wf = workflows.find((w) => w.id === id) || null;
                          setEditingWorkflow(wf);
                          setWorkflowBuilderOpen(true);
                        }}
                        deletingId={deleting}
                        onDelete={handleDeleteWorkflow}
                        onToggleActive={async (id, active) => {
                          try {
                            if (active) await activateWorkflow(id, tenantId);
                            else await deactivateWorkflow(id, tenantId);
                            toast.success(active ? 'Workflow activated' : 'Workflow deactivated');
                            refreshWf();
                          } catch (e: any) {
                            toast.error('Failed to update workflow', String(e?.body?.error || e?.message || e));
                          }
                        }}
                        onDuplicate={(id) => {
                          const wf = workflows.find((w) => w.id === id);
                          if (!wf) return;
                          setEditingWorkflow({
                            ...wf,
                            id: '',
                            workflow_name: `${wf.workflow_name} (Copy)`,
                          });
                          setWorkflowBuilderOpen(true);
                        }}
                      />
                    )}
                  </div>
                )}
              </FadeIn>
            ),
          },
          {
            key: 'legacy',
            label: 'Legacy Inbox',
            children: (
              <Card>
                <Typography.Title level={5} style={{ marginTop: 0 }}>
                  Legacy approvals inbox
                </Typography.Title>
                <Typography.Text type="secondary">
                  The older exceptions/evidence approvals UI is still available at <code>/approvals</code> in the previous version. This tab is a placeholder while we fully migrate.
                </Typography.Text>
              </Card>
            ),
          },
        ]}
      />

      {detailRequest ? (
        <ApprovalRequestDetailsModal
          request={detailRequest}
          steps={detailSteps}
          actions={detailActions}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedRequestId(null);
          }}
          onAction={handleDecision}
          canApprove={canApprove}
          loading={savingDecision || approving === detailRequest.id || rejecting === detailRequest.id}
        />
      ) : null}

      {detailError ? (
        <Alert type="error" showIcon message="Failed to load request details" description={String((detailError as any)?.body?.error || (detailError as any)?.message || detailError)} style={{ marginTop: 16 }} />
      ) : null}

      <Dialog open={workflowBuilderOpen} onOpenChange={(next) => (next ? undefined : setWorkflowBuilderOpen(false))}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editingWorkflow?.id ? 'Edit Workflow' : 'Create Workflow'}</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[70vh] overflow-y-auto">
            <WorkflowBuilder workflow={editingWorkflow} onSave={saveWorkflow} onCancel={() => setWorkflowBuilderOpen(false)} />
          </DialogBody>
          <DialogFooter>
            <UiButton variant="outline" onClick={() => setWorkflowBuilderOpen(false)}>
              Close
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={workflowTemplateOpen} onOpenChange={(next) => (next ? undefined : setWorkflowTemplateOpen(false))}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Workflow Templates</DialogTitle>
          </DialogHeader>
          <DialogBody className="max-h-[70vh] overflow-y-auto">
            <WorkflowTemplateSelector onSelect={handleTemplateSelect} />
          </DialogBody>
          <DialogFooter>
            <UiButton variant="outline" onClick={() => setWorkflowTemplateOpen(false)}>
              Close
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        content={helpContent.approvals}
        title="Approvals & Workflows Help"
      />
    </div>
    </div>
  );
}


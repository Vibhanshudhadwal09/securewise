export interface WorkflowStepTemplate {
  step_number: number;
  step_name: string;
  approver_type: 'role' | 'user';
  approver_roles?: string[];
  approver_emails?: string[];
  required?: boolean;
  auto_approve_hours?: number | null;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  workflow_name: string;
  workflow_description?: string | null;
  trigger_entity_type: string;
  trigger_conditions?: any;
  approval_steps?: { steps: WorkflowStepTemplate[] };
  require_all_approvers?: boolean;
  allow_parallel_approval?: boolean;
  auto_approve_if_creator_is_approver?: boolean;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRequest {
  id: string;
  tenant_id: string;
  workflow_id: string;
  request_number?: string | null;
  request_title: string;
  request_description?: string | null;
  entity_type: string;
  entity_id: string;
  entity_data?: any;
  requested_by: string;
  requested_at: string;
  current_step_number: number;
  overall_status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'cancelled';
  approved_at?: string | null;
  rejected_at?: string | null;
  expires_at?: string | null;
  final_decision?: string | null;
  final_decision_by?: string | null;
  final_decision_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalStep {
  id: string;
  approval_request_id: string;
  step_number: number;
  step_name: string;
  approver_type: string;
  approver_roles?: string[] | null;
  approver_emails?: string[] | null;
  step_status: string;
  decision?: string | null;
  decision_by?: string | null;
  decision_at?: string | null;
  decision_notes?: string | null;
  delegated_to?: string | null;
  delegated_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  is_required: boolean;
  auto_approve_hours?: number | null;
  created_at?: string;
}

export interface ApprovalAction {
  id: string;
  request_id: string;
  step_order: number;
  approver_email: string;
  action: 'approve' | 'reject' | 'comment';
  comments?: string | null;
  action_date: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  entity_type: string;
  steps: Array<{
    name: string;
    role?: string;
    timeout_hours: number;
  }>;
}

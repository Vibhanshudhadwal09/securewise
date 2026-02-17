import type { WorkflowTemplate } from '@/types/workflows';

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'policy-approval',
    name: 'Policy Approval Workflow',
    description: 'Two-step approval for policy updates',
    entity_type: 'policy',
    steps: [
      { name: 'Manager Review', role: 'manager', timeout_hours: 72 },
      { name: 'Compliance Team Approval', role: 'compliance', timeout_hours: 48 },
    ],
  },
  {
    id: 'risk-acceptance',
    name: 'Risk Acceptance Workflow',
    description: 'Multi-level approval for accepting risks',
    entity_type: 'risk',
    steps: [
      { name: 'Risk Owner Review', role: 'risk_owner', timeout_hours: 48 },
      { name: 'Security Team Assessment', role: 'security', timeout_hours: 72 },
      { name: 'Executive Approval', role: 'executive', timeout_hours: 96 },
    ],
  },
  {
    id: 'control-exception',
    name: 'Control Exception Approval',
    description: 'Approve exceptions to security controls',
    entity_type: 'control',
    steps: [
      { name: 'Security Manager Review', role: 'security_manager', timeout_hours: 48 },
      { name: 'CISO Approval', role: 'ciso', timeout_hours: 72 },
    ],
  },
  {
    id: 'vendor-approval',
    name: 'Vendor Onboarding Approval',
    description: 'Multi-step vendor security approval',
    entity_type: 'vendor',
    steps: [
      { name: 'Procurement Review', role: 'procurement', timeout_hours: 24 },
      { name: 'Security Assessment', role: 'security', timeout_hours: 72 },
      { name: 'Legal Approval', role: 'legal', timeout_hours: 48 },
    ],
  },
  {
    id: 'document-approval',
    name: 'Simple Document Approval',
    description: 'Single-step approval for documents',
    entity_type: 'document',
    steps: [{ name: 'Manager Approval', role: 'manager', timeout_hours: 72 }],
  },
  {
    id: 'change-request',
    name: 'Infrastructure Change Approval',
    description: 'CAB approval for infrastructure changes',
    entity_type: 'change_request',
    steps: [
      { name: 'Team Lead Review', role: 'team_lead', timeout_hours: 24 },
      { name: 'Security Review', role: 'security', timeout_hours: 48 },
      { name: 'CAB Approval', role: 'cab', timeout_hours: 72 },
    ],
  },
  {
    id: 'access-request',
    name: 'Privileged Access Request',
    description: 'Approval for privileged system access',
    entity_type: 'access_request',
    steps: [
      { name: 'Manager Approval', role: 'manager', timeout_hours: 24 },
      { name: 'IT Security Approval', role: 'it_security', timeout_hours: 48 },
    ],
  },
  {
    id: 'budget-approval',
    name: 'Security Budget Approval',
    description: 'Approval workflow for security expenditures',
    entity_type: 'budget',
    steps: [
      { name: 'Department Head', role: 'department_head', timeout_hours: 48 },
      { name: 'Finance Approval', role: 'finance', timeout_hours: 72 },
    ],
  },
  {
    id: 'incident-response',
    name: 'Major Incident Escalation',
    description: 'Escalation workflow for major incidents',
    entity_type: 'incident',
    steps: [
      { name: 'Security Manager Notification', role: 'security_manager', timeout_hours: 4 },
      { name: 'Executive Notification', role: 'executive', timeout_hours: 8 },
    ],
  },
  {
    id: 'audit-finding',
    name: 'Audit Finding Remediation',
    description: 'Approval to close audit findings',
    entity_type: 'audit_finding',
    steps: [
      { name: 'Control Owner Verification', role: 'control_owner', timeout_hours: 72 },
      { name: 'Audit Lead Approval', role: 'audit_lead', timeout_hours: 48 },
    ],
  },
];

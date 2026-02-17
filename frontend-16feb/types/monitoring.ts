export interface MonitoringTemplate {
  template_id: string;
  category: string;
  rule_type: string;
  template_name: string;
  description: string;
  config_schema: any;
  default_config: any;
  severity: 'info' | 'medium' | 'high' | 'critical' | 'warning';
  check_frequency_minutes: number;
  notification_channels: string[];
  icon: string;
}

export interface MonitoringRule {
  id: string;
  tenant_id: string;
  rule_name: string;
  description?: string;
  category: string;
  rule_type: string;
  template_id?: string;
  config: any;
  check_frequency_minutes: number;
  severity: string;
  threshold_value?: any;
  conditions?: any;
  notification_channels: any;
  notification_enabled: boolean;
  is_active: boolean;
  last_checked_at?: string;
  next_check_at?: string;
  last_result?: any;
  status: 'pending' | 'active' | 'failed' | 'paused';
}

export interface MonitoringAlert {
  id: string;
  tenant_id: string;
  rule_id: string;
  rule_name: string;
  severity: 'info' | 'warning' | 'high' | 'critical';
  alert_type: string;
  message: string;
  details: any;
  affected_resource?: string;
  resource_type?: string;
  status: 'open' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  detected_at: string;
}

export interface MonitoringExecution {
  id: string;
  rule_id: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'running' | 'success' | 'failed';
  result?: any;
  error_message?: string;
  resources_checked: number;
  issues_found: number;
  alerts_created: number;
}

export interface MonitoringRuleCreate {
  rule_name: string;
  description?: string;
  category: string;
  rule_type: string;
  template_id?: string;
  config: any;
  check_frequency_minutes: number;
  severity: string;
  threshold_value?: any;
  conditions?: any;
  notification_channels: any;
  notification_enabled: boolean;
  is_active: boolean;
}

export interface AlertFilters {
  status?: string;
  severity?: string;
  limit?: number;
}

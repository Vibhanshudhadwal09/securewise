export interface ControlTestTemplate {
  template_id: string;
  category: string;
  test_type: string;
  template_name: string;
  description: string;
  config_schema: any;
  default_config: any;
  pass_criteria: any;
  suggested_controls: string[];
  difficulty: 'easy' | 'medium' | 'advanced';
}

export interface ControlTestScript {
  id: string;
  tenant_id: string;
  script_name: string;
  description?: string;
  test_type: string;
  template_id?: string;
  category: string;
  config_type: 'no_code' | 'script';
  test_config?: any;
  language?: string;
  script_content?: string;
  script_parameters?: any;
  pass_criteria: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  control_ids: string[];
  framework?: string;
  is_active: boolean;
  schedule_enabled: boolean;
  schedule_cron?: string;
  timeout_seconds: number;
  retry_count: number;
  last_run_at?: string;
  last_run_status?: string;
  last_run_result?: any;
  next_run_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ControlTestExecution {
  id: string;
  tenant_id: string;
  script_id: string;
  script_name: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'running' | 'passed' | 'failed' | 'error';
  test_result: 'pass' | 'fail';
  pass_count: number;
  fail_count: number;
  details: any;
  output?: string;
  error_message?: string;
  evidence_collected: boolean;
  evidence_id?: string;
  triggered_by: string;
  trigger_type: 'manual' | 'scheduled' | 'api';
}

export interface ControlTestScriptCreate {
  script_name: string;
  description?: string;
  test_type: string;
  template_id?: string;
  category: string;
  config_type: 'no_code' | 'script';
  test_config?: any;
  language?: string;
  script_content?: string;
  script_parameters?: any;
  pass_criteria: any;
  severity: string;
  control_ids: string[];
  framework?: string;
  schedule_enabled: boolean;
  schedule_cron?: string;
  timeout_seconds: number;
}

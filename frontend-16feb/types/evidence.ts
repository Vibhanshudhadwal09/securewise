export interface EvidenceTemplate {
  id: string;
  template_name: string;
  category: string;
  subcategory?: string | null;
  collection_method: 'api' | 'script' | 'tls_check' | 'cloud_provider';
  config_schema: any;
  default_config: any;
  suggested_controls: string[];
  description?: string | null;
  icon?: string | null;
  updated_at?: string | null;
}

export interface EvidenceAutomation {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  collection_method: string;
  collection_config: any;
  template_id?: string;
  control_ids: string[];
  schedule_frequency?: string;
  schedule_time?: string;
  retention_days: number;
  is_active: boolean;
  last_collected_at?: string;
  next_collection_at?: string;
  status: 'active' | 'failed' | 'paused';
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  response?: any;
  metrics?: {
    response_time_ms: number;
    evidence_size_bytes: number;
    status_code?: number;
  };
}

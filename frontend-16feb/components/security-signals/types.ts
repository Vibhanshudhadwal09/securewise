export type RangePreset = '1h' | '24h' | '7d' | '30d';

export type SecuritySignalsSummary = {
  alertsTotal: number;
  severity: { critical: number; high: number; medium: number; low: number };
  cisFailures: number;
  mitreTactics: number;
  evidenceFreshnessHours?: number | null;
  partial: boolean;
};

export type SecuritySignalsTimeline = {
  interval: '1h' | '6h' | '1d';
  points: Array<{ ts: string; count: number }>;
  partial: boolean;
};

export type SecuritySignalsAlertItem = {
  timestamp: string;
  agent: string;
  severity: number;
  rule: string;
  frameworks: string[];
  mitre: string[];
  message: string;
};

export type SecuritySignalsAlertsPage = {
  items: SecuritySignalsAlertItem[];
  nextCursor: string | null;
  partial: boolean;
};

export type SecuritySignalsCompliance = {
  framework: 'CIS' | 'PCI' | 'GDPR';
  failures: Array<{ control: string; count: number }>;
  partial: boolean;
};

export type SecuritySignalsHealth = {
  opensearch: 'healthy' | 'warning' | 'unhealthy';
  latencyMs: number | null;
  partial: boolean;
  components?: {
    telemetryManager?: { label?: string; ok?: boolean; latencyMs?: number | null };
    signalsIndexer?: { label?: string; ok?: boolean; latencyMs?: number | null };
  };
};


import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import KPITrendChart from './KPITrendChart';

export type KPITrend = 'up' | 'down' | 'stable';
export type KPIStatus = 'good' | 'warning' | 'critical';

export type KPIData = {
  id?: string;
  name?: string;
  label?: string;
  value?: number | string | null;
  unit?: string;
  trend?: KPITrend;
  changePct?: number | null;
  status?: KPIStatus | null;
  description?: string | null;
};

function formatValue(value: KPIData['value'], unit?: string) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number' && Number.isFinite(value)) {
    const base = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
    return unit ? `${base} ${unit}` : base;
  }
  return unit ? `${String(value)} ${unit}` : String(value);
}

function trendFromChange(changePct?: number | null): KPITrend {
  if (changePct === null || changePct === undefined || !Number.isFinite(changePct)) return 'stable';
  if (changePct > 0) return 'up';
  if (changePct < 0) return 'down';
  return 'stable';
}

function statusLabel(status?: KPIStatus | null) {
  if (status === 'good') return 'Good';
  if (status === 'warning') return 'Warning';
  if (status === 'critical') return 'Critical';
  return 'Neutral';
}

function statusClasses(status?: KPIStatus | null) {
  if (status === 'good') return 'bg-green-50 text-green-700 border-green-200';
  if (status === 'warning') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (status === 'critical') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

export default function KPICard({ kpi }: { kpi: KPIData }) {
  const title = kpi.label || kpi.name || kpi.id || 'KPI';
  const trend = kpi.trend || trendFromChange(kpi.changePct);
  const changePct = kpi.changePct;
  const trendSymbol = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '■';
  const trendClass = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500';

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge className={statusClasses(kpi.status)}>{statusLabel(kpi.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold text-gray-900">{formatValue(kpi.value, kpi.unit)}</div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className={`${trendClass} font-medium`}>
            {trendSymbol}
            {changePct !== null && changePct !== undefined && Number.isFinite(changePct)
              ? ` ${Math.abs(changePct).toFixed(1)}%`
              : ' —'}
          </span>
          <span className="text-gray-500">
            {trend === 'up' ? 'increase' : trend === 'down' ? 'decrease' : 'no change'}
          </span>
        </div>
        {kpi.description ? <div className="mt-2 text-xs text-gray-500">{kpi.description}</div> : null}
        {kpi.id ? (
          <div className="mt-3">
            <KPITrendChart kpiId={kpi.id} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

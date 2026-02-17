import React from 'react';
import { Card } from '../ui/card';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';

export type EnforcementDecisionRow = {
  decision_id: string;
  created_at?: string;
  signal_type?: string;
  signal_severity?: string;
  control_name?: string;
  violation_type?: string;
  action_type?: string;
  selected_vendor?: string;
  execution_status?: string;
  success?: boolean;
  execution_time_ms?: number;
};

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : value;
}

function formatMs(ms?: number) {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function DecisionsList(props: {
  decisions: EnforcementDecisionRow[];
  onViewDetails?: (id: string) => void;
  compact?: boolean;
  title?: string;
}) {
  const { decisions, onViewDetails, compact, title } = props;
  const colSpan = (compact ? 6 : 8) + (onViewDetails ? 1 : 0);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title || 'Recent Enforcement Decisions'}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-500 border-b">
            <tr>
              <th className="text-left py-2 pr-4">Time</th>
              {!compact && <th className="text-left py-2 pr-4">Signal</th>}
              <th className="text-left py-2 pr-4">Control</th>
              <th className="text-left py-2 pr-4">Action</th>
              <th className="text-left py-2 pr-4">Vendor</th>
              <th className="text-left py-2 pr-4">Status</th>
              {!compact && <th className="text-left py-2 pr-4">Exec Time</th>}
              {onViewDetails ? <th className="text-left py-2 pr-4">Details</th> : null}
            </tr>
          </thead>
          <tbody>
            {decisions.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="py-6 text-center text-gray-500">
                  No enforcement decisions yet.
                </td>
              </tr>
            ) : (
              decisions.map((d) => (
                <tr key={d.decision_id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDate(d.created_at)}</td>
                  {!compact && (
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700">{d.signal_type || '-'}</span>
                        <SeverityBadge severity={d.signal_severity || ''} />
                      </div>
                    </td>
                  )}
                  <td className="py-2 pr-4">{d.control_name || d.violation_type || '-'}</td>
                  <td className="py-2 pr-4">{String(d.action_type || '').replace(/_/g, ' ') || '-'}</td>
                  <td className="py-2 pr-4">{d.selected_vendor || '-'}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={d.execution_status || (d.success ? 'completed' : 'failed')} />
                  </td>
                  {!compact && <td className="py-2 pr-4">{formatMs(d.execution_time_ms)}</td>}
                  {onViewDetails ? (
                    <td className="py-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        onClick={() => onViewDetails(d.decision_id)}
                      >
                        View
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

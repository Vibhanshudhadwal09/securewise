import React from 'react';
import { Card } from '../ui/card';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

export type ViolationRow = {
  violation_id: string;
  signal_id?: string;
  control_name?: string;
  violation_type?: string;
  severity?: string;
  recommended_action?: string;
  enforcement_status?: string;
  detected_at?: string;
  signal_title?: string;
  asset_name?: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : value;
}

export function ViolationsList(props: {
  violations: ViolationRow[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onRetry: (id: string) => void;
  actionDisabled?: boolean;
}) {
  const { violations, selectedIds, onToggle, onToggleAll, onApprove, onReject, onRetry, actionDisabled } = props;
  const allSelected = violations.length > 0 && violations.every((v) => selectedIds.has(v.violation_id));

  return (
    <Card className="p-4">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-xs uppercase text-gray-500 border-b">
            <tr>
              <th className="text-left py-2 pr-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll(e.target.checked)}
                  aria-label="Select all violations"
                />
              </th>
              <th className="text-left py-2 pr-4">Detected</th>
              <th className="text-left py-2 pr-4">Control</th>
              <th className="text-left py-2 pr-4">Type</th>
              <th className="text-left py-2 pr-4">Severity</th>
              <th className="text-left py-2 pr-4">Status</th>
              <th className="text-left py-2 pr-4">Asset</th>
              <th className="text-left py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {violations.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-gray-500">
                  No violations found.
                </td>
              </tr>
            ) : (
              violations.map((v) => (
                <tr key={v.violation_id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(v.violation_id)}
                      onChange={() => onToggle(v.violation_id)}
                      aria-label={`Select violation ${v.violation_id}`}
                    />
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDate(v.detected_at)}</td>
                  <td className="py-2 pr-4">{v.control_name || '-'}</td>
                  <td className="py-2 pr-4">{v.violation_type || '-'}</td>
                  <td className="py-2 pr-4">
                    <SeverityBadge severity={v.severity || ''} />
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={v.enforcement_status || ''} />
                  </td>
                  <td className="py-2 pr-4">{v.asset_name || '-'}</td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <button
                        className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onApprove(v.violation_id)}
                        disabled={actionDisabled}
                      >
                        Approve
                      </button>
                      <button
                        className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onReject(v.violation_id)}
                        disabled={actionDisabled}
                      >
                        Reject
                      </button>
                      <button
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onRetry(v.violation_id)}
                        disabled={actionDisabled}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

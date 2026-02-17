"use client";

import PassCriteriaBuilder from '@/components/control-tests/PassCriteriaBuilder';

export default function Step3PassCriteria(props: {
  configType: 'no_code' | 'script';
  value: any;
  onChange: (next: any) => void;
  severity: string;
  onSeverityChange: (value: string) => void;
}) {
  const { configType, value, onChange, severity, onSeverityChange } = props;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-gray-600">Severity</label>
        <select
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value)}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {configType === 'no_code' ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <div className="font-semibold text-gray-800 mb-2">Auto-generated pass criteria</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(value || {}, null, 2)}</pre>
        </div>
      ) : null}

      <div>
        <div className="text-sm font-semibold text-gray-900">Pass criteria builder</div>
        <PassCriteriaBuilder
          value={value || { conditions: [] }}
          onChange={(next) => onChange(next)}
        />
      </div>
    </div>
  );
}

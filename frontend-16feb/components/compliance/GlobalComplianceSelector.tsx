'use client';

import { useCompliance } from '@/contexts/ComplianceContext';

const FRAMEWORKS = [
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'soc2', label: 'SOC 2' },
];

export function GlobalComplianceSelector() {
  const { framework, setFramework, periodId, setPeriodId, periods, loading } = useCompliance();

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-slate-200">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">Framework:</label>
        <select
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value);
            setPeriodId(null);
          }}
          className="border border-slate-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FRAMEWORKS.map((fw) => (
            <option key={fw.value} value={fw.value}>
              {fw.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-700">Audit Period:</label>
        <select
          value={periodId || ''}
          onChange={(e) => setPeriodId(e.target.value || null)}
          disabled={loading}
          className="border border-slate-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        >
          <option value="">All Time</option>
          {periods
            .filter((p) => p.status === 'active')
            .map((period) => (
              <option key={period.period_id} value={period.period_id}>
                {period.name}
              </option>
            ))}
        </select>
      </div>

      {periodId && (
        <button
          onClick={() => setPeriodId(null)}
          className="text-xs text-blue-600 hover:text-blue-700 underline"
        >
          Clear Period
        </button>
      )}
    </div>
  );
}

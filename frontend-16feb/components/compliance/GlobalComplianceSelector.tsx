'use client';

import { useCompliance } from '@/contexts/ComplianceContext';

const FRAMEWORKS = [
  { value: 'iso27001', label: 'ISO 27001' },
  { value: 'soc2', label: 'SOC 2' },
];

export function GlobalComplianceSelector() {
  const { framework, setFramework, periodId, setPeriodId, periods, loading } = useCompliance();

  return (
    <div className="flex items-center gap-4 px-5 py-2 bg-[rgba(15,23,42,0.6)] border-b border-[var(--card-border)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Framework:</label>
        <select
          value={framework}
          onChange={(e) => {
            setFramework(e.target.value);
            setPeriodId(null);
          }}
          className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--accent-blue)] transition-colors cursor-pointer"
        >
          {FRAMEWORKS.map((fw) => (
            <option key={fw.value} value={fw.value} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
              {fw.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">Audit Period:</label>
        <select
          value={periodId || ''}
          onChange={(e) => setPeriodId(e.target.value || null)}
          disabled={loading}
          className="bg-[var(--card-bg)] border border-[var(--card-border)] text-[var(--text-primary)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--accent-blue)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="" className="bg-[var(--bg-primary)] text-[var(--text-primary)]">All Time</option>
          {periods
            .filter((p) => p.status === 'active')
            .map((period) => (
              <option key={period.period_id} value={period.period_id} className="bg-[var(--bg-primary)] text-[var(--text-primary)]">
                {period.name}
              </option>
            ))}
        </select>
      </div>

      {periodId && (
        <button
          onClick={() => setPeriodId(null)}
          className="text-xs text-[var(--accent-blue)] hover:text-[var(--accent-cyan)] hover:underline transition-colors"
        >
          Clear Period
        </button>
      )}
    </div>
  );
}

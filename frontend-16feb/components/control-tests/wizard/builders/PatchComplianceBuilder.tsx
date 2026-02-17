"use client";

import { useEffect } from 'react';

const OS_TYPES = ['windows', 'macos', 'linux'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

export default function PatchComplianceBuilder(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange({ os_types: ['windows', 'macos', 'linux'], max_age_days: 30, severity_filter: ['critical', 'high'] });
    }
  }, [value, onChange]);

  const config = value || {};
  const osTypes = Array.isArray(config.os_types) ? config.os_types : [];
  const severityFilter = Array.isArray(config.severity_filter) ? config.severity_filter : [];

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-gray-600">OS types</label>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
          {OS_TYPES.map((os) => (
            <label key={os} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={osTypes.includes(os)}
                onChange={() => onChange({ ...config, os_types: toggle(osTypes, os) })}
              />
              {os.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Severity filter</label>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
          {SEVERITIES.map((sev) => (
            <label key={sev} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={severityFilter.includes(sev)}
                onChange={() => onChange({ ...config, severity_filter: toggle(severityFilter, sev) })}
              />
              {sev.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Max age (days)</label>
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={config.max_age_days || 30}
          onChange={(e) => onChange({ ...config, max_age_days: Number(e.target.value) })}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Exclusions</label>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Exclude hosts or tags"
          value={config.exclusions || ''}
          onChange={(e) => onChange({ ...config, exclusions: e.target.value })}
        />
      </div>
    </div>
  );
}

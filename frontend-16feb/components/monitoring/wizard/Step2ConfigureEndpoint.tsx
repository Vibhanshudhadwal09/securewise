"use client";

import { useEffect } from 'react';
import type { MonitoringTemplate } from '@/types/monitoring';

const OS_TYPES = ['windows', 'macos', 'linux'];

export default function Step2ConfigureEndpoint(props: {
  template?: MonitoringTemplate | null;
  value: any;
  onChange: (next: any) => void;
}) {
  const { template, value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange(template?.default_config || { operating_systems: ['windows', 'macos', 'linux'] });
    }
  }, [template, value, onChange]);

  const config = value || {};
  const osTypes = Array.isArray(config.operating_systems) ? config.operating_systems : [];

  const toggle = (id: string) => {
    const next = osTypes.includes(id) ? osTypes.filter((o: string) => o !== id) : [...osTypes, id];
    onChange({ ...config, operating_systems: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-gray-900">Operating systems</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {OS_TYPES.map((os) => (
            <label key={os} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={osTypes.includes(os)} onChange={() => toggle(os)} />
              {os.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Compliance threshold (days)</div>
        <input
          type="number"
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={config.max_age_days || 30}
          onChange={(e) => onChange({ ...config, max_age_days: Number(e.target.value) })}
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Exemptions</div>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Add device IDs to exclude (comma separated)"
          value={config.exemptions || ''}
          onChange={(e) => onChange({ ...config, exemptions: e.target.value })}
        />
      </div>
    </div>
  );
}

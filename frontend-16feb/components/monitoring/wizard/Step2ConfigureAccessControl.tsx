"use client";

import { useEffect } from 'react';
import type { MonitoringTemplate } from '@/types/monitoring';

const SYSTEMS = ['okta', 'azure_ad', 'google', 'github'];

export default function Step2ConfigureAccessControl(props: {
  template?: MonitoringTemplate | null;
  value: any;
  onChange: (next: any) => void;
}) {
  const { template, value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange(template?.default_config || { systems: ['okta'], threshold: 5, time_window_minutes: 15 });
    }
  }, [template, value, onChange]);

  const config = value || {};
  const systems = Array.isArray(config.systems) ? config.systems : [];

  const toggle = (id: string) => {
    const next = systems.includes(id) ? systems.filter((s: string) => s !== id) : [...systems, id];
    onChange({ ...config, systems: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-gray-900">Systems to monitor</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {SYSTEMS.map((sys) => (
            <label key={sys} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={systems.includes(sys)} onChange={() => toggle(sys)} />
              {sys.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Threshold</div>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.threshold || 5}
            onChange={(e) => onChange({ ...config, threshold: Number(e.target.value) })}
          />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Time window (minutes)</div>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.time_window_minutes || 15}
            onChange={(e) => onChange({ ...config, time_window_minutes: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Privileged groups</div>
        <input
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="Admins, Global Admins"
          value={config.privileged_groups || ''}
          onChange={(e) => onChange({ ...config, privileged_groups: e.target.value })}
        />
      </div>
    </div>
  );
}

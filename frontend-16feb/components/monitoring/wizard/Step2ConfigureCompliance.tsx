"use client";

import { useEffect } from 'react';
import type { MonitoringTemplate } from '@/types/monitoring';

const FRAMEWORKS = ['soc2', 'iso27001', 'hipaa', 'cis'];

export default function Step2ConfigureCompliance(props: {
  template?: MonitoringTemplate | null;
  value: any;
  onChange: (next: any) => void;
}) {
  const { template, value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange(template?.default_config || { frameworks: ['soc2'], alert_on: [] });
    }
  }, [template, value, onChange]);

  const config = value || {};
  const frameworks = Array.isArray(config.frameworks) ? config.frameworks : [];

  const toggle = (id: string) => {
    const next = frameworks.includes(id) ? frameworks.filter((f: string) => f !== id) : [...frameworks, id];
    onChange({ ...config, frameworks: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-gray-900">Frameworks</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {FRAMEWORKS.map((f) => (
            <label key={f} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={frameworks.includes(f)} onChange={() => toggle(f)} />
              {f.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Controls to watch</div>
        <input
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="CC6.1, A.9.2.3"
          value={config.controls || ''}
          onChange={(e) => onChange({ ...config, controls: e.target.value })}
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Alert conditions</div>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          rows={3}
          placeholder="Describe when alerts should fire"
          value={config.conditions_text || ''}
          onChange={(e) => onChange({ ...config, conditions_text: e.target.value })}
        />
      </div>
    </div>
  );
}

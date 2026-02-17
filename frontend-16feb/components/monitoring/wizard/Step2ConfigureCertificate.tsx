"use client";

import { useEffect } from 'react';
import HostInput from '@/components/monitoring/HostInput';
import type { MonitoringTemplate } from '@/types/monitoring';

const CHECKS = [
  { id: 'chain', label: 'Validate certificate chain' },
  { id: 'revocation', label: 'Check revocation status' },
  { id: 'cipher', label: 'Detect weak ciphers' },
];

export default function Step2ConfigureCertificate(props: {
  template?: MonitoringTemplate | null;
  value: any;
  onChange: (next: any) => void;
}) {
  const { template, value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange(template?.default_config || { hosts: [], warning_days: 30, checks: ['chain'] });
    }
  }, [template, value, onChange]);

  const config = value || {};
  const checks = Array.isArray(config.checks) ? config.checks : [];

  const toggleCheck = (id: string) => {
    const next = checks.includes(id) ? checks.filter((c: string) => c !== id) : [...checks, id];
    onChange({ ...config, checks: next });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-gray-900">Hosts to monitor</div>
        <div className="text-xs text-gray-500">Add domains with optional ports.</div>
      </div>
      <HostInput value={config.hosts || []} onChange={(hosts) => onChange({ ...config, hosts })} />

      <div>
        <div className="text-sm font-semibold text-gray-900">Warning threshold</div>
        <div className="text-xs text-gray-500">Alert when certificates are close to expiry.</div>
        <input
          type="range"
          min={7}
          max={120}
          value={config.warning_days || 30}
          onChange={(e) => onChange({ ...config, warning_days: Number(e.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-gray-500">{config.warning_days || 30} days</div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Additional checks</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CHECKS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={checks.includes(c.id)} onChange={() => toggleCheck(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

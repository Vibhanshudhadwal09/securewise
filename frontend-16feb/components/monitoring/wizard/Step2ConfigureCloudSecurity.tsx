"use client";

import { useEffect } from 'react';
import type { MonitoringTemplate } from '@/types/monitoring';

export default function Step2ConfigureCloudSecurity(props: {
  template?: MonitoringTemplate | null;
  value: any;
  onChange: (next: any) => void;
}) {
  const { template, value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange(template?.default_config || { provider: 'aws', regions: ['us-east-1'] });
    }
  }, [template, value, onChange]);

  const config = value || {};
  const regions = Array.isArray(config.regions) ? config.regions : [];

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-gray-900">Cloud provider</div>
        <select
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={config.provider || 'aws'}
          onChange={(e) => onChange({ ...config, provider: e.target.value })}
        >
          <option value="aws">AWS</option>
          <option value="azure">Azure</option>
          <option value="gcp">GCP</option>
        </select>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Regions</div>
        <input
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="us-east-1, eu-west-1"
          value={regions.join(', ')}
          onChange={(e) => onChange({ ...config, regions: e.target.value.split(',').map((r) => r.trim()).filter(Boolean) })}
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Resource filters</div>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          rows={3}
          placeholder="Add filters or tags to narrow scope"
          value={config.filters || ''}
          onChange={(e) => onChange({ ...config, filters: e.target.value })}
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Exclusions</div>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Exclude resources (comma separated)"
          value={config.exclusions || ''}
          onChange={(e) => onChange({ ...config, exclusions: e.target.value })}
        />
      </div>
    </div>
  );
}

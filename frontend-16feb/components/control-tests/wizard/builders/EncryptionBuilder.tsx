"use client";

import { useEffect } from 'react';

const RESOURCES = ['s3', 'ebs', 'rds', 'gcs', 'blob'];

export default function EncryptionBuilder(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange({ cloud_provider: 'aws', resource_types: ['s3', 'rds'], regions: ['us-east-1'], require_cmk: false });
    }
  }, [value, onChange]);

  const config = value || {};
  const resources = Array.isArray(config.resource_types) ? config.resource_types : [];
  const regions = Array.isArray(config.regions) ? config.regions : [];

  const toggleResource = (id: string) => {
    const next = resources.includes(id) ? resources.filter((r: string) => r !== id) : [...resources, id];
    onChange({ ...config, resource_types: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-gray-600">Cloud provider</label>
        <select
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={config.cloud_provider || 'aws'}
          onChange={(e) => onChange({ ...config, cloud_provider: e.target.value })}
        >
          <option value="aws">AWS</option>
          <option value="azure">Azure</option>
          <option value="gcp">GCP</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Resource types</label>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
          {RESOURCES.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <input type="checkbox" checked={resources.includes(r)} onChange={() => toggleResource(r)} />
              {r.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Regions</label>
        <input
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="us-east-1, eu-west-1"
          value={regions.join(', ')}
          onChange={(e) =>
            onChange({
              ...config,
              regions: e.target.value.split(',').map((r) => r.trim()).filter(Boolean),
            })
          }
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={Boolean(config.require_cmk)}
          onChange={(e) => onChange({ ...config, require_cmk: e.target.checked })}
        />
        Require customer-managed keys
      </label>
    </div>
  );
}

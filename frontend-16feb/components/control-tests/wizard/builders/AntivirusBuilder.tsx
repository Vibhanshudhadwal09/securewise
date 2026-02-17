"use client";

import { useEffect } from 'react';

const OS_TYPES = ['windows', 'macos', 'linux'];

export default function AntivirusBuilder(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange({ av_system: 'crowdstrike', max_definition_age_days: 7, max_offline_hours: 24, os_types: ['windows', 'macos'] });
    }
  }, [value, onChange]);

  const config = value || {};
  const osTypes = Array.isArray(config.os_types) ? config.os_types : [];

  const toggleOs = (id: string) => {
    const next = osTypes.includes(id) ? osTypes.filter((o: string) => o !== id) : [...osTypes, id];
    onChange({ ...config, os_types: next });
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-gray-600">AV system</label>
        <select
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={config.av_system || 'crowdstrike'}
          onChange={(e) => onChange({ ...config, av_system: e.target.value })}
        >
          <option value="crowdstrike">CrowdStrike</option>
          <option value="defender">Microsoft Defender</option>
          <option value="sentinelone">SentinelOne</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Definition age threshold (days)</label>
        <input
          type="range"
          min={1}
          max={30}
          value={config.max_definition_age_days || 7}
          onChange={(e) => onChange({ ...config, max_definition_age_days: Number(e.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-gray-500">{config.max_definition_age_days || 7} days</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Offline threshold (hours)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.max_offline_hours || 24}
            onChange={(e) => onChange({ ...config, max_offline_hours: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">OS types</label>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
            {OS_TYPES.map((os) => (
              <label key={os} className="flex items-center gap-2">
                <input type="checkbox" checked={osTypes.includes(os)} onChange={() => toggleOs(os)} />
                {os.toUpperCase()}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

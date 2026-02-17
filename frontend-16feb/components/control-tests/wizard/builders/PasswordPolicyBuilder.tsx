"use client";

import { useEffect } from 'react';

export default function PasswordPolicyBuilder(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange({
        system: 'okta',
        min_length: 14,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_symbols: true,
        max_age_days: 90,
        history_count: 24,
        lockout_attempts: 5,
        lockout_duration_minutes: 30,
      });
    }
  }, [value, onChange]);

  const config = value || {};

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-medium text-gray-600">System</label>
        <select
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={config.system || 'okta'}
          onChange={(e) => onChange({ ...config, system: e.target.value })}
        >
          <option value="okta">Okta</option>
          <option value="azure_ad">Azure AD</option>
          <option value="google_workspace">Google Workspace</option>
          <option value="aws_iam">AWS IAM</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Minimum length</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.min_length || 12}
            onChange={(e) => onChange({ ...config, min_length: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Max age (days)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.max_age_days || 90}
            onChange={(e) => onChange({ ...config, max_age_days: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
        {[
          { id: 'require_uppercase', label: 'Uppercase required' },
          { id: 'require_lowercase', label: 'Lowercase required' },
          { id: 'require_numbers', label: 'Numbers required' },
          { id: 'require_symbols', label: 'Symbols required' },
        ].map((item) => (
          <label key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(config[item.id])}
              onChange={(e) => onChange({ ...config, [item.id]: e.target.checked })}
            />
            {item.label}
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">History count</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.history_count || 24}
            onChange={(e) => onChange({ ...config, history_count: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Lockout attempts</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.lockout_attempts || 5}
            onChange={(e) => onChange({ ...config, lockout_attempts: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}

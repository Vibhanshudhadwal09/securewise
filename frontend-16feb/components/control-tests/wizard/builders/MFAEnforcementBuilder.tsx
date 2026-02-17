"use client";

import { useEffect } from 'react';

const METHODS = ['totp', 'push', 'hardware_token', 'sms'];

export default function MFAEnforcementBuilder(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;

  useEffect(() => {
    if (!value || Object.keys(value).length === 0) {
      onChange({ system: 'okta', scope: 'admin_users', mfa_methods: ['totp', 'push'] });
    }
  }, [value, onChange]);

  const config = value || {};
  const methods = Array.isArray(config.mfa_methods) ? config.mfa_methods : [];

  const toggleMethod = (method: string) => {
    const next = methods.includes(method) ? methods.filter((m: string) => m !== method) : [...methods, method];
    onChange({ ...config, mfa_methods: next });
  };

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

      <div>
        <label className="text-xs font-medium text-gray-600">Scope</label>
        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-700">
          {['all_users', 'admin_users', 'privileged_users'].map((scope) => (
            <label key={scope} className="flex items-center gap-2">
              <input type="radio" checked={config.scope === scope} onChange={() => onChange({ ...config, scope })} />
              {scope.replace('_', ' ')}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">MFA methods</label>
        <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
          {METHODS.map((method) => (
            <label key={method} className="flex items-center gap-2">
              <input type="checkbox" checked={methods.includes(method)} onChange={() => toggleMethod(method)} />
              {method.replace('_', ' ')}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

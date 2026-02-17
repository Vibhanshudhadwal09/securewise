"use client";

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { CircuitBreakerStatus } from '@/components/enforcement/CircuitBreakerStatus';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

export function EnforcementSettingsPanel() {
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [config, setConfig] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTenantId(readCookie('sw_tenant') || 'demo-tenant');
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      try {
        setError(null);
        const [cfgRes, statusRes] = await Promise.all([
          fetch('/api/enforcement/throttle/config', { headers: { 'x-tenant-id': tenantId }, credentials: 'include' }),
          fetch('/api/enforcement/throttle/status', { headers: { 'x-tenant-id': tenantId }, credentials: 'include' }),
        ]);
        const cfg = await cfgRes.json().catch(() => null);
        const st = await statusRes.json().catch(() => null);
        if (!cfgRes.ok) throw new Error(cfg?.error || `Failed to load config (${cfgRes.status})`);
        if (!statusRes.ok) throw new Error(st?.error || `Failed to load status (${statusRes.status})`);
        setConfig(cfg?.config || null);
        setStatus(st?.status || null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load throttle settings');
      }
    };
    load();
  }, [tenantId]);

  const updateField = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...(prev || {}), [key]: value }));
  };

  const save = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch('/api/enforcement/throttle/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        credentials: 'include',
        body: JSON.stringify(config || {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to update (${res.status})`);
      setConfig(data?.config || config);
      setMessage('Throttle configuration updated.');
    } catch (err: any) {
      setError(err?.message || 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  const resetBreaker = async () => {
    try {
      const res = await fetch('/api/enforcement/throttle/circuit-breaker/reset', {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to reset (${res.status})`);
      setMessage('Circuit breaker reset.');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset circuit breaker');
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          <p className="text-sm font-medium">Unable to load settings.</p>
          <p className="text-xs mt-1">{error}</p>
        </Card>
      ) : null}

      {message ? (
        <Card className="p-4 border border-green-200 bg-green-50 text-green-700">
          <p className="text-sm font-medium">{message}</p>
        </Card>
      ) : null}

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">Circuit Breaker Status</h3>
          <CircuitBreakerStatus status={status?.circuit_breaker_status} />
        </div>
        {status?.circuit_breaker_status === 'open' ? (
          <div className="text-sm text-red-600">
            Circuit breaker is open. Enforcement is blocked until cooldown ends.
            <button className="ml-3 text-xs font-medium text-blue-600 hover:text-blue-800" onClick={resetBreaker}>
              Reset Circuit Breaker
            </button>
          </div>
        ) : (
          <button className="text-xs font-medium text-blue-600 hover:text-blue-800" onClick={resetBreaker}>
            Reset Circuit Breaker
          </button>
        )}
      </Card>

      <Card className="p-4 space-y-6">
        <h3 className="text-sm font-semibold text-gray-800">Rate Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-xs text-gray-600">
            Max per Minute
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.max_enforcements_per_minute ?? ''}
              onChange={(e) => updateField('max_enforcements_per_minute', Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Max per Hour
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.max_enforcements_per_hour ?? ''}
              onChange={(e) => updateField('max_enforcements_per_hour', Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Max per Day
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.max_enforcements_per_day ?? ''}
              onChange={(e) => updateField('max_enforcements_per_day', Number(e.target.value))}
            />
          </label>
        </div>

        <h3 className="text-sm font-semibold text-gray-800">Action-Specific Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-xs text-gray-600">
            Isolate Asset (per hour)
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.max_isolate_asset_per_hour ?? ''}
              onChange={(e) => updateField('max_isolate_asset_per_hour', Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Disable User (per hour)
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.max_disable_user_per_hour ?? ''}
              onChange={(e) => updateField('max_disable_user_per_hour', Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Block IP (per hour)
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.max_block_ip_per_hour ?? ''}
              onChange={(e) => updateField('max_block_ip_per_hour', Number(e.target.value))}
            />
          </label>
        </div>

        <h3 className="text-sm font-semibold text-gray-800">Circuit Breaker</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-xs text-gray-600">
            Enabled
            <select
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              value={String(config?.circuit_breaker_enabled ?? true)}
              onChange={(e) => updateField('circuit_breaker_enabled', e.target.value === 'true')}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Failure Threshold
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.circuit_breaker_threshold ?? ''}
              onChange={(e) => updateField('circuit_breaker_threshold', Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Cooldown (minutes)
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.circuit_breaker_cooldown_minutes ?? ''}
              onChange={(e) => updateField('circuit_breaker_cooldown_minutes', Number(e.target.value))}
            />
          </label>
        </div>

        <h3 className="text-sm font-semibold text-gray-800">Burst Protection</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-xs text-gray-600">
            Burst Window (seconds)
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.burst_window_seconds ?? ''}
              onChange={(e) => updateField('burst_window_seconds', Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-gray-600">
            Max Burst Size
            <input
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
              type="number"
              value={config?.max_burst_size ?? ''}
              onChange={(e) => updateField('max_burst_size', Number(e.target.value))}
            />
          </label>
        </div>

        <div className="flex justify-end">
          <button
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </Card>
    </div>
  );
}

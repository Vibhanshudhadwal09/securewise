'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type WazuhConfig = {
  api_url: string;
  username: string;
  password: string;
  insecure_tls?: boolean;
};

type TestResult = { success: boolean; version?: string; error?: string };

function readCookie(name: string): string | null {
  const cur = String(document.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function fetchJson(url: string, tenantId: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
      ...(init?.headers || {}),
    },
    cache: 'no-store',
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
  return json as any;
}

export default function WazuhIntegrationPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [config, setConfig] = useState<WazuhConfig>({
    api_url: '',
    username: '',
    password: '',
    insecure_tls: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    void fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchConfig() {
    try {
      const data = await fetchJson('/api/integrations/wazuh/config', tenantId);
      const next = data?.config || {};
      setConfig({
        api_url: next.api_url || '',
        username: next.username || '',
        password: next.password || '',
        insecure_tls: Boolean(next.insecure_tls),
      });
      setConnected(Boolean(data?.connected || next?.api_url));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch config:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function testConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const data = await fetchJson('/api/integrations/wazuh/test', tenantId, { method: 'POST' });
      setTestResult({ success: Boolean(data?.success), version: data?.version, error: data?.error });
    } catch (e: any) {
      setTestResult({ success: false, error: e?.message || 'Connection failed' });
    } finally {
      setIsTesting(false);
    }
  }

  async function saveConfig() {
    try {
      await fetchJson('/api/integrations/wazuh/config', tenantId, {
        method: 'POST',
        body: JSON.stringify(config),
      });
      setConnected(Boolean(config.api_url));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to save config:', e);
    }
  }

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Wazuh Manager Integration</h1>
          <p className="text-gray-600 mt-2">Connect to your Wazuh Manager for automated security monitoring</p>
        </div>
        {connected ? <Badge variant="success">Connected</Badge> : <Badge variant="warning">Not Connected</Badge>}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Connection Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">API URL</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="https://wazuh-manager:55000"
              value={config.api_url}
              onChange={(e) => setConfig({ ...config, api_url: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Username</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              placeholder="wazuh-api"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              placeholder="••••••••"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="insecure_tls"
              checked={Boolean(config.insecure_tls)}
              onChange={(e) => setConfig({ ...config, insecure_tls: e.target.checked })}
            />
            <label htmlFor="insecure_tls" className="text-sm">
              Skip TLS verification (not recommended for production)
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={testConnection} disabled={isTesting}>
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button onClick={saveConfig} variant="primary">
            Save Configuration
          </Button>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-4 rounded ${
              testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {testResult.success ? (
              <div>
                <p className="font-semibold">Connection successful</p>
                {testResult.version ? <p className="text-sm mt-1">Wazuh Manager v{testResult.version}</p> : null}
              </div>
            ) : (
              <p className="font-semibold">{testResult.error || 'Connection failed'}</p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Data Collection</h2>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
            <input type="checkbox" defaultChecked />
            <div>
              <div className="font-medium">File Integrity Monitoring (FIM)</div>
              <div className="text-sm text-gray-600">Collect syscheck events for compliance</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
            <input type="checkbox" defaultChecked />
            <div>
              <div className="font-medium">Security Configuration Assessment (SCA)</div>
              <div className="text-sm text-gray-600">CIS benchmark compliance checks</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
            <input type="checkbox" defaultChecked />
            <div>
              <div className="font-medium">Vulnerability Detection</div>
              <div className="text-sm text-gray-600">CVE and patch management</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
            <input type="checkbox" defaultChecked />
            <div>
              <div className="font-medium">Security Alerts</div>
              <div className="text-sm text-gray-600">Incidents and threat detection</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50">
            <input type="checkbox" defaultChecked />
            <div>
              <div className="font-medium">Rootcheck</div>
              <div className="text-sm text-gray-600">Rootkit and malware detection</div>
            </div>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Connected Agents</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">5</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">2</div>
            <div className="text-sm text-gray-600">Disconnected</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">1</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">8</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

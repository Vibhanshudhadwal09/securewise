'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Asset } from '@/types/asset';
import AssetInfoCard from './AssetInfoCard';

type TabId = 'compliance' | 'security' | 'threat-intel';

const TABS: Array<{ id: TabId; label: string; icon?: string }> = [
  { id: 'compliance', label: 'Compliance' },
  { id: 'security', label: 'Security' },
  { id: 'threat-intel', label: 'Threat Intel' },
];

async function fetchJson(url: string, opts: { tenantId?: string; signal?: AbortSignal } = {}) {
  const headers = opts.tenantId ? { 'x-tenant-id': opts.tenantId } : undefined;
  const res = await fetch(url, { credentials: 'include', cache: 'no-store', headers, signal: opts.signal });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
  return j;
}

function normalizeAgentToAsset(agent: any): Asset {
  const lastSeenRaw = agent?.lastKeepAlive || agent?.last_keep_alive || agent?.last_keepalive || agent?.dateLastKeepAlive || null;
  return {
    agent_id: String(agent?.id || agent?.agent_id || ''),
    hostname: String(agent?.name || agent?.hostname || agent?.os?.hostname || 'Unknown'),
    os: String(agent?.os?.name || agent?.os?.platform || 'Unknown'),
    ip: String(agent?.ip || agent?.registerIP || agent?.register_ip || 'Unknown'),
    status: (String(agent?.status || '').toLowerCase() === 'active'
      ? 'active'
      : String(agent?.status || '').toLowerCase() === 'disconnected'
        ? 'disconnected'
        : 'inactive') as Asset['status'],
    version: String(agent?.version || 'Unknown'),
    risks: null,
    last_seen: lastSeenRaw ? new Date(String(lastSeenRaw)) : undefined,
  };
}

function idsEquivalent(a: unknown, b: unknown): boolean {
  const sa = String(a ?? '').trim();
  const sb = String(b ?? '').trim();
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  // Treat numeric IDs as equal even if one is zero-padded (e.g., "001" vs "1").
  if (/^\d+$/.test(sa) && /^\d+$/.test(sb)) return Number(sa) === Number(sb);
  return false;
}

export default function AssetCockpit(props: {
  assetId: string;
  tenantId?: string;
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
  onAssetLoaded?: (asset: Asset) => void;
  children: React.ReactNode;
}) {
  const { assetId, tenantId, currentTab, onTabChange, children, onAssetLoaded } = props;
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Treat callback as an event handler, not a data-fetch dependency.
  const onAssetLoadedRef = useRef<typeof onAssetLoaded>(onAssetLoaded);
  useEffect(() => {
    onAssetLoadedRef.current = onAssetLoaded;
  }, [onAssetLoaded]);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const headers = tenantId ? { 'x-tenant-id': tenantId } : undefined;

        // Prefer single-agent endpoint, but tolerate older backends that only expose `/agents`.
        let payload: any = null;
        {
          const url = `/api/wazuh/agents/${encodeURIComponent(assetId)}`;
          const res = await fetch(url, { credentials: 'include', cache: 'no-store', headers, signal: ac.signal });
          const j = await res.json().catch(() => null);
          if (res.ok) {
            payload = j;
          } else if (res.status !== 404) {
            throw new Error(String(j?.error || `HTTP ${res.status}`));
          }
        }

        if (!payload) {
          const list: any = await fetchJson('/api/wazuh/agents', { tenantId, signal: ac.signal });
          const items: any[] = Array.isArray(list?.items) ? list.items : Array.isArray(list) ? list : [];
          const found = items.find((a) => idsEquivalent(a?.id ?? a?.agent_id ?? '', assetId));
          if (!found) throw new Error('Asset not found');
          payload = found;
        }

        const next = normalizeAgentToAsset(payload?.item || payload?.agent || payload);
        if (!next.agent_id) throw new Error('Asset not found');
        if (!cancelled) {
          setAsset(next);
          onAssetLoadedRef.current?.(next);
        }
      } catch (e) {
        // Ignore aborts during navigation/rerender.
        const msg = e instanceof Error ? e.message : 'Failed to load asset';
        if (!cancelled && msg !== 'AbortError') setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [assetId, tenantId]);

  const tabs = useMemo(() => TABS, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4 mx-auto" />
          <p className="text-gray-600">Loading asset information...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 max-w-2xl mx-auto mt-8">
        <h2 className="text-red-800 text-xl font-bold mb-2">Asset Not Found</h2>
        <p className="text-red-600">{error || 'The requested asset could not be found.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <AssetInfoCard asset={asset} tenantId={tenantId} />

      <div className="mb-6">
        <div className="border-b-2 border-gray-200">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-6 py-3 text-sm font-medium transition-all relative ${
                  currentTab === tab.id ? 'text-blue-600 font-bold' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon ? <span className="mr-2">{tab.icon}</span> : null}
                {tab.label}
                {currentTab === tab.id ? <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" /> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">{children}</div>
    </div>
  );
}


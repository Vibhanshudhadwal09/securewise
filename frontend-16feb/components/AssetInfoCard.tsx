'use client';

import { message } from 'antd';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { Asset } from '@/types/asset';

export default function AssetInfoCard(props: { asset: Asset; tenantId?: string }) {
  const router = useRouter();
  const asset = props.asset;
  const tenantId = props.tenantId;
  const [showActions, setShowActions] = useState(false);
  const displayVersion = useMemo(() => {
    // Avoid surfacing vendor names in UI.
    const raw = String(asset.version || '').trim();
    return raw.replace(/wazuh/gi, '').replace(/\s+/g, ' ').trim() || '-';
  }, [asset.version]);

  const statusBadge = useMemo(() => {
    const s = asset.status;
    const styles: Record<Asset['status'], string> = {
      active: 'bg-green-100 text-green-800 border-green-300',
      inactive: 'bg-red-100 text-red-800 border-red-300',
      disconnected: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return styles[s] || styles.disconnected;
  }, [asset.status]);

  const lastSeenText = useMemo(() => {
    const d = asset.last_seen;
    if (!d) return 'Unknown';
    const t = d instanceof Date ? d.getTime() : new Date(String(d)).getTime();
    if (!Number.isFinite(t)) return 'Unknown';
    const seconds = Math.floor((Date.now() - t) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }, [asset.last_seen]);

  const tenantHeader = useMemo(() => {
    return tenantId ? { 'x-tenant-id': tenantId } : undefined;
  }, [tenantId]);

  const viewLogsHref = useMemo(() => {
    const q = new URLSearchParams();
    if (tenantId) q.set('tenantId', tenantId);
    const qs = q.toString();
    return `/endpoints/${encodeURIComponent(asset.agent_id)}/threat-hunting${qs ? `?${qs}` : ''}`;
  }, [asset.agent_id, tenantId]);

  const closeMenu = () => setShowActions(false);

  async function call(method: 'POST' | 'DELETE', path: string) {
    const res = await fetch(path, { method, credentials: 'include', headers: tenantHeader });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = String(j?.error || j?.message || `HTTP ${res.status}`);
      throw new Error(msg);
    }
    return j;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-white border-2 border-blue-200 rounded-lg p-6 shadow-md mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900 truncate">{asset.hostname}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${statusBadge}`}>{asset.status.toUpperCase()}</span>
            {asset.risks ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border-2 border-amber-300">
                {asset.risks}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 mb-1">Operating System</div>
              <div className="font-medium text-gray-900 truncate">{asset.os}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">IP Address</div>
              <div className="font-medium text-gray-900 font-mono truncate">{asset.ip}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Agent Version</div>
              <div className="font-medium text-gray-900 font-mono truncate">{displayVersion}</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Last Seen</div>
              <div className="font-medium text-gray-900 truncate">{lastSeenText}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowActions((v) => !v)}
              className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 transition-colors text-sm font-medium"
            >
              Actions ▼
            </button>
            {showActions ? (
              <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  onClick={() => {
                    closeMenu();
                    router.push(viewLogsHref);
                  }}
                >
                  View Logs
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  onClick={async () => {
                    closeMenu();
                    try {
                      await call('POST', `/api/wazuh/agents/${encodeURIComponent(asset.agent_id)}/restart`);
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : 'Restart failed');
                    }
                  }}
                >
                  Restart agent
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  onClick={async () => {
                    closeMenu();
                    try {
                      await call('POST', `/api/wazuh/agents/${encodeURIComponent(asset.agent_id)}/scan`);
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : 'Scan failed');
                    }
                  }}
                >
                  Run scan
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-red-600"
                  onClick={async () => {
                    closeMenu();
                    if (!window.confirm('Remove this agent?')) return;
                    try {
                      await call('DELETE', `/api/wazuh/agents/${encodeURIComponent(asset.agent_id)}`);
                      const q = new URLSearchParams();
                      if (tenantId) q.set('tenantId', tenantId);
                      const qs = q.toString();
                      router.push(`/assets${qs ? `?${qs}` : ''}`);
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : 'Remove failed');
                    }
                  }}
                >
                  Remove agent
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}


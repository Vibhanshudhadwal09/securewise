'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FIMChange {
  change_ref: string;
  file_path: string;
  change_type: 'added' | 'modified' | 'deleted';
  file_hash: string | null;
  agent_ref: string;
  agent_name: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  detected_at: string;
  source: {
    tool: string;
    source_ref?: string;
    raw_ref?: string;
  };
}

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

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
  return json as any;
}

const changeTypeColors: Record<string, string> = {
  added: 'bg-green-100 text-green-700 border border-green-200',
  modified: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  deleted: 'bg-red-100 text-red-700 border border-red-200',
};

const formatTimestamp = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleString();
};

export default function FIMPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [changes, setChanges] = useState<FIMChange[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowFilter, setWindowFilter] = useState('24h');
  const [assetFilter, setAssetFilter] = useState<string>('');

  useEffect(() => {
    void fetchFIMEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowFilter, assetFilter]);

  async function fetchFIMEvents() {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('window', windowFilter);
      if (assetFilter) params.set('assetId', assetFilter);
      const data = await fetchJson(`/api/connectors/wazuh/fim/changes?${params.toString()}`, tenantId);
      setChanges(Array.isArray(data?.changes) ? data.changes : []);
      setTotal(Number(data?.total || 0));
    } catch (e: any) {
      setError(e?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  const counts = useMemo(() => {
    const out = { total, modified: 0, added: 0, deleted: 0 };
    for (const c of changes) {
      const t = c.change_type;
      if (t === 'deleted') out.deleted += 1;
      else if (t === 'added') out.added += 1;
      else out.modified += 1;
    }
    return out;
  }, [changes, total]);

  if (loading) return <div className="p-8">Loading FIM events...</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">File Integrity Monitoring</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <p className="text-gray-600">Monitor file system changes across your infrastructure</p>
          <select
            value={windowFilter}
            onChange={(e) => {
              setWindowFilter(e.target.value);
            }}
            className="border border-slate-200 rounded px-3 py-1 text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{counts.total}</div>
          <div className="text-sm text-gray-600">Total Changes</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">{counts.modified}</div>
          <div className="text-sm text-gray-600">Modified</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">{counts.added}</div>
          <div className="text-sm text-gray-600">Added</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{counts.deleted}</div>
          <div className="text-sm text-gray-600">Deleted</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Changes</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="p-3">Agent</th>
                <th className="p-3">File Path</th>
                <th className="p-3">Type</th>
                <th className="p-3">Changed</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => {
                const type = change.change_type;
                return (
                  <tr key={change.change_ref} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <Badge variant="info">{change.agent_name || change.agent_ref || 'Unknown'}</Badge>
                    </td>
                    <td className="p-3">
                      <code className="text-sm">{change.file_path || '-'}</code>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${changeTypeColors[type] || changeTypeColors.modified}`}>
                        {type}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-gray-600">content</span>
                        {change.source?.source_ref && (
                          <a
                            href={change.source.source_ref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open in Wazuh
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {change.detected_at ? formatTimestamp(change.detected_at) : '-'}
                    </td>
                  </tr>
                );
              })}
              {changes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-sm text-gray-500">
                    No file changes detected in the selected time window.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


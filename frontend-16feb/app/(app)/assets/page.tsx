'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type AssetRow = {
  id: string;
  asset_id: string;
  name?: string;
  description?: string;
  kind?: string;
  env?: string;
  criticality?: string;
  status?: string;
  owner_email?: string;
  ip_address?: string;
  hostname?: string;
  last_seen?: string;
  risk_count?: number | string;
  pending_recommendations?: number | string;
  mapped_controls?: number | string;
  implemented_controls?: number | string;
  verified_controls?: number | string;
  sources?: string[];
};

export default function AssetsPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';

  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ kind: '', criticality: '', status: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 });

  useEffect(() => {
    fetchAssets();
  }, [filter, pagination.page, search, tenantId]);

  async function fetchAssets() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search: search
      });
      if (filter.kind) params.append('kind', filter.kind);
      if (filter.criticality) params.append('criticality', filter.criticality);
      if (filter.status) params.append('status', filter.status);

      const res = await fetch(`/api/assets?${params.toString()}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId }
      });
      const data = await res.json();
      setAssets(data.assets || []);
      setPagination((prev) => ({ ...prev, total: data.total || 0 }));
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const active = assets.filter((a) => a.status === 'active').length;
    const inactive = assets.filter((a) => a.status === 'inactive').length;
    const disconnected = assets.filter((a) => a.status === 'disconnected').length;
    const atRisk = assets.filter((a) => Number(a.risk_count || 0) > 0).length;
    return { total: pagination.total, active, inactive, disconnected, atRisk };
  }, [assets, pagination.total]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-gray-600 mt-2">Track enterprise assets and control coverage across sources</p>
        </div>
        <Button onClick={() => router.push(`/assets/add?tenantId=${encodeURIComponent(tenantId)}`)}>Add Asset</Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Assets</div>
        </Card>
        <Card className="p-4 border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-600">Active</div>
        </Card>
        <Card className="p-4 border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
          <div className="text-sm text-gray-600">Inactive</div>
        </Card>
        <Card className="p-4 border-red-200">
          <div className="text-2xl font-bold text-red-600">{stats.disconnected}</div>
          <div className="text-sm text-gray-600">Disconnected</div>
        </Card>
        <Card className="p-4 border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{stats.atRisk}</div>
          <div className="text-sm text-gray-600">At Risk</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Search assets by name, ID, IP, owner..."
            className="flex-1 border rounded px-3 py-2"
          />
          <select
            value={filter.kind}
            onChange={(e) => {
              setFilter({ ...filter, kind: e.target.value });
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="endpoint">Endpoints</option>
            <option value="server">Servers</option>
            <option value="database">Databases</option>
            <option value="network_device">Network Devices</option>
          </select>
          <select
            value={filter.criticality}
            onChange={(e) => {
              setFilter({ ...filter, criticality: e.target.value });
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">All Criticality</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => {
              setFilter({ ...filter, status: e.target.value });
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="border rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="disconnected">Disconnected</option>
          </select>
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <p>Loading assets...</p>
        ) : assets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-600 text-lg">No assets found</p>
            <Button onClick={() => router.push(`/assets/add?tenantId=${encodeURIComponent(tenantId)}`)} className="mt-4">
              Add Your First Asset
            </Button>
          </Card>
        ) : (
          assets.map((asset) => (
            <Card key={asset.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-sm uppercase tracking-wide text-gray-500">{asset.kind || 'asset'}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{asset.name || asset.asset_id}</span>
                      <Badge
                        variant={
                          asset.criticality === 'critical'
                            ? 'danger'
                            : asset.criticality === 'high'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {asset.criticality || 'medium'}
                      </Badge>
                      <Badge variant="neutral">{asset.kind || 'asset'}</Badge>
                      {Number(asset.risk_count || 0) > 0 && (
                        <Badge variant="danger">{asset.risk_count} risks</Badge>
                      )}
                      {asset.sources?.map((src: string) => (
                        <Badge key={src} variant="info" className="text-xs">
                          {src}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {asset.description || asset.asset_id} | {asset.env || 'prod'}
                      {asset.ip_address ? ` | ${asset.ip_address}` : ''}
                      {asset.last_seen ? ` | Last seen: ${new Date(asset.last_seen).toLocaleString()}` : ''}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Coverage: mapped {asset.mapped_controls || 0}, implemented {asset.implemented_controls || 0},
                      verified {asset.verified_controls || 0}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {Number(asset.pending_recommendations || 0) > 0 && (
                    <Badge variant="warning">{asset.pending_recommendations} pending controls</Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => router.push(`/assets/${asset.id}?tenantId=${encodeURIComponent(tenantId)}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {pagination.total > pagination.limit && (
        <div className="flex justify-center gap-2">
          <Button
            disabled={pagination.page === 1}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <Button
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

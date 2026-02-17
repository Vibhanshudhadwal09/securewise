'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

function criticalityVariant(value: string) {
  if (value === 'critical') return 'danger';
  if (value === 'high') return 'warning';
  if (value === 'medium') return 'info';
  return 'neutral';
}

function exposureVariant(value: string) {
  if (value === 'full') return 'danger';
  if (value === 'partial') return 'warning';
  return 'neutral';
}

export default function AssetsAtRiskPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAssets() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson('/api/risk-treatments/assets-at-risk', tenantId);
      setAssets(Array.isArray(data?.assets) ? data.assets : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load assets at risk');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-8">Loading assets at risk...</div>;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Assets at Risk</h1>
        <p className="text-gray-600 mt-2">Assets exposed to identified risks</p>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{assets.length}</div>
          <div className="text-sm text-gray-600">Total Assets at Risk</div>
        </Card>
        <Card className="p-4 border-red-200">
          <div className="text-2xl font-bold text-red-600">{assets.filter((a) => a.criticality === 'critical').length}</div>
          <div className="text-sm text-gray-600">Critical Assets</div>
        </Card>
        <Card className="p-4 border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{assets.filter((a) => a.criticality === 'high').length}</div>
          <div className="text-sm text-gray-600">High Priority</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{assets.reduce((sum, a) => sum + (a.risks?.length || 0), 0)}</div>
          <div className="text-sm text-gray-600">Total Risks</div>
        </Card>
      </div>

      <div className="space-y-4">
        {assets.map((asset) => (
          <Card key={asset.asset_uuid || asset.asset_id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{asset.name || asset.asset_id}</h3>
                  <Badge variant={criticalityVariant(asset.criticality || 'medium')}>{asset.criticality || 'medium'}</Badge>
                  <Badge variant="neutral">{asset.asset_type}</Badge>
                </div>
                {asset.description ? <p className="text-sm text-gray-600">{asset.description}</p> : null}
              </div>
              <Link href={`/assets/${encodeURIComponent(asset.asset_uuid || asset.asset_id)}?tenantId=${encodeURIComponent(tenantId)}`}>
                <Badge variant="info" className="cursor-pointer">
                  View Asset →
                </Badge>
              </Link>
            </div>

            <div>
              <div className="text-sm font-semibold mb-3">Associated Risks ({asset.risks?.length || 0})</div>
              <div className="space-y-2">
                {asset.risks?.map((risk: any) => (
                  <div key={risk.risk_id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium">{risk.risk_title}</div>
                      {risk.impact_description ? <div className="text-xs text-gray-600 mt-1">{risk.impact_description}</div> : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={exposureVariant(risk.exposure_level || 'full')}>{risk.exposure_level || 'full'}</Badge>
                      <div className="text-xs">Risk Score: {risk.risk_score ?? '-'}</div>
                      <div className="text-xs text-gray-600">{risk.treatment_count || 0} treatments</div>
                      <Link href={`/risks/${encodeURIComponent(risk.risk_id)}/chain`}>
                        <Badge variant="info" className="cursor-pointer">
                          View Chain
                        </Badge>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
        {assets.length === 0 ? (
          <Card className="p-8 text-center text-sm text-gray-600">No assets linked to risks yet.</Card>
        ) : null}
      </div>
    </div>
  );
}

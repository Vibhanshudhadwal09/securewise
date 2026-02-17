'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type AssetDetail = {
  id: string;
  asset_id: string;
  name?: string;
  kind?: string;
  env?: string;
  criticality?: string;
  status?: string;
  description?: string;
  owner_email?: string;
  department?: string;
  location?: string;
  ip_address?: string;
  hostname?: string;
  operating_system?: string;
  last_seen?: string;
  sources?: string[];
};

type Recommendation = {
  id: string;
  framework: string;
  control_code: string;
  control_title?: string;
  recommendation_reason?: string;
  priority: string;
  implemented: boolean;
  dismissed: boolean;
};

type CoverageItem = {
  id: string;
  control_code: string;
  control_title?: string;
  framework?: string;
  coverage_status?: string;
  coverage_level?: string;
  evidence_count?: number;
  last_evidence_at?: string;
};

type RiskItem = {
  risk_id: string;
  title: string;
  impact_description?: string;
};

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';
  const assetId = decodeURIComponent(String((params as any)?.assetId || ''));

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'coverage' | 'risks'>('overview');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    fetchAssetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, tenantId]);

  async function fetchAssetData() {
    setLoading(true);
    try {
      const headers = { 'x-tenant-id': tenantId };
      const assetRes = await fetch(`/api/assets/${encodeURIComponent(assetId)}`, {
        credentials: 'include',
        headers
      });
      const assetData = await assetRes.json().catch(() => ({}));
      const assetValue = assetData?.asset ?? assetData ?? null;
      setAsset(assetRes.ok ? assetValue : null);

      const recoRes = await fetch(`/api/assets/${encodeURIComponent(assetId)}/recommendations`, {
        credentials: 'include',
        headers
      });
      const recoData = await recoRes.json().catch(() => ({}));
      setRecommendations(Array.isArray(recoData?.recommendations) ? recoData.recommendations : []);

      const covRes = await fetch(`/api/assets/${encodeURIComponent(assetId)}/coverage`, {
        credentials: 'include',
        headers
      });
      const covData = await covRes.json().catch(() => ({}));
      setCoverage(Array.isArray(covData?.coverage) ? covData.coverage : []);

      const riskRes = await fetch(`/api/assets/${encodeURIComponent(assetId)}/risks`, {
        credentials: 'include',
        headers
      });
      const riskData = await riskRes.json().catch(() => ({}));
      setRisks(Array.isArray(riskData?.risks) ? riskData.risks : []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch asset data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoProtect() {
    if (!window.confirm('Apply all pending control recommendations?')) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(assetId)}/auto-protect`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(String(data?.error || 'Failed to apply recommendations'));
        return;
      }
      await fetchAssetData();
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) return <div className="p-8">Loading asset details...</div>;
  if (!asset) return <div className="p-8">Asset not found</div>;

  const pendingRecommendations = recommendations.filter((r) => !r.implemented && !r.dismissed);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{asset.name || asset.asset_id}</h1>
          <p className="text-gray-600 mt-2">{asset.description || asset.asset_id}</p>
        </div>
        <Button onClick={() => router.push(`/assets?tenantId=${encodeURIComponent(tenantId)}`)}>Back to Assets</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Type</div>
          <div className="text-xl font-bold mt-1">{asset.kind || 'asset'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Criticality</div>
          <Badge variant={asset.criticality === 'critical' ? 'danger' : 'neutral'} className="mt-1">
            {asset.criticality || 'medium'}
          </Badge>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Environment</div>
          <div className="text-xl font-bold mt-1">{asset.env || 'prod'}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Status</div>
          <Badge variant={asset.status === 'active' ? 'success' : 'neutral'} className="mt-1">
            {asset.status || 'active'}
          </Badge>
        </Card>
      </div>

      <div className="border-b">
        <div className="flex gap-4">
          {(['overview', 'recommendations', 'coverage', 'risks'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 ${
                activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'recommendations' && `Recommendations (${pendingRecommendations.length})`}
              {tab === 'coverage' && `Coverage (${coverage.length})`}
              {tab === 'risks' && `Risks (${risks.length})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Asset Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Asset ID</div>
                <div className="font-medium">{asset.asset_id}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">IP Address</div>
                <div className="font-medium">{asset.ip_address || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Hostname</div>
                <div className="font-medium">{asset.hostname || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Owner</div>
                <div className="font-medium">{asset.owner_email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Location</div>
                <div className="font-medium">{asset.location || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Seen</div>
                <div className="font-medium">
                  {asset.last_seen ? new Date(asset.last_seen).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {pendingRecommendations.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded">
              <div>
                <p className="font-semibold">Auto-Protection Available</p>
                <p className="text-sm text-gray-600">
                  {pendingRecommendations.length} control recommendations ready to implement
                </p>
              </div>
              <Button onClick={handleAutoProtect} disabled={actionBusy}>
                Apply All Recommendations
              </Button>
            </div>
          )}

          {pendingRecommendations.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600">No pending recommendations</p>
            </Card>
          ) : (
            pendingRecommendations.map((rec) => (
              <Card key={rec.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={rec.priority === 'critical' ? 'danger' : 'warning'}>{rec.priority}</Badge>
                      <span className="font-semibold">
                        {rec.framework}: {rec.control_code}
                      </span>
                    </div>
                    <p className="text-sm mt-2">{rec.control_title}</p>
                    <p className="text-xs text-gray-600 mt-1">{rec.recommendation_reason}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'coverage' && (
        <div className="space-y-3">
          {coverage.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600">No controls mapped to this asset</p>
            </Card>
          ) : (
            coverage.map((cov) => (
              <Card key={cov.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {cov.control_code}: {cov.control_title}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Status: {cov.coverage_status || 'mapped'} | Level: {cov.coverage_level || 'none'} | Evidence:{' '}
                      {cov.evidence_count || 0}
                      {cov.last_evidence_at ? (
                        <span className="ml-2">
                          (Last: {new Date(cov.last_evidence_at).toLocaleDateString()})
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Badge
                    variant={
                      cov.coverage_status === 'verified'
                        ? 'success'
                        : cov.coverage_status === 'implemented'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {cov.coverage_status || 'mapped'}
                  </Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'risks' && (
        <div className="space-y-3">
          {risks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600">No risks associated with this asset</p>
            </Card>
          ) : (
            risks.map((risk) => (
              <Card key={risk.risk_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{risk.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{risk.impact_description}</div>
                  </div>
                  <Button size="sm" onClick={() => router.push(`/risks/${risk.risk_id}/chain`)}>
                    View Chain
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}


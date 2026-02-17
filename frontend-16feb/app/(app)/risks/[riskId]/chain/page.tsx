'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function RiskAssetControlChainPage() {
  const params = useParams();
  const riskId = String(params?.riskId || '');
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const [chain, setChain] = useState<any[]>([]);
  const [residual, setResidual] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUuid(riskId)) {
      setError('Invalid risk ID. Open a risk from the risk register.');
      setChain([]);
      setResidual(null);
      return;
    }
    void fetchChain();
    void fetchResidual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskId]);

  async function fetchChain() {
    try {
      setError(null);
      const data = await fetchJson(`/api/risk-treatments/risk/${encodeURIComponent(riskId)}/chain`, tenantId);
      setChain(Array.isArray(data?.chain) ? data.chain : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load chain');
    }
  }

  async function fetchResidual() {
    try {
      const data = await fetchJson(`/api/risk-treatments/risk/${encodeURIComponent(riskId)}/residual`, tenantId);
      setResidual(data?.residual || null);
    } catch {
      setResidual(null);
    }
  }

  type AssetGroup = {
    asset: {
      id: string;
      name: string;
      type: string;
      criticality: string;
      impact_description?: string;
      exposure_level?: string;
    };
    controls: any[];
  };

  const assetGroups = useMemo<Record<string, AssetGroup>>(() => {
    return chain.reduce((acc: Record<string, AssetGroup>, item: any) => {
      const assetKey = item.asset_uuid || item.asset_id;
      if (!assetKey) return acc;
      if (!acc[assetKey]) {
        acc[assetKey] = {
          asset: {
            id: assetKey,
            name: item.asset_name || item.asset_id || 'Asset',
            type: item.asset_type || 'asset',
            criticality: item.asset_criticality || 'medium',
            impact_description: item.impact_description,
            exposure_level: item.exposure_level || 'full',
          },
          controls: [],
        };
      }
      if (item.control_id) {
        acc[assetKey].controls.push({
          id: item.control_id,
          code: item.control_code,
          title: item.control_title,
          framework: item.framework,
          implementation_status: item.implementation_status,
          coverage_status: item.coverage_status,
          evidence_count: item.evidence_count,
          last_evidence_at: item.last_evidence_at,
        });
      }
      return acc;
    }, {} as Record<string, AssetGroup>);
  }, [chain]);

  const assetGroupList = useMemo(() => Object.values(assetGroups), [assetGroups]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Risk → Asset → Control Chain</h1>
        <p className="text-gray-600 mt-2">Complete visibility of risk impact and protection</p>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      {chain[0] ? (
        <Card className="p-6 border-red-200 bg-red-50">
          <h2 className="text-xl font-semibold mb-3">Risk: {chain[0].risk_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Inherent Risk</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="danger">Likelihood: {chain[0].likelihood ?? '-'}</Badge>
                <Badge variant="danger">Impact: {chain[0].impact ?? '-'}</Badge>
              </div>
            </div>
            {residual ? (
              <div>
                <div className="text-sm text-gray-600">Residual Risk (After Treatment)</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="warning">Likelihood: {residual.residual_likelihood}</Badge>
                  <Badge variant="warning">Impact: {residual.residual_impact}</Badge>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Affected Assets & Protective Controls</h2>

        {assetGroupList.map((group) => (
          <Card key={group.asset.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold">{group.asset.name}</h3>
                  <Badge variant={criticalityVariant(group.asset.criticality)}>{group.asset.criticality}</Badge>
                  <Badge variant="neutral">{group.asset.type}</Badge>
                </div>
                {group.asset.impact_description ? <p className="text-sm text-gray-600">{group.asset.impact_description}</p> : null}
              </div>
              <Badge variant={exposureVariant(group.asset.exposure_level)}>{group.asset.exposure_level} exposure</Badge>
            </div>

            {group.controls.length > 0 ? (
              <div>
                <div className="text-sm font-semibold mb-3">Protective Controls ({group.controls.length})</div>
                <div className="space-y-2">
                  {group.controls.map((control: any) => (
                    <div key={control.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="info">{String(control.framework || '').toUpperCase()}</Badge>
                        <span className="font-mono text-sm font-semibold">{control.code}</span>
                        <span className="text-sm">{control.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-gray-600">
                          Coverage status: {String(control.coverage_status || 'mapped')}
                        </div>
                        <div className="text-xs text-gray-600">
                          Evidence: {control.evidence_count || 0}
                          {control.last_evidence_at ? (
                            <span className="ml-2">
                              (Last: {new Date(control.last_evidence_at).toLocaleDateString()})
                            </span>
                          ) : null}
                        </div>
                        <Badge variant={control.implementation_status === 'implemented' ? 'success' : control.implementation_status === 'in_progress' ? 'warning' : 'neutral'}>
                          {String(control.implementation_status || 'unknown')}
                        </Badge>
                        <div className="text-xs text-gray-600">{control.evidence_count || 0} evidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <div className="font-semibold text-yellow-900">No controls protecting this asset</div>
                <p className="text-sm text-yellow-700 mt-1">Consider implementing controls to mitigate risk exposure</p>
              </div>
            )}
          </Card>
        ))}

        {Object.keys(assetGroups).length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No assets linked to this risk yet</p>
            <p className="text-sm text-gray-500 mt-2">Link assets to see the complete risk chain</p>
          </Card>
        ) : null}
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Chain Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{Object.keys(assetGroups).length}</div>
            <div className="text-sm text-gray-600">Assets at Risk</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{assetGroupList.reduce((sum, g) => sum + g.controls.length, 0)}</div>
            <div className="text-sm text-gray-600">Protective Controls</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{assetGroupList.filter((g) => g.controls.length === 0).length}</div>
            <div className="text-sm text-gray-600">Unprotected Assets</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{residual ? Math.round(residual.treatment_effectiveness * 100) : 0}%</div>
            <div className="text-sm text-gray-600">Treatment Effectiveness</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type MatrixCell = {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  criticality: string;
  control_id: string;
  control_code: string;
  framework: string | null;
  category: string;
  control_title: string;
  coverage_score: number;
  coverage_level: string;
  evidence_count: number;
  last_evidence_at: string | null;
};

type CoverageGroup = {
  asset_id: string;
  category: string;
  average_score: number;
  evidence_count: number;
  controls: number;
  last_evidence_at: string | null;
  coverage_level: string;
};

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

function coverageLevel(score: number): string {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  if (score > 0) return 'low';
  return 'none';
}

function coverageColor(level: string): string {
  switch (level) {
    case 'high':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-orange-500';
    default:
      return 'bg-gray-300';
  }
}

function criticalityVariant(criticality: string) {
  if (criticality === 'critical') return 'danger';
  if (criticality === 'high') return 'warning';
  if (criticality === 'medium') return 'info';
  return 'neutral';
}

export default function AssetCoverageMatrixPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [matrix, setMatrix] = useState<MatrixCell[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [framework, setFramework] = useState<'iso27001' | 'soc2'>('iso27001');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const [matrixRes, gapsRes] = await Promise.all([
        fetchJson(`/api/asset-coverage/matrix?framework=${framework}`, tenantId),
        fetchJson('/api/asset-coverage/gaps?threshold=0.7', tenantId),
      ]);
      setMatrix(Array.isArray(matrixRes?.matrix) ? matrixRes.matrix : []);
      setGaps(Array.isArray(gapsRes?.gaps) ? gapsRes.gaps : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load coverage data');
    } finally {
      setLoading(false);
    }
  }

  async function recalculate() {
    setLoading(true);
    setError(null);
    try {
      await fetchJson('/api/asset-coverage/recalculate', tenantId, { method: 'POST' });
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Recalculation failed');
      setLoading(false);
    }
  }

  const assets = useMemo(() => {
    const map = new Map<string, { asset_id: string; asset_name: string; asset_type: string; criticality: string }>();
    for (const row of matrix) {
      if (!map.has(row.asset_id)) {
        map.set(row.asset_id, {
          asset_id: row.asset_id,
          asset_name: row.asset_name,
          asset_type: row.asset_type,
          criticality: row.criticality || 'medium',
        });
      }
    }
    return Array.from(map.values());
  }, [matrix]);

  const controlCategories = useMemo(() => {
    const set = new Set<string>();
    for (const row of matrix) {
      set.add(row.category || 'Controls');
    }
    return Array.from(set.values()).sort();
  }, [matrix]);

  const coverageGroups = useMemo(() => {
    const map = new Map<string, { sumScore: number; count: number; evidence: number; last: string | null }>();
    for (const row of matrix) {
      const category = row.category || 'Controls';
      const key = `${row.asset_id}::${category}`;
      const cur = map.get(key) || { sumScore: 0, count: 0, evidence: 0, last: null };
      cur.sumScore += Number(row.coverage_score || 0);
      cur.count += 1;
      cur.evidence += Number(row.evidence_count || 0);
      if (row.last_evidence_at) {
        const next = new Date(row.last_evidence_at).getTime();
        const prev = cur.last ? new Date(cur.last).getTime() : 0;
        if (next > prev) cur.last = row.last_evidence_at;
      }
      map.set(key, cur);
    }

    const out = new Map<string, CoverageGroup>();
    for (const [key, val] of map.entries()) {
      const [asset_id, category] = key.split('::');
      const average = val.count ? val.sumScore / val.count : 0;
      out.set(key, {
        asset_id,
        category,
        average_score: average,
        evidence_count: val.evidence,
        controls: val.count,
        last_evidence_at: val.last,
        coverage_level: coverageLevel(average),
      });
    }
    return out;
  }, [matrix]);

  const stats = useMemo(() => {
    const totalCells = assets.length * controlCategories.length;
    let high = 0;
    let medium = 0;
    let low = 0;
    let none = 0;

    for (const asset of assets) {
      for (const category of controlCategories) {
        const group = coverageGroups.get(`${asset.asset_id}::${category}`);
        const level = group?.coverage_level || 'none';
        if (level === 'high') high += 1;
        else if (level === 'medium') medium += 1;
        else if (level === 'low') low += 1;
        else none += 1;
      }
    }

    return { totalCells, high, medium, low, none };
  }, [assets, controlCategories, coverageGroups]);

  if (loading) return <div className="p-8">Loading coverage matrix...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Asset-Control Coverage Matrix</h1>
          <p className="text-gray-600 mt-2">Visual heatmap of asset protection and coverage gaps</p>
        </div>
        <div className="flex gap-3">
          <select value={framework} onChange={(e) => setFramework(e.target.value as any)} className="border rounded px-3 py-2">
            <option value="iso27001">ISO 27001</option>
            <option value="soc2">SOC 2</option>
          </select>
          <Button onClick={recalculate}>Recalculate Coverage</Button>
        </div>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.totalCells}</div>
          <div className="text-sm text-gray-600">Total Mappings</div>
        </Card>
        <Card className="p-4 border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.high}</div>
          <div className="text-sm text-gray-600">High Coverage (80%+)</div>
        </Card>
        <Card className="p-4 border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
          <div className="text-sm text-gray-600">Medium (50-80%)</div>
        </Card>
        <Card className="p-4 border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{stats.low}</div>
          <div className="text-sm text-gray-600">Low (1-50%)</div>
        </Card>
        <Card className="p-4 border-gray-200">
          <div className="text-2xl font-bold text-gray-600">{stats.none}</div>
          <div className="text-sm text-gray-600">No Coverage</div>
        </Card>
      </div>

      {gaps.length > 0 ? (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <div className="text-lg font-bold text-red-700">Coverage gaps detected</div>
          </div>
          <p className="text-sm text-red-700 mt-1">
            {gaps.length} assets have insufficient control coverage (below 70% threshold).
          </p>
          <div className="mt-3 space-y-2">
            {gaps.slice(0, 3).map((gap: any) => (
              <div key={gap.asset_id} className="text-sm">
                <Badge variant={criticalityVariant(String(gap.criticality || 'medium'))} className="mr-2">
                  {String(gap.criticality || 'medium')}
                </Badge>
                <span className="font-medium">{gap.asset_name}</span>
                <span className="text-gray-600 ml-2">
                  - {gap.gap_controls} uncovered controls ({Math.round(Number(gap.avg_coverage_score || 0) * 100)}% avg coverage)
                </span>
              </div>
            ))}
            {gaps.length > 3 ? <p className="text-xs text-gray-600">...and {gaps.length - 3} more assets</p> : null}
          </div>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Coverage Heatmap</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-3 bg-gray-100 sticky left-0 z-10">Asset</th>
                <th className="border p-3 bg-gray-100 text-xs">Type</th>
                <th className="border p-3 bg-gray-100 text-xs">Criticality</th>
                {controlCategories.map((cat) => (
                  <th key={cat} className="border p-2 bg-gray-100 text-xs">
                    {cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.asset_id}>
                  <td className="border p-3 font-medium sticky left-0 bg-white z-10">{asset.asset_name}</td>
                  <td className="border p-3 text-xs text-gray-600">{asset.asset_type}</td>
                  <td className="border p-3">
                    <Badge variant={criticalityVariant(asset.criticality)}>{asset.criticality}</Badge>
                  </td>
                  {controlCategories.map((category) => {
                    const group = coverageGroups.get(`${asset.asset_id}::${category}`);
                    const avgScore = group?.average_score || 0;
                    const level = group?.coverage_level || 'none';
                    const evidence = group?.evidence_count || 0;
                    const controls = group?.controls || 0;
                    const title = `Average: ${Math.round(avgScore * 100)}% | Controls: ${controls} | Evidence: ${evidence}`;
                    return (
                      <td
                        key={`${asset.asset_id}-${category}`}
                        className="border p-2 text-center cursor-pointer hover:opacity-80"
                        title={title}
                      >
                        <div className={`w-full h-8 rounded ${coverageColor(level)} flex items-center justify-center`}>
                          {avgScore > 0 ? (
                            <span className="text-xs text-white font-semibold">{Math.round(avgScore * 100)}%</span>
                          ) : null}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>High (80%+)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Medium (50-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Low (1-50%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span>None (0%)</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

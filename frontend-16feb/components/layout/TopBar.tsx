'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select, Tag, Tooltip, Typography } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import styles from './TopBar.module.css';
import { useShell } from './AppShell';
import AssetSelector from '@/components/AssetSelector';
import type { Asset } from '@/types/asset';
import { GlobalComplianceSelector } from '@/components/compliance/GlobalComplianceSelector';

type RangePreset = '1h' | '24h' | '7d' | '30d';
type Tenant = { tenant_id: string; name: string };
type Agent = { id?: string; name?: string; status?: string };

type HealthResponse = {
  partial?: boolean;
  components?: {
    telemetryManager?: { label?: string; ok?: boolean };
    signalsIndexer?: { label?: string; ok?: boolean };
  };
  opensearch?: 'healthy' | 'warning' | 'unhealthy';
};

function getCookie(name: string): string | null {
  const parts = String(document.cookie || '').split(';').map((s) => s.trim());
  const hit = parts.find((p) => p.startsWith(`${name}=`));
  if (!hit) return null;
  try {
    return decodeURIComponent(hit.split('=').slice(1).join('='));
  } catch {
    return hit.split('=').slice(1).join('=');
  }
}

function setCookie(name: string, value: string) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; samesite=lax`;
}

function clampRange(raw: any): RangePreset {
  const s = String(raw || '').trim();
  if (s === '1h' || s === '24h' || s === '7d' || s === '30d') return s;
  return '24h';
}

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const j = await res.json().catch(() => null);
  if (!res.ok) return null;
  return j;
}

function agentToAsset(a: any): Asset {
  const statusRaw = String(a?.status || '').toLowerCase();
  const status: Asset['status'] =
    statusRaw === 'active' ? 'active' : statusRaw === 'disconnected' ? 'disconnected' : 'inactive';
  return {
    agent_id: String(a?.id || a?.agent_id || ''),
    hostname: String(a?.name || a?.hostname || a?.os?.hostname || 'Unknown'),
    os: String(a?.os?.name || a?.os?.platform || 'Unknown'),
    ip: String(a?.ip || a?.registerIP || a?.register_ip || '-'),
    status,
    version: String(a?.version || '-'),
    risks: null,
    last_seen: a?.lastKeepAlive ? new Date(String(a.lastKeepAlive)) : undefined,
  };
}

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const sp = useSearchParams();
  const { partialAny, reportPartial } = useShell();

  const tenantId = sp?.get('tenantId') || getCookie('sw_tenant') || 'demo-tenant';
  const range = clampRange(sp?.get('range') || '24h');

  const [q, setQ] = useState<string>(sp?.get('q') || '');

  // keep cookie stable
  useEffect(() => {
    setCookie('sw_tenant', tenantId);
  }, [tenantId]);

  const { data: tenantsData } = useSWR<{ tenants?: Tenant[]; items?: Tenant[] }>(
    pathname.startsWith('/login') ? null : '/api/tenants',
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );
  const tenants = useMemo(() => {
    const t = (tenantsData as any)?.tenants || (tenantsData as any)?.items || [];
    return Array.isArray(t) ? (t as Tenant[]) : [];
  }, [tenantsData]);

  const { data: agentsData } = useSWR<{ items?: Agent[] }>(
    pathname.startsWith('/login') ? null : '/api/wazuh/agents',
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );
  const agents = useMemo(() => (Array.isArray((agentsData as any)?.items) ? ((agentsData as any).items as Agent[]) : []), [agentsData]);
  const assets: Asset[] = useMemo(() => {
    const items = (agentsData as any)?.items;
    return Array.isArray(items) ? items.map(agentToAsset).filter((x: Asset) => Boolean(x.agent_id)) : [];
  }, [agentsData]);

  const [recentAssets, setRecentAssets] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('recentAssets');
      if (raw) {
        const j = JSON.parse(raw);
        if (Array.isArray(j)) setRecentAssets(j.map(String));
      }
    } catch {}
  }, []);

  const currentAssetId = useMemo(() => {
    // 1) /assets/<assetId> route
    const m = pathname.match(/^\/assets\/([^/]+)/);
    if (m?.[1]) return decodeURIComponent(m[1]);
    // 2) existing query param usage
    const q = sp?.get('assetId');
    if (q) return String(q);
    return undefined;
  }, [pathname, sp]);

  const { data: health } = useSWR<HealthResponse>(
    pathname.startsWith('/login') ? null : `/api/security-signals/health?tenantId=${encodeURIComponent(tenantId)}`,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  useEffect(() => {
    reportPartial('topbar.health', Boolean(health?.partial));
  }, [health?.partial, reportPartial]);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp?.toString() || '');
    if (v === null) next.delete(k);
    else next.set(k, v);
    router.replace(`${pathname}?${next.toString()}`);
  };

  const labelMgr = health?.components?.telemetryManager?.label || 'Telemetry';
  const labelIdx = health?.components?.signalsIndexer?.label || 'Signals';

  return (
    <div className={styles.bar}>
      {partialAny ? <div className={styles.partialStrip}>Partial data — some panels may be missing signals due to index availability.</div> : null}
      <div className={styles.inner}>
        <div className={styles.left}>
          <Typography.Text strong>SecureWise</Typography.Text>
          <Tag color="blue">Enterprise</Tag>
        </div>

        <div className={styles.center}>
          <div className={styles.controls}>
            <Select
              style={{ width: 260 }}
              value={tenantId}
              showSearch
              options={[
                { label: 'Demo Tenant (demo-tenant)', value: 'demo-tenant' },
                ...tenants.map((t) => ({ label: `${t.name} (${t.tenant_id})`, value: t.tenant_id })),
              ]}
              onChange={(v) => setParam('tenantId', String(v))}
            />

            <Select
              style={{ width: 160 }}
              value={range}
              options={[
                { label: 'Last 1h', value: '1h' },
                { label: 'Last 24h', value: '24h' },
                { label: 'Last 7d', value: '7d' },
                { label: 'Last 30d', value: '30d' },
              ]}
              onChange={(v) => setParam('range', String(v))}
            />

            <AssetSelector
              currentAssetId={currentAssetId}
              assets={assets}
              recentAssets={recentAssets}
              onAssetSelect={(assetId) => {
                const updated = [assetId, ...recentAssets.filter((id) => id !== assetId)].slice(0, 5);
                setRecentAssets(updated);
                try {
                  window.localStorage.setItem('recentAssets', JSON.stringify(updated));
                } catch {}
                // Navigate to the asset cockpit
                const next = new URLSearchParams(sp?.toString() || '');
                next.set('tenantId', tenantId);
                next.set('range', range);
                router.push(`/assets/${encodeURIComponent(assetId)}?${next.toString()}`);
              }}
            />

            <Input.Search
              className={styles.search}
              placeholder="Search security signals (agent, rule, message...)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onSearch={(val) => {
                const s = String(val || '').trim();
                const next = new URLSearchParams(sp?.toString() || '');
                // Preserve context keys + set q
                next.set('tenantId', tenantId);
                next.set('range', range);
                if (s) next.set('q', s);
                else next.delete('q');
                router.push(`/dashboard?${next.toString()}`);
              }}
              allowClear
            />
          </div>
        </div>

        <div className={styles.right}>
          <Tooltip title={labelMgr}>
            <span className={styles.statusPill}>{labelMgr}</span>
          </Tooltip>
          <Tooltip title={labelIdx}>
            <span className={styles.statusPill}>{labelIdx}</span>
          </Tooltip>
          <Button size="small" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>
      <GlobalComplianceSelector />
    </div>
  );
}


'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Badge, Button, ConfigProvider, Input, Layout, Menu, Select, Space, Tag, Tooltip, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { theme as antdTheme } from 'antd';
import {
  ApartmentOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  SafetyOutlined,
  SettingOutlined,
  ToolOutlined,
  UserOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import styles from './AppShell.module.css';

type RangePreset = '1h' | '24h' | '7d' | '30d';

type HealthResponse = {
  opensearch?: 'healthy' | 'warning' | 'unhealthy';
  latencyMs?: number | null;
  partial?: boolean;
  components?: {
    telemetryManager?: { label?: string; ok?: boolean; latencyMs?: number | null };
    signalsIndexer?: { label?: string; ok?: boolean; latencyMs?: number | null };
  };
};

type Tenant = { tenant_id: string; name: string };
type Agent = { id?: string; name?: string; ip?: string; status?: string };

type AppShellCtx = {
  tenantId: string;
  range: RangePreset;
  assetId: string | null;
  setTenantId: (next: string) => void;
  setRange: (next: RangePreset) => void;
  setAssetId: (next: string | null) => void;
  reportPartial: (key: string, isPartial: boolean) => void;
};

const Ctx = createContext<AppShellCtx | null>(null);

export function useAppShell(): AppShellCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppShell must be used within <AppShell>');
  return v;
}

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

function fetchJson(tenantId: string) {
  return async (url: string) => {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'x-tenant-id': tenantId },
      cache: 'no-store',
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) return null;
    return j;
  };
}

function pathAssetId(pathname: string | null): { assetId: string | null; rest: string } {
  const p = String(pathname || '/');
  const m = p.match(/^\/endpoints\/([^/]+)(\/.*)?$/);
  if (!m) return { assetId: null, rest: '' };
  return { assetId: decodeURIComponent(m[1]), rest: m[2] || '' };
}

export function AppShell(props: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const isLogin = String(pathname || '').startsWith('/login');

  const tenantFromUrl = sp?.get('tenantId') || null;
  const rangeFromUrl = sp?.get('range') || null;
  const assetFromUrl = sp?.get('assetId') || null; // optional override
  const fromCookie = typeof window !== 'undefined' ? getCookie('sw_tenant') : null;

  const { assetId: assetFromPath, rest: endpointsRest } = pathAssetId(pathname);

  const [tenantId, setTenantIdState] = useState<string>(tenantFromUrl || fromCookie || 'demo-tenant');
  const [range, setRangeState] = useState<RangePreset>(clampRange(rangeFromUrl || '24h'));
  const [assetId, setAssetIdState] = useState<string | null>(assetFromPath || assetFromUrl || null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [globalQ, setGlobalQ] = useState<string>(sp?.get('q') || '');

  const partialByKeyRef = useRef<Map<string, boolean>>(new Map());
  const [partialAny, setPartialAny] = useState<boolean>(false);

  const reportPartial = (key: string, isPartial: boolean) => {
    partialByKeyRef.current.set(String(key), Boolean(isPartial));
    setPartialAny(Array.from(partialByKeyRef.current.values()).some(Boolean));
  };

  // Keep internal state in sync when URL changes (navigation/back/forward).
  useEffect(() => {
    const t = tenantFromUrl || fromCookie || 'demo-tenant';
    setTenantIdState(t);
    setRangeState(clampRange(rangeFromUrl || '24h'));
    setGlobalQ(sp?.get('q') || '');
    setAssetIdState(assetFromPath || assetFromUrl || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantFromUrl, rangeFromUrl, assetFromPath, assetFromUrl, pathname]);

  // Keep tenant cookie stable for middleware + backend header binding.
  useEffect(() => {
    try {
      setCookie('sw_tenant', tenantId);
    } catch {
      // ignore
    }
  }, [tenantId]);

  const apiFetch = useMemo(() => fetchJson(tenantId), [tenantId]);

  const { data: tenantsData } = useSWR<{ tenants?: Tenant[]; items?: Tenant[] }>(
    isLogin ? null : '/api/tenants',
    apiFetch,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const tenants = useMemo(() => {
    const t = (tenantsData as any)?.tenants || (tenantsData as any)?.items || [];
    return Array.isArray(t) ? (t as Tenant[]) : [];
  }, [tenantsData]);

  const { data: agentsData } = useSWR<{ items?: Agent[] }>(
    isLogin ? null : '/api/wazuh/agents',
    apiFetch,
    { refreshInterval: 60_000, revalidateOnFocus: false }
  );

  const agents = useMemo(() => (Array.isArray((agentsData as any)?.items) ? ((agentsData as any).items as Agent[]) : []), [agentsData]);

  const { data: health } = useSWR<HealthResponse>(
    isLogin ? null : `/api/security-signals/health?tenantId=${encodeURIComponent(tenantId)}`,
    apiFetch,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  useEffect(() => {
    if (health?.partial) reportPartial('health', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health?.partial]);

  const labels = {
    telemetryManager: health?.components?.telemetryManager?.label || 'Telemetry',
    signalsIndexer: health?.components?.signalsIndexer?.label || 'Signals',
  };

  const indexerOk =
    typeof health?.components?.signalsIndexer?.ok === 'boolean'
      ? Boolean(health?.components?.signalsIndexer?.ok)
      : health?.opensearch === 'healthy'
        ? true
        : health?.opensearch === 'unhealthy'
          ? false
          : null;

  const managerOk = typeof health?.components?.telemetryManager?.ok === 'boolean' ? Boolean(health?.components?.telemetryManager?.ok) : null;

  const healthBadge = (ok: boolean | null) => {
    if (ok === true) return <Badge status="success" />;
    if (ok === false) return <Badge status="error" />;
    return <Badge status="warning" />;
  };

  const selectedKey = useMemo(() => {
    const p = String(pathname || '/');
    if (p.startsWith('/endpoints/')) return p;
    if (p.startsWith('/controls')) return '/controls';
    if (p.startsWith('/evidence')) return '/evidence';
    if (p.startsWith('/exceptions')) return '/exceptions';
    if (p.startsWith('/assets')) return '/assets';
    if (p.startsWith('/admin')) return '/admin';
    return '/dashboard';
  }, [pathname]);

  const navigateWithContext = (to: string) => {
    const q = new URLSearchParams(sp?.toString() || '');
    q.set('tenantId', tenantId);
    q.set('range', range);
    if (to.startsWith('/endpoints/')) q.delete('assetId');
    router.push(`${to}?${q.toString()}`);
  };

  const onTenantChange = (next: string) => {
    const t = String(next || 'demo-tenant');
    setTenantIdState(t);
    const q = new URLSearchParams(sp?.toString() || '');
    q.set('tenantId', t);
    q.set('range', range);
    // Keep route stable; just update query.
    router.replace(`${String(pathname || '/dashboard')}?${q.toString()}`);
  };

  const onRangeChange = (next: RangePreset) => {
    setRangeState(next);
    const q = new URLSearchParams(sp?.toString() || '');
    q.set('tenantId', tenantId);
    q.set('range', next);
    router.replace(`${String(pathname || '/dashboard')}?${q.toString()}`);
  };

  const onAgentChange = (next: string | null) => {
    const v = next && String(next).trim() ? String(next).trim() : null;
    setAssetIdState(v);
    const q = new URLSearchParams(sp?.toString() || '');
    q.set('tenantId', tenantId);
    q.set('range', range);

    // Routing rules:
    // - If in /endpoints/[assetId]/* and agent changes, keep subpath and swap id.
    // - If on global route and agent selected, go to /endpoints/[assetId].
    // - If agent cleared while in /endpoints/*, go back to /dashboard.
    if (String(pathname || '').startsWith('/endpoints/')) {
      if (v) return router.push(`/endpoints/${encodeURIComponent(v)}${endpointsRest}?${q.toString()}`);
      return router.push(`/dashboard?${q.toString()}`);
    }

    if (v) return router.push(`/endpoints/${encodeURIComponent(v)}?${q.toString()}`);
    // cleared: just keep route, remove assetId override
    q.delete('assetId');
    return router.replace(`${String(pathname || '/dashboard')}?${q.toString()}`);
  };

  const menuItems: MenuProps['items'] = useMemo(() => {
    const base = (key: string, label: string, icon?: React.ReactNode) => ({ key, label, icon });
    return [
      { type: 'group', key: 'g-agent', label: 'Agent Cockpit', children: [
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}` : '/dashboard', 'Endpoint Security', <DashboardOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/endpoint-security` : '/dashboard', 'Configuration Assessment', <ToolOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/endpoint-security` : '/dashboard', 'Malware Detection', <ToolOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/endpoint-security` : '/dashboard', 'File Integrity Monitoring', <ToolOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/threat-intelligence` : '/dashboard', 'Threat Intelligence', <ToolOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/threat-intelligence` : '/dashboard', 'Threat Hunting', <ToolOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/endpoint-security` : '/dashboard', 'Vulnerability Signals (Phase 3)', <ToolOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/threat-intelligence` : '/dashboard', 'MITRE ATT&CK Alignment', <ToolOutlined />),
        base(assetId ? `/endpoints/${encodeURIComponent(assetId)}/compliance` : '/dashboard', 'Security Operations & Compliance', <ToolOutlined />),
      ]},
      { type: 'group', key: 'g-grc', label: 'GRC', children: [
        base('/controls', 'Controls', <SafetyOutlined />),
        base('/evidence', 'Evidence Ledger', <FileSearchOutlined />),
        base('/exceptions', 'Exceptions', <SettingOutlined />),
      ]},
      { type: 'group', key: 'g-platform', label: 'Platform', children: [
        base('/assets', 'Agent Management', <ApartmentOutlined />),
        base('/platform/users', 'Users', <UserOutlined />),
        base('/platform/roles', 'Roles', <SettingOutlined />),
        base('/platform/audit-logs', 'Audit Logs', <AuditOutlined />),
        base('/admin', 'Admin', <ToolOutlined />),
      ]},
    ] as any;
  }, [assetId]);

  const ctxValue: AppShellCtx = useMemo(
    () => ({
      tenantId,
      range,
      assetId,
      setTenantId: onTenantChange,
      setRange: onRangeChange,
      setAssetId: onAgentChange,
      reportPartial,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenantId, range, assetId, sp, pathname]
  );

  if (isLogin) {
    return (
      <ConfigProvider theme={{ algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { borderRadius: 10, colorPrimary: '#1f5eff' } }}>
        <Ctx.Provider value={ctxValue}>{props.children}</Ctx.Provider>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm, token: { borderRadius: 10, colorPrimary: '#1f5eff' } }}>
      <Ctx.Provider value={ctxValue}>
        <Layout className={styles.app}>
          <Layout.Sider className={styles.sider} collapsible breakpoint="lg">
            <div className={styles.brand}>SecureWise</div>
            <Menu
              theme="dark"
              mode="inline"
              selectedKeys={[selectedKey]}
              items={menuItems}
              onClick={(e) => {
                const to = String(e.key || '/dashboard');
                // If target is already a fully built endpoints route, it already encodes asset.
                if (to.startsWith('/endpoints/')) return navigateWithContext(to);
                return navigateWithContext(to);
              }}
            />
          </Layout.Sider>

          <Layout>
            {partialAny ? (
              <div className={styles.globalBanner}>
                <Alert
                  type="warning"
                  showIcon
                  message="Partial data — some panels may be missing signals due to index availability."
                />
              </div>
            ) : null}

            <Layout.Header className={styles.header}>
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Space size={10}>
                  <Typography.Text strong>SecureWise</Typography.Text>
                  <Tag color="blue">Enterprise</Tag>
                </Space>

                <Space size={10} wrap style={{ justifyContent: 'center' }}>
                  <Select
                    style={{ width: 260 }}
                    value={tenantId}
                    showSearch
                    options={[
                      { label: 'Demo Tenant (demo-tenant)', value: 'demo-tenant' },
                      ...tenants.map((t) => ({ label: `${t.name} (${t.tenant_id})`, value: t.tenant_id })),
                    ]}
                    onChange={(v) => onTenantChange(String(v))}
                  />

                  <Select
                    style={{ width: 300 }}
                    value={assetId || ''}
                    showSearch
                    placeholder="All endpoints"
                    options={[
                      { label: 'All endpoints', value: '' },
                      ...agents.slice(0, 500).map((a) => ({
                        label: `${a.name || a.id || 'agent'}${a.id ? ` (${a.id})` : ''}`,
                        value: String(a.id || ''),
                      })),
                    ].filter((o) => o.value !== undefined)}
                    onChange={(v) => onAgentChange(String(v || '') || null)}
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
                    onChange={(v) => onRangeChange(v as RangePreset)}
                  />

                  <Input.Search
                    style={{ width: 360 }}
                    value={globalQ}
                    onChange={(e) => setGlobalQ(e.target.value)}
                    placeholder="Search security signals (agent, rule, message...)"
                    onSearch={(value) => {
                      const q = String(value || '').trim();
                      const p = new URLSearchParams(sp?.toString() || '');
                      p.set('tenantId', tenantId);
                      p.set('range', range);
                      if (q) p.set('q', q);
                      else p.delete('q');
                      router.push(`/dashboard?${p.toString()}`);
                    }}
                    allowClear
                  />
                </Space>

                <Space size={10}>
                  <Tooltip title={labels.telemetryManager}>
                    <span>{healthBadge(managerOk)} <span style={{ fontSize: 12, opacity: 0.85 }}>{labels.telemetryManager}</span></span>
                  </Tooltip>
                  <Tooltip title={labels.signalsIndexer}>
                    <span>{healthBadge(indexerOk)} <span style={{ fontSize: 12, opacity: 0.85 }}>{labels.signalsIndexer}</span></span>
                  </Tooltip>
                  <Tooltip title="Theme">
                    <Button size="small" onClick={() => setDarkMode((v) => !v)}>
                      Theme
                    </Button>
                  </Tooltip>
                </Space>
              </div>
            </Layout.Header>

            <Layout.Content className={styles.content}>{props.children}</Layout.Content>
          </Layout>
        </Layout>
      </Ctx.Provider>
    </ConfigProvider>
  );
}


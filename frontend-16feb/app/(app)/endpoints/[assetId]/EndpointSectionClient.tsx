'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Card, Skeleton, Space, Typography, ConfigProvider, theme } from 'antd';
import { useSearchParams } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import { useShell } from '../../../../components/layout/AppShell';
import { SecuritySignalsAlertsTable } from '../../../../components/security-signals/SecuritySignalsAlertsTable';
import { SecuritySignalsKpiTiles } from '../../../../components/security-signals/SecuritySignalsKpiTiles';
import type { RangePreset, SecuritySignalsAlertsPage, SecuritySignalsAlertItem, SecuritySignalsSummary } from '../../../../components/security-signals/types';

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: { 'x-tenant-id': tenantId },
    cache: 'no-store',
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
  return j;
}

type ModeV28 = 'configuration' | 'malware' | 'fim' | 'threat-hunting' | 'vuln' | 'mitre';
type LegacyMode = 'endpoint-security' | 'threat-intelligence' | 'compliance';

function normalizeMode(input: { mode: ModeV28; title?: string } | { mode: LegacyMode; submode?: string; title?: string }): { mode: ModeV28; title: string } {
  const title = String((input as any).title || '').trim();
  const mode = (input as any).mode as any;
  const sub = String((input as any).submode || '').trim().toLowerCase();

  if (mode === 'endpoint-security') {
    if (sub === 'malware') return { mode: 'malware', title: title || 'Malware Detection' };
    if (sub === 'fim') return { mode: 'fim', title: title || 'File Integrity Monitoring (FIM)' };
    return { mode: 'configuration', title: title || 'Configuration Assessment' };
  }
  if (mode === 'threat-intelligence') {
    if (sub === 'mitre') return { mode: 'mitre', title: title || 'MITRE ATT&CK' };
    if (sub === 'vulns' || sub === 'vuln') return { mode: 'vuln', title: title || 'Vulnerability Detection' };
    return { mode: 'threat-hunting', title: title || 'Threat Hunting' };
  }
  if (mode === 'compliance') {
    return { mode: 'configuration', title: title || 'Compliance (signals)' };
  }
  // new v2.8 modes
  const m = String(mode || '').trim() as ModeV28;
  const fallbackTitle =
    m === 'configuration'
      ? 'Configuration Assessment'
      : m === 'malware'
        ? 'Malware Detection'
        : m === 'fim'
          ? 'File Integrity Monitoring (FIM)'
          : m === 'threat-hunting'
            ? 'Threat Hunting'
            : m === 'vuln'
              ? 'Vulnerability Detection'
              : 'MITRE ATT&CK';
  return { mode: m, title: title || fallbackTitle };
}

function buildSummaryFromAlerts(alerts: SecuritySignalsAlertItem[], partial: boolean): SecuritySignalsSummary {
  const sev = { critical: 0, high: 0, medium: 0, low: 0 };
  let cisFailures = 0;
  const mitreSet = new Set<string>();

  for (const a of alerts || []) {
    const lvl = Number(a?.severity || 0) || 0;
    if (lvl >= 12) sev.critical += 1;
    else if (lvl >= 8) sev.high += 1;
    else if (lvl >= 4) sev.medium += 1;
    else sev.low += 1;

    if ((a.frameworks || []).includes('CIS')) cisFailures += 1;
    for (const m of a.mitre || []) {
      const k = String(m || '').trim();
      if (k) mitreSet.add(k);
    }
  }

  return {
    alertsTotal: alerts.length,
    severity: sev,
    cisFailures,
    mitreTactics: mitreSet.size,
    evidenceFreshnessHours: null,
    partial,
  };
}

function asText(a: SecuritySignalsAlertItem) {
  return `${a.timestamp || ''} ${a.agent || ''} ${a.rule || ''} ${(a.frameworks || []).join(' ')} ${(a.mitre || []).join(' ')} ${a.message || ''}`.toLowerCase();
}

function filterByMode(mode: ModeV28, alerts: SecuritySignalsAlertItem[]): SecuritySignalsAlertItem[] {
  const out: SecuritySignalsAlertItem[] = [];
  for (const a of alerts || []) {
    const msg = String(a?.message || '').toLowerCase();
    const rule = String(a?.rule || '').toLowerCase();
    const frameworks = Array.isArray(a?.frameworks) ? a.frameworks.map((x) => String(x || '').toUpperCase()) : [];
    const mitreCount = Array.isArray(a?.mitre) ? a.mitre.filter(Boolean).length : 0;
    const sev = Number(a?.severity || 0) || 0;

    const isConfig = frameworks.includes('CIS') || msg.includes('sca') || rule.includes('cis');
    const isMalware = msg.includes('malware') || msg.includes('trojan') || msg.includes('virus') || msg.includes('virustotal') || rule.includes('malware');
    const isFim = msg.includes('integrity') || msg.includes('syscheck') || msg.includes('fim') || rule.includes('syscheck') || rule.includes('fim');
    const isVuln = msg.includes('cve') || rule.includes('vulnerability') || msg.includes('vulnerab');
    const isThreatHunt = sev >= 7 || mitreCount > 0 || msg.includes('attack') || msg.includes('intrusion') || msg.includes('suspicious');
    const isMitre = mitreCount > 0;

    const ok =
      mode === 'configuration'
        ? isConfig
        : mode === 'malware'
          ? isMalware
          : mode === 'fim'
            ? isFim
            : mode === 'vuln'
              ? isVuln
              : mode === 'mitre'
                ? isMitre
                : isThreatHunt;

    if (ok) out.push(a);
  }
  return out;
}

export function EndpointSectionClient(
  props:
    | { assetId: string | null; title: string; mode: ModeV28 }
    | { assetId: string | null; mode: LegacyMode; submode?: string; title?: string }
) {
  const { reportPartial } = useShell();
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';
  const range = (sp?.get('range') as RangePreset) || '24h';

  const [search, setSearch] = useState('');
  const normalized = useMemo(() => normalizeMode(props as any), [props]);

  const baseQ = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tenantId', tenantId);
    p.set('range', String(range || '24h'));
    if (props.assetId) p.set('assetId', String(props.assetId));
    p.set('limit', '50');
    return p.toString();
  }, [tenantId, range, props.assetId]);

  const ssFetcher = (url: string) => fetchJson(url, tenantId);

  const alertsGetKey = (pageIndex: number, prev: SecuritySignalsAlertsPage | null) => {
    if (prev && !prev.nextCursor) return null;
    const cursor = pageIndex === 0 ? '' : `&cursor=${encodeURIComponent(String(prev?.nextCursor || ''))}`;
    return `/api/security-signals/alerts?${baseQ}${cursor}`;
  };

  const { data: pages, error: alertsErr, isLoading: alertsLoading, size, setSize } = useSWRInfinite<SecuritySignalsAlertsPage>(
    alertsGetKey as any,
    ssFetcher as any,
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const alerts = useMemo(() => ((pages || []) as any[]).flatMap((p) => (p?.items || []) as SecuritySignalsAlertItem[]), [pages]);
  const hasMore = useMemo(() => Boolean(((pages || [])[Math.max(0, (pages || []).length - 1)] as any)?.nextCursor), [pages]);
  const partialAny = Boolean((pages || []).some((p: any) => Boolean(p?.partial)));

  React.useEffect(
    () => reportPartial(`endpoint.${props.assetId || 'all'}.${normalized.mode}`, partialAny),
    [reportPartial, props.assetId, normalized.mode, partialAny]
  );

  const modeFiltered = useMemo(() => filterByMode(normalized.mode, alerts), [alerts, normalized.mode]);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return modeFiltered;
    return modeFiltered.filter((a) => asText(a).includes(q));
  }, [modeFiltered, search]);

  const summary = useMemo(() => buildSummaryFromAlerts(modeFiltered, partialAny), [modeFiltered, partialAny]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgContainer: 'var(--card-bg)',
          colorBgElevated: 'var(--card-bg)',
          colorText: 'var(--text-primary)',
          colorTextSecondary: 'var(--text-secondary)',
          colorBorder: 'var(--card-border)',
          colorBgLayout: 'var(--bg-primary)',
          colorBgBase: 'var(--bg-primary)',
        },
      }}
    >
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]" style={{ padding: 6 }}>
        <div className="max-w-[1400px] w-full mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                {props.assetId ? (
                  <>
                    Endpoint: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{props.assetId}</span>
                  </>
                ) : (
                  <>All Endpoints</>
                )}
              </Typography.Title>
              <Typography.Text type="secondary">
                <b>{normalized.title}</b> • Range: <b>{String(range || '24h')}</b> • Showing most recent <b>50</b> per page
              </Typography.Text>
            </div>
          </div>

          {alertsErr ? (
            <Alert style={{ marginTop: 12 }} type="warning" showIcon message="Signals are unavailable" description={String((alertsErr as any)?.message || alertsErr)} />
          ) : null}

          <div className="mb-2 mt-4">
            <Typography.Title level={4} style={{ margin: 0 }}>Security Signals Summary</Typography.Title>
          </div>

          <div className="mb-6">
            <SecuritySignalsKpiTiles summary={summary} loading={Boolean(alertsLoading)} rangeLabel={String(range || '24h')} />
          </div>

          <div className="mb-6">
            <Card title="Recent security signals" size="small" className="!border-none !bg-[var(--card-bg)] !shadow-[var(--card-shadow)]">
              {alertsLoading && !pages ? (
                <Skeleton active />
              ) : (
                <div>
                  {filteredAlerts.length === 0 ? (
                    <div style={{ padding: 12 }}>
                      <Typography.Text type="secondary">No signals found for this category (check range/tenant).</Typography.Text>
                    </div>
                  ) : null}
                  <SecuritySignalsAlertsTable
                    items={filteredAlerts}
                    loading={Boolean(alertsLoading)}
                    hasMore={Boolean(hasMore)}
                    onLoadMore={() => void setSize(size + 1)}
                    search={search}
                    onSearchChange={setSearch}
                  />
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}


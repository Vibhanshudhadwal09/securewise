'use client';

import React, { useMemo, useState } from 'react';
import { Alert, Card, Skeleton, Typography } from 'antd';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { SecuritySignalsKpiTiles } from '../../../components/security-signals/SecuritySignalsKpiTiles';
import { SecuritySignalsTimelineChart } from '../../../components/security-signals/SecuritySignalsTimeline';
import { SecuritySignalsAlertsTable } from '../../../components/security-signals/SecuritySignalsAlertsTable';
import type { SecuritySignalsAlertsPage, SecuritySignalsAlertItem, SecuritySignalsSummary, SecuritySignalsTimeline } from '../../../components/security-signals/types';

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { method: 'GET', credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(String(j?.error || `HTTP ${res.status}`));
  return j;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function WazuhAlertsClient(props: { tenantId: string; refreshSeconds?: number }) {
  // Legacy component name kept for compatibility; it now renders Security Signals via backend APIs.
  const tenantId = props.tenantId || 'demo-tenant';
  const refreshSeconds = clamp(Number(props.refreshSeconds || 30), 5, 600);
  const range = '24h';

  const [search, setSearch] = useState('');

  const baseQ = useMemo(() => {
    const p = new URLSearchParams();
    p.set('tenantId', tenantId);
    p.set('range', range);
    return p.toString();
  }, [tenantId]);

  const { data: summary, error: summaryErr, isLoading: summaryLoading } = useSWR<SecuritySignalsSummary>(
    `/api/security-signals/summary?${baseQ}`,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: refreshSeconds * 1000, revalidateOnFocus: false }
  );

  const { data: timeline, error: timelineErr, isLoading: timelineLoading } = useSWR<SecuritySignalsTimeline>(
    `/api/security-signals/timeline?${baseQ}`,
    (u) => fetchJson(u, tenantId),
    { refreshInterval: refreshSeconds * 1000, revalidateOnFocus: false }
  );

  const alertsGetKey = (pageIndex: number, prev: SecuritySignalsAlertsPage | null) => {
    if (prev && !prev.nextCursor) return null;
    const cursor = pageIndex === 0 ? '' : `&cursor=${encodeURIComponent(String(prev?.nextCursor || ''))}`;
    return `/api/security-signals/alerts?${baseQ}&limit=50${cursor}`;
  };

  const { data: pages, error: alertsErr, isLoading: alertsLoading, size, setSize } = useSWRInfinite<SecuritySignalsAlertsPage>(
    alertsGetKey as any,
    (u: string) => fetchJson(u, tenantId),
    { refreshInterval: refreshSeconds * 1000, revalidateOnFocus: false }
  );

  const alerts = useMemo(() => ((pages || []) as any[]).flatMap((p) => (p?.items || []) as SecuritySignalsAlertItem[]), [pages]);
  const hasMore = useMemo(() => Boolean(((pages || [])[Math.max(0, (pages || []).length - 1)] as any)?.nextCursor), [pages]);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) => `${a.timestamp} ${a.agent} ${a.rule} ${(a.frameworks || []).join(' ')} ${(a.mitre || []).join(' ')} ${a.message}`.toLowerCase().includes(q));
  }, [alerts, search]);

  const err = summaryErr || timelineErr || alertsErr;

  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Security Signals (last 24h)</h2>
        <div style={{ fontSize: 12, opacity: 0.7 }}>auto-refresh: {refreshSeconds}s</div>
      </div>

      {err ? (
        <Alert style={{ marginTop: 12 }} type="warning" showIcon message="Some panels are unavailable" description={String((err as any)?.message || err)} />
      ) : null}

      <div style={{ marginTop: 12 }}>
        <SecuritySignalsKpiTiles summary={summary} loading={Boolean(summaryLoading)} rangeLabel={range} />
      </div>

      <div style={{ marginTop: 12 }}>
        <SecuritySignalsTimelineChart title="Signals timeline" range={range} timeline={timeline} loading={Boolean(timelineLoading)} />
      </div>

      <div style={{ marginTop: 12 }}>
        <Card size="small" title="Recent security signals">
          {alertsLoading && !alerts.length ? (
            <Skeleton active />
          ) : (
            <SecuritySignalsAlertsTable
              items={filteredAlerts}
              loading={Boolean(alertsLoading)}
              hasMore={Boolean(hasMore)}
              onLoadMore={() => void setSize(size + 1)}
              search={search}
              onSearchChange={setSearch}
            />
          )}
          <Typography.Text type="secondary">Raw event payload may include original tool names.</Typography.Text>
        </Card>
      </div>
    </section>
  );
}

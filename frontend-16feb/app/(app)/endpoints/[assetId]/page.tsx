import React from 'react';
import type { RangePreset } from '../../../../components/security-signals/types';
import { EndpointSignalsClient } from './EndpointSignalsClient';

export default async function EndpointOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ tenantId?: string; range?: string }>;
}) {
  const p = await params;
  const sp = await searchParams;
  const assetId = decodeURIComponent(String(p.assetId || ''));
  const tenantId = String(sp.tenantId || 'demo-tenant');
  const range = (String(sp.range || '24h') as RangePreset) || '24h';

  return <EndpointSignalsClient assetId={assetId} initialTenantId={tenantId} initialRange={range} mode="overview" />;
}


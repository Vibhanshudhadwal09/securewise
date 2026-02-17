import React from 'react';
import { redirect } from 'next/navigation';

export default async function ThreatIntelligencePage({
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
  const range = String(sp.range || '24h') || '24h';

  const q = new URLSearchParams();
  if (tenantId) q.set('tenantId', tenantId);
  if (range) q.set('range', range);
  const qs = q.toString();
  redirect(`/endpoints/${encodeURIComponent(assetId)}/threat-hunting${qs ? `?${qs}` : ''}`);
}


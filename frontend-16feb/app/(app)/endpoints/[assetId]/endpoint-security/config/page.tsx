import React from 'react';
import { redirect } from 'next/navigation';

export default async function EndpointSecurityConfigPage({
  params,
  searchParams,
}: {
  params: Promise<{ assetId: string }>;
  searchParams: Promise<{ tenantId?: string; range?: string; slaHours?: string; enforceability?: string; staleOnly?: string }>;
}) {
  const p = await params;
  const assetId = decodeURIComponent(String(p.assetId || ''));
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.tenantId) q.set('tenantId', String(sp.tenantId));
  if (sp.range) q.set('range', String(sp.range));
  if (sp.slaHours) q.set('slaHours', String(sp.slaHours));
  if (sp.enforceability) q.set('enforceability', String(sp.enforceability));
  if (sp.staleOnly) q.set('staleOnly', String(sp.staleOnly));
  const qs = q.toString();
  redirect(`/endpoints/${encodeURIComponent(assetId)}/configuration-assessment${qs ? `?${qs}` : ''}`);
}


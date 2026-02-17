import { redirect } from 'next/navigation';

export default async function AgentManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string; range?: string; slaHours?: string; enforceability?: string; staleOnly?: string }>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  if (sp.tenantId) q.set('tenantId', String(sp.tenantId));
  if (sp.range) q.set('range', String(sp.range));
  if (sp.slaHours) q.set('slaHours', String(sp.slaHours));
  if (sp.enforceability) q.set('enforceability', String(sp.enforceability));
  if (sp.staleOnly) q.set('staleOnly', String(sp.staleOnly));
  const qs = q.toString();
  redirect(`/assets${qs ? `?${qs}` : ''}`);
}


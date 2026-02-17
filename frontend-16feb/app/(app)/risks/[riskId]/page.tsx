import React from 'react';
import { cookies } from 'next/headers';
import { RiskDetailClient } from './RiskDetailClient';

export default async function RiskDetail({ params }: { params: Promise<{ riskId: string }> }) {
  const p = await params;
  const store = await cookies();
  const tenantId = store.get('sw_tenant')?.value || 'demo-tenant';
  return <RiskDetailClient riskId={p.riskId} tenantId={tenantId} />;
}

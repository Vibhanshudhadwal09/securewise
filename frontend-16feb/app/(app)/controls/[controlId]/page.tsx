import React from 'react';
import { apiFetch } from '../../../../lib/server-api';
import { ControlDrilldownClient } from './ControlDrilldownClient';

async function getJson(path: string, tenantId: string) {
  const res = await apiFetch(path, { tenantId });
  return res.json();
}

export default async function ControlDrilldown({
  params,
  searchParams,
}: {
  params: Promise<{ controlId: string }>;
  searchParams: Promise<{ tenantId?: string; slaHours?: string; framework?: 'iso27001' | 'soc2' }>;
}) {
  const p = await params;
  const sp = await searchParams;
  const tenantId = sp.tenantId || 'demo-tenant';
  const framework = (sp.framework || 'iso27001') as 'iso27001' | 'soc2';
  const controlId = decodeURIComponent(p.controlId);
  const slaHours = Math.max(1, Math.min(24 * 30, Number(sp.slaHours || 72)));

  const summary = await getJson(
    `controls/${encodeURIComponent(controlId)}/summary?tenantId=${encodeURIComponent(tenantId)}&framework=${encodeURIComponent(framework)}&slaHours=${encodeURIComponent(
      String(slaHours)
    )}`,
    tenantId
  ).catch(() => null);
  const evidence = await getJson(
    `controls/${encodeURIComponent(controlId)}/evidence?tenantId=${encodeURIComponent(tenantId)}&framework=${encodeURIComponent(framework)}&limit=200`,
    tenantId
  ).catch(() => null);
  const signals = await getJson(
    `controls/${encodeURIComponent(controlId)}/signals?tenantId=${encodeURIComponent(tenantId)}&framework=${encodeURIComponent(framework)}&range=30d&limit=50`,
    tenantId
  ).catch(() => null);

  return (
    <main style={{ padding: 18 }}>
      <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <a
          href={`/controls?tenantId=${encodeURIComponent(tenantId)}&framework=${encodeURIComponent(framework)}&slaHours=${encodeURIComponent(String(slaHours))}`}
          style={{ textDecoration: 'none' }}
        >
          ← Back to controls
        </a>
        <a href={`/dashboard?tenantId=${encodeURIComponent(tenantId)}&slaHours=${encodeURIComponent(String(slaHours))}`} style={{ textDecoration: 'none' }}>
          Dashboard
        </a>
      </div>

      <ControlDrilldownClient
        tenantId={tenantId}
        controlId={controlId}
        framework={framework}
        slaHours={slaHours}
        initialSummary={summary}
        initialEvidence={evidence?.currentEvidence || evidence?.items || []}
        initialSignals={signals?.items || []}
      />
    </main>
  );
}

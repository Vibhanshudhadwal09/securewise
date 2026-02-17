import React from 'react';
import { DlqClient } from '../../../components/DlqClient';
import { apiFetch } from '../../../lib/server-api';

async function getJson(path: string, tenantId?: string) {
  const res = await apiFetch(path, { tenantId: tenantId || 'demo-tenant' });
  return res.json();
}

export default async function DeadLetter() {
  const tenantId = 'demo-tenant';
  const data = await getJson('enforcement-jobs?status=FAILED', tenantId);

  return (
    <main style={{ padding: 24 }}>
      <h1>Dead-letter Queue</h1>
      <p style={{ opacity: 0.75 }}>
        Failed enforcement jobs (terminal after retries). Use Retry to re-queue for execution. (audit-only default)
      </p>

      <DlqClient tenantId={tenantId} initialJobs={data.items || []} />
    </main>
  );
}

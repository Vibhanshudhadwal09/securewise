import React from 'react';
import { EndpointSectionClient } from '../EndpointSectionClient';

export default async function EndpointCompliancePage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const p = await params;
  const assetId = decodeURIComponent(String(p.assetId || ''));
  return <EndpointSectionClient assetId={assetId} title="Compliance (signals)" mode="configuration" />;
}


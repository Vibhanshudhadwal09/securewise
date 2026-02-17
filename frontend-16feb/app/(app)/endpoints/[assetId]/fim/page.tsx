import React from 'react';
import { EndpointSectionClient } from '../EndpointSectionClient';

export default async function EndpointFimPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const p = await params;
  const assetId = decodeURIComponent(String(p.assetId || ''));
  return <EndpointSectionClient assetId={assetId} title="File Integrity Monitoring (FIM)" mode="fim" />;
}


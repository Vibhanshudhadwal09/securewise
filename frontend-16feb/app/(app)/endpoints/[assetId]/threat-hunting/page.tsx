import React from 'react';
import { EndpointSectionClient } from '../EndpointSectionClient';

export default async function EndpointThreatHuntingPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const p = await params;
  const assetId = decodeURIComponent(String(p.assetId || ''));
  return <EndpointSectionClient assetId={assetId} title="Threat Hunting" mode="threat-hunting" />;
}


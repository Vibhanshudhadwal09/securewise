/**
 * Asset type definition matching agent/endpoint inventory shape.
 */
export interface Asset {
  agent_id: string;
  hostname: string;
  os: string;
  ip: string;
  status: 'active' | 'inactive' | 'disconnected';
  version: string;
  risks: string | null;
  last_seen?: Date;
}

/**
 * Props for AssetSelector component.
 */
export interface AssetSelectorProps {
  currentAssetId?: string;
  assets: Asset[];
  onAssetSelect: (assetId: string) => void;
  recentAssets?: string[];
}

/**
 * Recent asset stored in localStorage.
 */
export interface RecentAsset {
  agent_id: string;
  hostname: string;
  timestamp: number;
}


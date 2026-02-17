'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Asset, AssetSelectorProps } from '@/types/asset';

function statusDot(status: Asset['status']) {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'inactive':
      return 'bg-red-500';
    case 'disconnected':
    default:
      return 'bg-gray-400';
  }
}

export default function AssetSelector({ currentAssetId, assets, onAssetSelect, recentAssets = [] }: AssetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const currentAsset = useMemo(() => assets.find((a) => a.agent_id === currentAssetId) || null, [assets, currentAssetId]);
  const recentAssetsList = useMemo(() => assets.filter((a) => recentAssets.includes(a.agent_id)), [assets, recentAssets]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => a.hostname.toLowerCase().includes(q) || String(a.ip || '').includes(q));
  }, [assets, searchQuery]);

  const handleSelect = (assetId: string) => {
    onAssetSelect(assetId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg hover:border-blue-400 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="text-gray-600">Asset</span>
        <span className="font-medium text-gray-900">{currentAsset ? currentAsset.hostname : 'Select Asset'}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-xs text-gray-400 ml-2">⌘K</span>
      </button>

      {isOpen ? (
        <div className="absolute top-full left-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border-2 border-gray-200 rounded-lg shadow-2xl z-50 max-h-[500px] overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search assets by hostname or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1">
            {!searchQuery && recentAssetsList.length > 0 ? (
              <div className="p-3 border-b border-gray-200">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Recently Viewed</div>
                {recentAssetsList.map((asset) => (
                  <button
                    key={asset.agent_id}
                    onClick={() => handleSelect(asset.agent_id)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusDot(asset.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{asset.hostname}</span>
                        {asset.agent_id === currentAssetId ? <span className="text-blue-600 text-xs">Current</span> : null}
                      </div>
                      <div className="text-xs text-gray-500">{asset.ip}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="p-3">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">All Assets ({filteredAssets.length})</div>
              {filteredAssets.length ? (
                filteredAssets.map((asset) => (
                  <button
                    key={asset.agent_id}
                    onClick={() => handleSelect(asset.agent_id)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-blue-50 transition-colors text-left"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelect(asset.agent_id);
                    }}
                  >
                    <div className={`w-2 h-2 rounded-full ${statusDot(asset.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{asset.hostname}</span>
                        {asset.agent_id === currentAssetId ? <span className="text-blue-600 text-xs">Current</span> : null}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {asset.ip} • {asset.os} • {asset.version}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">No assets found matching &quot;{searchQuery}&quot;</div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-gray-200">
            <button
              onClick={() => {
                router.push('/assets');
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              View All Assets →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


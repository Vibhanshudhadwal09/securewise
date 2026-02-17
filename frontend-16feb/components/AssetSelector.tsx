'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Asset, AssetSelectorProps } from '@/types/asset';

function statusDot(status: Asset['status']) {
  switch (status) {
    case 'active':
      return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]';
    case 'inactive':
      return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    case 'disconnected':
    default:
      return 'bg-gray-500 opacity-50';
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
        className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(15,23,42,0.6)] border border-[var(--card-border)] rounded-md hover:border-[var(--accent-blue)] transition-all focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)] h-[32px] min-w-[180px]"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span className="text-[var(--text-tertiary)] text-xs uppercase tracking-wide">Asset</span>
        <span className="font-medium text-[var(--text-primary)] truncate max-w-[140px]">
          {currentAsset ? currentAsset.hostname : 'Select Asset'}
        </span>
        <svg
          className={`w-3 h-3 text-[var(--text-secondary)] ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen ? (
        <div className="absolute top-full left-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-[var(--card-bg)] backdrop-blur-xl border border-[var(--card-border)] rounded-lg shadow-2xl z-50 max-h-[500px] overflow-hidden flex flex-col animate-fadeIn">
          <div className="p-3 border-b border-[var(--card-border)]">
            <input
              type="text"
              placeholder="Search assets by hostname or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-[rgba(15,23,42,0.6)] border border-[var(--card-border)] rounded-md focus:outline-none focus:border-[var(--accent-blue)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {!searchQuery && recentAssetsList.length > 0 ? (
              <div className="p-3 border-b border-[var(--card-border)]">
                <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2 tracking-wider">Recently Viewed</div>
                {recentAssetsList.map((asset) => (
                  <button
                    key={asset.agent_id}
                    onClick={() => handleSelect(asset.agent_id)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[rgba(59,130,246,0.1)] transition-colors text-left group"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusDot(asset.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-blue)]">{asset.hostname}</span>
                        {asset.agent_id === currentAssetId ? <span className="text-[var(--accent-blue)] text-[10px] bg-[rgba(59,130,246,0.1)] px-1.5 py-0.5 rounded border border-[var(--accent-blue)]/20">Current</span> : null}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">{asset.ip}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="p-3">
              <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase mb-2 tracking-wider">All Assets ({filteredAssets.length})</div>
              {filteredAssets.length ? (
                filteredAssets.map((asset) => (
                  <button
                    key={asset.agent_id}
                    onClick={() => handleSelect(asset.agent_id)}
                    className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-[rgba(59,130,246,0.1)] transition-colors text-left group"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelect(asset.agent_id);
                    }}
                  >
                    <div className={`w-2 h-2 rounded-full ${statusDot(asset.status)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent-blue)]">{asset.hostname}</span>
                        {asset.agent_id === currentAssetId ? <span className="text-[var(--accent-blue)] text-[10px] bg-[rgba(59,130,246,0.1)] px-1.5 py-0.5 rounded border border-[var(--accent-blue)]/20">Current</span> : null}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">
                        {asset.ip} <span className="text-[var(--text-tertiary)] mx-1">•</span> {asset.os} <span className="text-[var(--text-tertiary)] mx-1">•</span> {asset.version}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--text-tertiary)] text-sm">No assets found matching &quot;{searchQuery}&quot;</div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-[var(--card-border)] bg-[rgba(15,23,42,0.3)]">
            <button
              onClick={() => {
                router.push('/assets');
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-sm text-[var(--accent-blue)] hover:bg-[rgba(59,130,246,0.1)] rounded-md transition-colors font-medium border border-transparent hover:border-[var(--accent-blue)]/30"
            >
              View All Assets →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


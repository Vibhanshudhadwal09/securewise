'use client';
 
import React, { useEffect, useMemo, useState } from 'react';
 
type TimelineItem = { ts: string; count: number };
 
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
 
function SvgBars(props: { items: TimelineItem[]; width?: number; height?: number }) {
  const width = props.width ?? 720;
  const height = props.height ?? 140;
  const pad = 18;
  const items = props.items || [];
  const maxVal = Math.max(1, ...items.map((i) => Number(i.count || 0)));
 
  const innerW = Math.max(1, width - pad * 2);
  const innerH = Math.max(1, height - pad * 2);
  const n = Math.max(1, items.length);
  const gap = 2;
  const barW = Math.max(1, Math.floor((innerW - gap * (n - 1)) / n));
 
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      <g transform={`translate(${pad},${pad})`}>
        <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#e5e5e5" />
        {items.map((it, idx) => {
          const v = Number(it.count || 0);
          const h = Math.round((v / maxVal) * innerH);
          const x = idx * (barW + gap);
          const y = innerH - h;
          const title = `${String(it.ts)} • ${v}`;
          return (
            <g key={String(it.ts)}>
              <title>{title}</title>
              <rect x={x} y={y} width={barW} height={h} rx={2} fill="#4f87ff" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
 
export function WazuhTimelineClient(props: { tenantId: string; range?: string; interval?: string; refreshSeconds?: number }) {
  const tenantId = props.tenantId || 'demo-tenant';
  const range = props.range || '24h';
  const refreshSeconds = clamp(Number(props.refreshSeconds || 30), 5, 600);
 
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'ok' | 'err'>('idle');
 
  const url = useMemo(() => `/api/security-signals/timeline?tenantId=${encodeURIComponent(tenantId)}&range=${encodeURIComponent(range)}`, [tenantId, range]);
 
  useEffect(() => {
    let stop = false;
    let timer: any = null;
 
    async function tick() {
      try {
        const res = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          headers: { 'x-tenant-id': tenantId },
          cache: 'no-store',
        });
        const j = await res.json().catch(() => null);
        if (!stop) {
          if (res.ok && Array.isArray(j?.points)) {
            setItems((j.points || []) as TimelineItem[]);
            setStatus('ok');
          } else {
            setStatus('err');
          }
        }
      } catch {
        if (!stop) setStatus('err');
      }
 
      if (!stop) timer = setTimeout(tick, refreshSeconds * 1000);
    }
 
    tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [tenantId, url, refreshSeconds]);
 
  return (
    <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10, minWidth: 760 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Signals timeline ({range})</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          auto-refresh: {refreshSeconds}s • {status === 'ok' ? 'live' : status === 'err' ? 'error' : 'loading'}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <SvgBars items={items} />
      </div>
    </div>
  );
}

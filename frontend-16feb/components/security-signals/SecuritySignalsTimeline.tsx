'use client';

import React, { useMemo } from 'react';
import { Card, Skeleton } from 'antd';
import { Column } from '@ant-design/plots';
import dayjs from 'dayjs';
import type { SecuritySignalsTimeline } from './types';

function isoLabel(ts: any): string {
  const s = String(ts || '');
  if (!s) return '';
  try {
    const d = new Date(s);
    if (Number.isFinite(d.getTime())) return d.toISOString().replace('T', ' ').replace('Z', '');
  } catch {
    // ignore
  }
  return s;
}

export function SecuritySignalsTimelineChart(props: {
  title?: string;
  range: string;
  timeline: SecuritySignalsTimeline | null | undefined;
  loading: boolean;
  onBucketClick?: (fromIso: string, toIso: string) => void;
}) {
  const timelineData = useMemo(() => {
    const items = (props.timeline?.points || []) as any[];
    return items.map((i: any) => ({
      ts: String(i.ts || ''),
      label: dayjs(String(i.ts || '')).isValid() ? dayjs(String(i.ts || '')).format(props.range === '1h' ? 'HH:mm' : 'MM-DD HH:mm') : isoLabel(i.ts || ''),
      count: Number(i.count || 0),
    }));
  }, [props.timeline, props.range]);

  return (
    <Card size="small" title={props.title || 'Signal trend'} bodyStyle={{ padding: 6 }}>
      {props.loading ? (
        <Skeleton active />
      ) : (
        <Column
          data={timelineData}
          xField="label"
          yField="count"
          height={240}
          xAxis={{ label: { autoRotate: true, autoHide: true } }}
          tooltip={{ showMarkers: false }}
          meta={{ label: { alias: 'time' }, count: { alias: 'signals' } }}
          onReady={(plot) => {
            plot.on('element:click', (evt: any) => {
              const d = evt?.data?.data;
              const ts = String(d?.ts || '');
              if (!ts || !props.onBucketClick) return;
              const start = new Date(ts).toISOString();
              const interval = props.timeline?.interval || '1h';
              const ms = interval === '1h' ? 3_600_000 : interval === '6h' ? 6 * 3_600_000 : 24 * 3_600_000;
              const end = new Date(new Date(ts).getTime() + ms).toISOString();
              props.onBucketClick(start, end);
            });
          }}
        />
      )}
    </Card>
  );
}


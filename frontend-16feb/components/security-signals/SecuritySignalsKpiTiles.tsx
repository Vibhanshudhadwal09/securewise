'use client';

import React, { useMemo } from 'react';
import { Card, Skeleton, Statistic } from 'antd';
import type { SecuritySignalsSummary } from './types';
import styles from './SecuritySignalsKpiTiles.module.css';
import HelpTooltip from '@/components/help/Tooltip';
import { helpContent } from '@/config/helpContent';

export function SecuritySignalsKpiTiles(props: {
  summary: SecuritySignalsSummary | null | undefined;
  loading: boolean;
  rangeLabel: string;
  onClickSeverity?: (band: 'critical' | 'high' | 'medium' | 'low') => void;
  onClickFramework?: (framework: 'CIS' | 'PCI' | 'GDPR') => void;
}) {
  const sev = props.summary?.severity;
  const tiles = useMemo(
    () => [
      { key: 'total', title: `Total signals (${props.rangeLabel})`, value: Number(props.summary?.alertsTotal || 0) },
      { key: 'critical', title: 'Critical', value: Number(sev?.critical || 0), band: 'critical' as const },
      { key: 'high', title: 'High', value: Number(sev?.high || 0), band: 'high' as const },
      { key: 'medium', title: 'Medium', value: Number(sev?.medium || 0), band: 'medium' as const },
      { key: 'low', title: 'Low', value: Number(sev?.low || 0), band: 'low' as const },
      { key: 'cis', title: 'CIS failures', value: Number(props.summary?.cisFailures || 0), fw: 'CIS' as const },
      { key: 'mitre', title: 'MITRE tactics', value: Number(props.summary?.mitreTactics || 0) },
      {
        key: 'fresh',
        title: 'Signals freshness (hours)',
        value:
          props.summary?.evidenceFreshnessHours === null || props.summary?.evidenceFreshnessHours === undefined
            ? '-'
            : Number(props.summary.evidenceFreshnessHours).toFixed(1),
      },
    ],
    [props.rangeLabel, props.summary, sev]
  );

  return (
    <div className={styles.grid}>
      {tiles.map((t) => (
        <div key={t.key} className={styles.tile}>
          <HelpTooltip content={helpContent.dashboard.kpis.content} className="w-full">
            <div>
              <Card>
                {props.loading ? (
                  <Skeleton active paragraph={false} />
                ) : (
                  <div
                    style={{ cursor: t.band || t.fw ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (t.band && props.onClickSeverity) props.onClickSeverity(t.band);
                      if (t.fw && props.onClickFramework) props.onClickFramework(t.fw);
                    }}
                  >
                    <Statistic title={t.title} value={t.value as any} />
                  </div>
                )}
              </Card>
            </div>
          </HelpTooltip>
        </div>
      ))}
    </div>
  );
}


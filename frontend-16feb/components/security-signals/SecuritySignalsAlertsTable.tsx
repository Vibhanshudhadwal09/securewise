'use client';

import React, { useMemo } from 'react';
import { Button, Input, Space, Table, Tooltip, Typography, Tag } from 'antd';
import type { TableColumnsType } from 'antd';
import type { SecuritySignalsAlertItem } from './types';

function severityColor(level: number | undefined): string {
  const n = Number(level || 0);
  if (n >= 12) return 'red';
  if (n >= 8) return 'volcano';
  if (n >= 5) return 'gold';
  if (n >= 3) return 'blue';
  return 'default';
}

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

export function SecuritySignalsAlertsTable(props: {
  items: SecuritySignalsAlertItem[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  search: string;
  onSearchChange: (next: string) => void;
  onRowClick?: (row: SecuritySignalsAlertItem) => void;
}) {
  const columns: TableColumnsType<SecuritySignalsAlertItem> = useMemo(
    () => [
      {
        title: 'Timestamp',
        dataIndex: 'timestamp',
        width: 210,
        sorter: (a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')),
        render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{isoLabel(v)}</Typography.Text>,
      },
      {
        title: 'Agent',
        dataIndex: 'agent',
        width: 200,
        render: (v) => <Typography.Text style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{String(v || '-')}</Typography.Text>,
      },
      {
        title: 'Severity',
        dataIndex: 'severity',
        width: 110,
        sorter: (a, b) => Number(a?.severity || 0) - Number(b?.severity || 0),
        render: (v) => <Tag color={severityColor(Number(v))}>{String(v ?? '') || '-'}</Tag>,
      },
      {
        title: 'Rule',
        dataIndex: 'rule',
        width: 320,
        render: (v) => <Typography.Text>{String(v || '').slice(0, 90)}</Typography.Text>,
      },
      {
        title: 'Frameworks',
        dataIndex: 'frameworks',
        width: 160,
        render: (v: any) => {
          const arr = Array.isArray(v) ? v : [];
          return arr.length ? (
            <Space wrap size={[4, 4]}>
              {arr.slice(0, 4).map((x: string) => (
                <Tag key={x}>{x}</Tag>
              ))}
            </Space>
          ) : (
            <Typography.Text type="secondary">-</Typography.Text>
          );
        },
      },
      {
        title: 'Message',
        dataIndex: 'message',
        render: (v: any) => {
          const msg = String(v || '');
          return (
            <Tooltip title={msg} placement="topLeft">
              <Typography.Text>{msg.slice(0, 140)}</Typography.Text>
            </Tooltip>
          );
        },
      },
    ],
    []
  );

  return (
    <div>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Input.Search
          placeholder="Search signals (agent, rule id, message...)"
          allowClear
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          style={{ width: 520, maxWidth: '100%' }}
        />
        <Typography.Text type="secondary">Showing {props.items.length} signals</Typography.Text>
      </Space>

      <div style={{ marginTop: 12 }}>
        <Table<SecuritySignalsAlertItem>
          rowKey={(_, i) => String(i)}
          columns={columns}
          dataSource={props.items}
          loading={props.loading}
          size="middle"
          pagination={{ pageSize: 25, showSizeChanger: true, pageSizeOptions: [10, 25, 50, 100, 200] }}
          onRow={(rec) => ({
            onClick: () => {
              if (props.onRowClick) props.onRowClick(rec);
            },
          })}
        />
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Text type="secondary">{props.hasMore ? 'More available' : 'No more'}</Typography.Text>
          <Button disabled={props.loading || !props.hasMore} onClick={props.onLoadMore}>
            {props.loading ? 'Loading…' : props.hasMore ? 'Load more' : 'No more'}
          </Button>
        </div>
      </div>
    </div>
  );
}


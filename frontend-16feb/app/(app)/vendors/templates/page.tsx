'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { Card, List, Space, Tag, Typography } from 'antd';

function readCookie(name: string): string | null {
  const cur = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
  return json;
}

export default function VendorTemplatesPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const { data } = useSWR(`/api/vendors/templates`, (u) => fetchJson(u, tenantId), { refreshInterval: 60_000, revalidateOnFocus: false });
  const items: any[] = Array.isArray((data as any)?.items) ? (data as any).items : [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assessment Templates</h1>
          <p className="text-sm text-gray-600">Pre-built templates you can use when starting a vendor assessment.</p>
        </div>
        <a href="/vendors">Back to vendors</a>
      </div>

      <Card>
        <List
          dataSource={items}
          renderItem={(it: any) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space wrap>
                    <span style={{ fontWeight: 700 }}>{String(it.name || it.id)}</span>
                    <Tag>{String(it.id)}</Tag>
                    {it.questions != null ? <Tag color="blue">{`${Number(it.questions)} questions`}</Tag> : null}
                  </Space>
                }
                description={<Typography.Text type="secondary">{String(it.description || '')}</Typography.Text>}
              />
            </List.Item>
          )}
        />
        {!items.length ? <Typography.Text type="secondary">No templates yet.</Typography.Text> : null}
      </Card>
    </div>
  );
}


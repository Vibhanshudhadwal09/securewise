'use client';

import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Button, Card, Collapse, Input, Select, Space, Tag, Typography, message } from 'antd';
import { useParams } from 'next/navigation';
import { SubmitForApprovalButton } from '../../../../../../components/common/SubmitForApprovalButton';

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

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export default function VendorAssessmentPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const params = useParams<{ vendorId: string; assessmentId: string }>();
  const vendorId = String((params as any)?.vendorId || '');
  const assessmentId = String((params as any)?.assessmentId || '');

  const { data, mutate } = useSWR(assessmentId ? `/api/assessments/${encodeURIComponent(assessmentId)}` : null, (u) => fetchJson(u as any, tenantId), {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  });

  const assessment = (data as any)?.assessment || null;
  const vendor = (data as any)?.vendor || null;
  const [saving, setSaving] = useState(false);

  const questionnaire = assessment?.questionnaire && typeof assessment.questionnaire === 'object' ? assessment.questionnaire : {};
  const sections: any[] = Array.isArray(questionnaire.sections) ? questionnaire.sections : [];

  async function save(nextQ: any) {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({ questionnaire: nextQ }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      message.success('Saved');
      mutate();
    } catch (e: any) {
      message.error(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      message.success('Submitted for review');
      mutate();
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setSaving(true);
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String(json?.error || `HTTP ${res.status}`));
      message.success('Approved');
      mutate();
    } finally {
      setSaving(false);
    }
  }

  if (!assessment) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Typography.Text type="secondary">Loading assessment…</Typography.Text>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{String(assessment.assessment_name || 'Assessment')}</h1>
          <Space wrap style={{ marginTop: 6 }}>
            {vendor?.vendor_name ? <Tag>{String(vendor.vendor_name)}</Tag> : null}
            <Tag>{String(assessment.assessment_type || '')}</Tag>
            <Tag>{String(assessment.assessment_status || '')}</Tag>
            <Tag color="blue">{`${Number(assessment.completion_percentage || 0).toFixed(2)}% complete`}</Tag>
            {assessment.risk_score != null ? <Tag color={Number(assessment.risk_score) >= 15 ? 'red' : Number(assessment.risk_score) >= 10 ? 'orange' : 'green'}>{`Risk ${Number(assessment.risk_score).toFixed(2)} / 25`}</Tag> : null}
          </Space>
        </div>
        <Space>
          <SubmitForApprovalButton
            entityType="vendor"
            entityId={String(assessment.id)}
            entityTitle={`${vendor?.vendor_name || 'Vendor'} assessment`}
            entityDescription={String(assessment.assessment_name || '')}
            tenantId={tenantId}
          />
          <Button href={`/vendors/${encodeURIComponent(vendorId)}`}>Back</Button>
          <Button onClick={() => save(questionnaire)} loading={saving}>
            Save Draft
          </Button>
          <Button onClick={submit} loading={saving}>
            Submit
          </Button>
          <Button type="primary" onClick={approve} loading={saving}>
            Approve
          </Button>
        </Space>
      </div>

      <Card title="Questionnaire">
        <Collapse
          items={sections.map((s: any, idx: number) => ({
            key: String(idx),
            label: `${String(s.section_name || `Section ${idx + 1}`)} (${Array.isArray(s.questions) ? s.questions.length : 0} questions)`,
            children: (
              <div style={{ display: 'grid', gap: 14 }}>
                {(Array.isArray(s.questions) ? s.questions : []).map((q: any, qi: number) => {
                  const qId = String(q.id || `q${qi + 1}`);
                  return (
                    <Card key={qId} size="small" style={{ background: '#fafafa' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>{String(q.question || '')}</div>
                      <Space wrap>
                        <span>Answer:</span>
                        <Select
                          style={{ width: 160 }}
                          value={q.answer || ''}
                          options={[{ value: '', label: 'Select' }, { value: 'Yes' }, { value: 'Partially' }, { value: 'No' }, { value: 'N/A' }]}
                          onChange={(v) => {
                            const next = deepClone(questionnaire);
                            next.sections[idx].questions[qi].answer = v;
                            save(next);
                          }}
                        />
                        <Tag>{String(q.category || s.category || 'security')}</Tag>
                      </Space>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        <Input
                          placeholder="Evidence (text reference)"
                          value={q.evidence || ''}
                          onChange={(e) => {
                            const next = deepClone(questionnaire);
                            next.sections[idx].questions[qi].evidence = e.target.value;
                            save(next);
                          }}
                        />
                        <Input.TextArea
                          rows={2}
                          placeholder="Comments"
                          value={q.comments || ''}
                          onChange={(e) => {
                            const next = deepClone(questionnaire);
                            next.sections[idx].questions[qi].comments = e.target.value;
                            save(next);
                          }}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            ),
          }))}
        />
        {!sections.length ? <Typography.Text type="secondary">No questionnaire loaded for this assessment.</Typography.Text> : null}
      </Card>
    </div>
  );
}


/* eslint-disable no-console */
'use client';

import React from 'react';
import { message } from 'antd';
import { RiskForm, type RiskFormValue } from './RiskForm';

export function RiskModal(props: {
  isOpen: boolean;
  title: string;
  tenantId: string;
  mode: 'create' | 'edit';
  initial?: Partial<RiskFormValue>;
  riskId?: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  async function submit(value: RiskFormValue) {
    const isEdit = props.mode === 'edit';
    const payload: any = {
      title: value.title,
      description: value.description,
      category: value.category,
      status: value.status,
      inherentImpact: value.inherentImpact,
      inherentLikelihood: value.inherentLikelihood,
      residualImpact: value.residualImpact || undefined,
      residualLikelihood: value.residualLikelihood || undefined,
      owner: value.owner,
      // backend supports both `strategy` and `treatment`
      strategy: value.strategy,
      treatmentPlan: value.treatmentPlan || undefined,
      targetDate: value.targetDate || undefined,
      affectedAssets: value.affectedAssets || undefined,
    };

    const url = isEdit ? `/api/risks/${encodeURIComponent(String(props.riskId || ''))}` : '/api/risks';
    const method = isEdit ? 'PUT' : 'POST';

    const toastKey = 'risk_save';
    message.loading({ content: isEdit ? 'Saving risk…' : 'Creating risk…', key: toastKey, duration: 0 });
    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': props.tenantId },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error || j?.message || `HTTP ${res.status}`);

      message.success({ content: isEdit ? 'Risk updated successfully!' : 'Risk created successfully!', key: toastKey });
      await props.onSuccess();
      props.onClose();
    } catch (e: any) {
      console.log('[RiskModal] submit failed', e);
      message.error({ content: String(e?.message || 'Failed to save risk'), key: toastKey });
      throw e;
    }
  }

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">{props.title}</div>
            <div className="text-xs text-gray-600">Required fields are marked with *</div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold"
            onClick={props.onClose}
          >
            Close
          </button>
        </div>
        <div className="px-6 py-5">
          <RiskForm mode={props.mode} initial={props.initial} onCancel={props.onClose} onSubmit={submit} />
        </div>
      </div>
    </div>
  );
}


'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Treatment = {
  id: string;
  treatment_type: string;
  status: string;
  treatment_plan: string;
  justification?: string;
  progress_percentage: number;
  responsible_person?: string;
  due_date?: string;
  linked_controls?: any[];
};

function readCookie(name: string): string | null {
  const cur = String(document.cookie || '')
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

async function fetchJson(url: string, tenantId: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId, ...(init?.headers || {}) },
    cache: 'no-store',
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
  return json as any;
}

function treatmentBadgeColor(type: string) {
  if (type === 'mitigate') return 'bg-blue-500';
  if (type === 'accept') return 'bg-gray-500';
  if (type === 'transfer') return 'bg-purple-500';
  if (type === 'avoid') return 'bg-red-500';
  return 'bg-gray-500';
}

function statusVariant(status: string) {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'warning';
  if (status === 'cancelled') return 'danger';
  return 'neutral';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function RiskTreatmentPage() {
  const params = useParams();
  const riskId = String(params?.riskId || '');
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [showNewTreatment, setShowNewTreatment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTreatment, setNewTreatment] = useState({
    treatmentType: 'mitigate',
    treatmentPlan: '',
    justification: '',
    costEstimate: '',
    responsiblePerson: '',
    dueDate: '',
  });

  useEffect(() => {
    if (!isUuid(riskId)) {
      setError('Invalid risk ID. Open a risk from the risk register.');
      setTreatments([]);
      setLoading(false);
      return;
    }
    void fetchTreatments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riskId]);

  async function fetchTreatments() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchJson(`/api/risk-treatments/risk/${encodeURIComponent(riskId)}`, tenantId);
      setTreatments(Array.isArray(data?.treatments) ? data.treatments : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load treatments');
    } finally {
      setLoading(false);
    }
  }

  async function createTreatment() {
    try {
      setError(null);
      await fetchJson('/api/risk-treatments', tenantId, {
        method: 'POST',
        body: JSON.stringify({
          riskId,
          treatmentType: newTreatment.treatmentType,
          treatmentPlan: newTreatment.treatmentPlan,
          justification: newTreatment.justification || undefined,
          costEstimate: Number(newTreatment.costEstimate || 0),
          responsiblePerson: newTreatment.responsiblePerson || undefined,
          dueDate: newTreatment.dueDate || undefined,
        }),
      });
      setShowNewTreatment(false);
      setNewTreatment({
        treatmentType: 'mitigate',
        treatmentPlan: '',
        justification: '',
        costEstimate: '',
        responsiblePerson: '',
        dueDate: '',
      });
      await fetchTreatments();
    } catch (e: any) {
      setError(e?.message || 'Failed to create treatment');
    }
  }

  async function updateProgress(treatmentId: string, progress: number, updateText: string) {
    try {
      await fetchJson(`/api/risk-treatments/${encodeURIComponent(treatmentId)}/progress`, tenantId, {
        method: 'PUT',
        body: JSON.stringify({ progress, updateText }),
      });
      await fetchTreatments();
    } catch (e: any) {
      setError(e?.message || 'Failed to update progress');
    }
  }

  if (loading) return <div className="p-8">Loading risk treatments...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Treatment Workflow</h1>
          <p className="text-gray-600 mt-2">Manage risk treatment actions and track progress</p>
        </div>
        <Button onClick={() => setShowNewTreatment(true)}>+ Add Treatment</Button>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl font-semibold">M</div>
            <div>
              <div className="font-semibold">Mitigate</div>
              <div className="text-xs text-gray-600">Reduce likelihood/impact</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center text-white text-xl font-semibold">A</div>
            <div>
              <div className="font-semibold">Accept</div>
              <div className="text-xs text-gray-600">Acknowledge & monitor</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xl font-semibold">T</div>
            <div>
              <div className="font-semibold">Transfer</div>
              <div className="text-xs text-gray-600">Insurance/outsource</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-red-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center text-white text-xl font-semibold">V</div>
            <div>
              <div className="font-semibold">Avoid</div>
              <div className="text-xs text-gray-600">Eliminate activity</div>
            </div>
          </div>
        </Card>
      </div>

      {showNewTreatment ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Create Treatment Plan</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Treatment Type</label>
              <select
                value={newTreatment.treatmentType}
                onChange={(e) => setNewTreatment({ ...newTreatment, treatmentType: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="mitigate">Mitigate - Implement controls to reduce risk</option>
                <option value="accept">Accept - Accept risk within tolerance</option>
                <option value="transfer">Transfer - Insurance or third-party</option>
                <option value="avoid">Avoid - Eliminate risk-causing activity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Treatment Plan</label>
              <textarea
                value={newTreatment.treatmentPlan}
                onChange={(e) => setNewTreatment({ ...newTreatment, treatmentPlan: e.target.value })}
                className="w-full border rounded px-3 py-2 h-24"
                placeholder="Describe the treatment plan and specific actions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Justification</label>
              <textarea
                value={newTreatment.justification}
                onChange={(e) => setNewTreatment({ ...newTreatment, justification: e.target.value })}
                className="w-full border rounded px-3 py-2 h-20"
                placeholder="Why this treatment approach is appropriate..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Estimated Cost</label>
                <input
                  type="number"
                  value={newTreatment.costEstimate}
                  onChange={(e) => setNewTreatment({ ...newTreatment, costEstimate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Responsible Person</label>
                <input
                  type="text"
                  value={newTreatment.responsiblePerson}
                  onChange={(e) => setNewTreatment({ ...newTreatment, responsiblePerson: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="email@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Due Date</label>
                <input
                  type="date"
                  value={newTreatment.dueDate}
                  onChange={(e) => setNewTreatment({ ...newTreatment, dueDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={createTreatment}>Create Treatment Plan</Button>
              <Button onClick={() => setShowNewTreatment(false)} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="space-y-4">
        {treatments.length === 0 ? (
          <Card className="p-6 text-center text-sm text-gray-600">No treatments created yet.</Card>
        ) : (
          treatments.map((treatment) => (
            <Card key={treatment.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 ${treatmentBadgeColor(treatment.treatment_type)} text-white rounded-lg font-semibold`}>
                    {treatment.treatment_type.toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-lg">{treatment.treatment_plan?.slice(0, 60) || 'Treatment Plan'}</div>
                    <div className="text-sm text-gray-600">Responsible: {treatment.responsible_person || 'Unassigned'}</div>
                  </div>
                </div>
                <Badge variant={statusVariant(treatment.status)}>{treatment.status.replace('_', ' ').toUpperCase()}</Badge>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-semibold">{treatment.progress_percentage || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${treatmentBadgeColor(treatment.treatment_type)} h-3 rounded-full transition-all`}
                    style={{ width: `${treatment.progress_percentage || 0}%` }}
                  />
                </div>
              </div>

              {treatment.justification ? (
                <div className="text-sm text-gray-600 mb-3">
                  <strong>Justification:</strong> {treatment.justification}
                </div>
              ) : null}

              {treatment.linked_controls && treatment.linked_controls.length > 0 ? (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <div className="text-sm font-semibold mb-2">Linked Controls:</div>
                  <div className="flex flex-wrap gap-2">
                    {treatment.linked_controls.map((c: any) => (
                      <Badge key={c.control_id} variant="info">
                        {c.control_code} - {String(c.control_title || '').slice(0, 30)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex gap-3 mt-4">
                <Button
                  size="sm"
                  onClick={() => {
                    const progress = window.prompt('Enter progress (0-100):', String(treatment.progress_percentage || 0));
                    const update = window.prompt('Update description:');
                    if (progress && update) {
                      updateProgress(treatment.id, Number(progress), update);
                    }
                  }}
                >
                  Update Progress
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

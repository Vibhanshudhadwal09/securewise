'use client';

import { useEffect, useState } from 'react';
import { useCompliance } from '@/contexts/ComplianceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AuditPeriod {
  period_id: string;
  framework: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'active' | 'closed';
  created_at: string;
}

export default function AuditPeriodsPage() {
  const { framework, refreshPeriods } = useCompliance();
  const [periods, setPeriods] = useState<AuditPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework]);

  async function loadPeriods() {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit-periods?framework=${framework}`, {
        credentials: 'include',
      });
      const data = await res.json();
      setPeriods(data.items || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load periods:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(periodId: string, newStatus: string) {
    try {
      const res = await fetch(`/api/audit-periods/${periodId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update period');
      await loadPeriods();
      await refreshPeriods();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update period:', err);
      alert('Failed to update period status');
    }
  }

  async function handleDelete(periodId: string) {
    if (!confirm('Are you sure you want to delete this audit period?')) return;

    try {
      const res = await fetch(`/api/audit-periods/${periodId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Failed to delete period');
      await loadPeriods();
      await refreshPeriods();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete period:', err);
      alert('Failed to delete period');
    }
  }

  const statusColors: Record<string, string> = {
    planned: 'bg-slate-100 text-slate-600 border-slate-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    closed: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  if (loading) {
    return <div className="p-8">Loading audit periods...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Periods</h1>
          <p className="text-sm text-slate-600 mt-1">Manage compliance audit periods for {framework.toUpperCase()}</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create Period</Button>
      </div>

      <div className="grid gap-4">
        {periods.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            No audit periods defined for this framework.
            <br />
            Click "Create Period" to get started.
          </Card>
        ) : (
          periods.map((period) => (
            <Card key={period.period_id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{period.name}</h3>
                    <Badge className={statusColors[period.status]}>{period.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {new Date(period.starts_at).toLocaleDateString()} to {new Date(period.ends_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {period.status === 'planned' ? (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(period.period_id, 'active')}>
                      Activate
                    </Button>
                  ) : null}
                  {period.status === 'active' ? (
                    <Button variant="outline" size="sm" onClick={() => handleStatusChange(period.period_id, 'closed')}>
                      Close Period
                    </Button>
                  ) : null}
                  {period.status === 'closed' ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleStatusChange(period.period_id, 'active')}>
                        Reopen
                      </Button>
                    </>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(period.period_id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <CreatePeriodModal
        framework={framework}
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          loadPeriods();
          refreshPeriods();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}

function CreatePeriodModal({
  framework,
  open,
  onOpenChange,
  onSuccess,
}: {
  framework: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    starts_at: '',
    ends_at: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/audit-periods', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, framework }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create period');
      }

      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-xl min-w-[420px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Audit Period</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Period Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-slate-300 rounded px-3 py-2"
                placeholder="Q1 2026 Audit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Period'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

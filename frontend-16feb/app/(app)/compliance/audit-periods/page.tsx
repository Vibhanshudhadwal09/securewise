'use client';

import { useEffect, useState } from 'react';
import { useCompliance } from '@/contexts/ComplianceContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/PageHeader';
import { Settings, Calendar } from 'lucide-react';

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
    planned: 'neutral',
    active: 'success',
    closed: 'neutral',
  };

  if (loading) {
    return <div className="p-8 text-[var(--text-secondary)]">Loading audit periods...</div>;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden pt-4 bg-[var(--bg-primary)]">
      <PageHeader
        title="Audit Periods"
        description={`Manage compliance audit periods for ${framework.toUpperCase()}`}
        icon={Calendar}
        breadcrumbs={[
          { label: 'GRC / Compliance' },
          { label: 'Audit Periods' },
        ]}
        actions={
          <Button onClick={() => setShowCreateModal(true)} className="bg-[var(--accent-blue)] text-white hover:brightness-110 shadow-sm border-none">
            Create Period
          </Button>
        }
      />

      <div className="p-8 max-w-content mx-auto w-full">
        <div className="grid gap-4">
          {periods.length === 0 ? (
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-12 text-center text-[var(--text-secondary)] shadow-[var(--card-shadow)] backdrop-blur-md">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-[var(--text-tertiary)] opacity-50" />
              <div className="text-lg font-medium text-[var(--text-primary)] mb-2">No audit periods defined</div>
              <div>Click "Create Period" to get started with tracking compliance efforts.</div>
            </div>
          ) : (
            periods.map((period) => (
              <div key={period.period_id} className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] backdrop-blur-md hover:border-[rgba(59,130,246,0.3)] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{period.name}</h3>
                      <Badge variant={statusColors[period.status] as any} className="uppercase px-2 font-semibold">
                        {period.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1 font-mono relative top-0.5">
                      {new Date(period.starts_at).toLocaleDateString()} to {new Date(period.ends_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {period.status === 'planned' ? (
                      <button
                        onClick={() => handleStatusChange(period.period_id, 'active')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[rgba(59,130,246,0.15)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] transition-colors"
                      >
                        Activate
                      </button>
                    ) : null}
                    {period.status === 'active' ? (
                      <button
                        onClick={() => handleStatusChange(period.period_id, 'closed')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Close Period
                      </button>
                    ) : null}
                    {period.status === 'closed' ? (
                      <button
                        onClick={() => handleStatusChange(period.period_id, 'active')}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--card-border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        Reopen
                      </button>
                    ) : null}
                    <button
                      onClick={() => handleDelete(period.period_id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-600 hover:border-red-600 hover:text-white transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
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
      <DialogContent className="w-[95vw] max-w-xl min-w-[420px] bg-[var(--bg-secondary)] border border-[var(--card-border)] text-[var(--text-primary)]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">Create Audit Period</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Period Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded px-3 py-2 focus:border-[var(--accent-blue)] focus:outline-none"
                placeholder="Q1 2026 Audit"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Start Date</label>
                <input
                  type="date"
                  required
                  value={formData.starts_at}
                  onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                  className="w-full border border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded px-3 py-2 focus:border-[var(--accent-blue)] focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">End Date</label>
                <input
                  type="date"
                  required
                  value={formData.ends_at}
                  onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                  className="w-full border border-[var(--card-border)] bg-[var(--input-bg)] text-[var(--text-primary)] rounded px-3 py-2 focus:border-[var(--accent-blue)] focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-[var(--card-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-[var(--accent-blue)] text-white hover:brightness-110 border-none">
              {submitting ? 'Creating...' : 'Create Period'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

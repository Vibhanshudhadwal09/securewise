'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { KpiSkeleton } from '@/components/ui/LoadingStates';
import { useToast } from '@/components/ui/Toast';
import { PlaybookCard } from './PlaybookCard';
import { PlaybookTemplatesModal } from './PlaybookTemplatesModal';

type Playbook = {
  playbook_id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  action_count: number;
  avg_execution_time_ms: number;
  last_executed: string | null;
  execution_count: number;
  success_count: number;
  success_rate: number;
  executions_24h?: number;
  trigger_type?: string;
  trigger_config?: any;
  workflow?: any;
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

export function PlaybookLibrary() {
  const router = useRouter();
  const toast = useToast();
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    setTenantId(readCookie('sw_tenant') || 'demo-tenant');
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    let mounted = true;
    let timer: any;

    const load = async () => {
      try {
        setError(null);
        const res = await fetch(`/api/playbooks?tenant_id=${encodeURIComponent(tenantId)}`, {
          headers: { 'x-tenant-id': tenantId },
          credentials: 'include',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Failed to load playbooks (${res.status})`);
        if (mounted) setPlaybooks(Array.isArray(data?.playbooks) ? data.playbooks : []);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load playbooks');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    timer = setInterval(load, 30_000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [tenantId]);

  const stats = useMemo(() => {
    const active = playbooks.filter((p) => p.enabled).length;
    const executions24h = playbooks.reduce((sum, p) => sum + Number(p.executions_24h || 0), 0);
    const totalExec = playbooks.reduce((sum, p) => sum + Number(p.execution_count || 0), 0);
    const totalSuccess = playbooks.reduce((sum, p) => sum + Number(p.success_count || 0), 0);
    const successRate = totalExec > 0 ? Math.round((totalSuccess / totalExec) * 100) : 0;
    return { active, executions24h, successRate };
  }, [playbooks]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/playbooks?tenant_id=${encodeURIComponent(tenantId)}`, {
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to load playbooks (${res.status})`);
      setPlaybooks(Array.isArray(data?.playbooks) ? data.playbooks : []);
    } catch (err: any) {
      toast.error('Failed to refresh playbooks', err?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const updatePlaybook = async (id: string, payload: Partial<Playbook>) => {
    const res = await fetch(`/api/playbooks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || `Failed to update playbook (${res.status})`);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await updatePlaybook(id, { enabled });
      setPlaybooks((prev) => prev.map((p) => (p.playbook_id === id ? { ...p, enabled } : p)));
      toast.success(`Playbook ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error('Failed to update playbook', err?.message || 'Please try again');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this playbook?')) return;
    try {
      const res = await fetch(`/api/playbooks/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to delete playbook (${res.status})`);
      setPlaybooks((prev) => prev.filter((p) => p.playbook_id !== id));
      toast.success('Playbook deleted');
    } catch (err: any) {
      toast.error('Failed to delete playbook', err?.message || 'Please try again');
    }
  };

  const handleTest = async (id: string) => {
    try {
      const res = await fetch(`/api/playbooks/${id}/test`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to test playbook (${res.status})`);
      toast.success('Playbook test executed', data?.execution?.status || 'Completed');
    } catch (err: any) {
      toast.error('Playbook test failed', err?.message || 'Please try again');
    }
  };

  const handleTemplateSelect = async (template: any) => {
    try {
      const res = await fetch('/api/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        credentials: 'include',
        body: JSON.stringify({
          tenant_id: tenantId,
          name: template.name,
          description: template.description,
          category: template.category,
          trigger_type: template.trigger_type,
          trigger_config: template.trigger_config,
          workflow: template.workflow,
          enabled: true,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to create playbook (${res.status})`);
      const created = data.playbook;
      const actionCount = Array.isArray(created?.workflow?.nodes)
        ? created.workflow.nodes.filter((n: any) => n.type === 'action').length
        : 0;
      setPlaybooks((prev) => [
        {
          ...created,
          action_count: actionCount,
          success_rate: 0,
          avg_execution_time_ms: 0,
          executions_24h: 0,
        },
        ...prev,
      ]);
      toast.success('Playbook created from template');
      setTemplatesOpen(false);
    } catch (err: any) {
      toast.error('Failed to create playbook', err?.message || 'Please try again');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <KpiSkeleton count={3} />
        ) : (
          <>
            <Card className="p-6">
              <div className="text-sm text-gray-600">Active Playbooks</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{stats.active}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-gray-600">Executions (24h)</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{stats.executions24h}</div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-gray-600">Success Rate</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{stats.successRate}%</div>
            </Card>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button icon={<Sparkles className="h-4 w-4" />} onClick={() => setTemplatesOpen(true)}>
          Use Template
        </Button>
        <Button variant="outline" onClick={() => router.push('/playbooks/builder')}>
          Create Playbook
        </Button>
        <Button variant="secondary" icon={<RefreshCw className="h-4 w-4" />} onClick={refresh}>
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
          {error}
        </Card>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6 space-y-3 animate-pulse bg-gray-50" />
          ))}
        </div>
      ) : playbooks.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No playbooks yet"
          description="Get started by using a pre-built template or creating a custom playbook."
          action={{
            label: 'Browse Templates',
            onClick: () => setTemplatesOpen(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {playbooks.map((playbook) => (
            <PlaybookCard
              key={playbook.playbook_id}
              playbook={playbook}
              onToggle={handleToggle}
              onEdit={(id) => router.push(`/playbooks/builder?playbook=${encodeURIComponent(id)}`)}
              onTest={handleTest}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <PlaybookTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Shield, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type Control = {
  control_id: string;
  framework: string;
  title?: string;
  name?: string;
  description?: string;
};

type ControlSelectorProps = {
  selectedControls: string[];
  onChange: (controlIds: string[]) => void;
  tenantId: string;
};

function formatFramework(value?: string) {
  const v = String(value || '').toLowerCase();
  if (v === 'iso27001') return 'ISO 27001';
  if (v === 'soc2') return 'SOC 2';
  return value || 'Framework';
}

export default function ControlSelector({ selectedControls, onChange, tenantId }: ControlSelectorProps) {
  const [controls, setControls] = useState<Control[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const frameworks = ['iso27001', 'soc2'] as const;
        const responses = await Promise.all(
          frameworks.map(async (framework) => {
            const res = await fetch(
              `/api/controls?framework=${encodeURIComponent(framework)}&tenantId=${encodeURIComponent(tenantId)}`,
              { credentials: 'include', headers: { 'x-tenant-id': tenantId } }
            );
            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.error || `Failed to load ${framework} controls (${res.status})`);
            const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.controls) ? data.controls : [];
            return items.map((item: any) => ({
              control_id: String(item.control_id || item.controlId || ''),
              framework,
              title: item.title || item.name || item.control_title || '',
              name: item.name || item.title || '',
              description: item.description || item.control_description || '',
            })) as Control[];
          })
        );
        if (!mounted) return;
        setControls(responses.flat().filter((c) => c.control_id));
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load controls');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (tenantId) load();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const frameworks = useMemo(() => {
    const set = new Set(controls.map((c) => c.framework));
    return ['all', ...Array.from(set.values())];
  }, [controls]);

  const filteredControls = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return controls.filter((control) => {
      const matchesSearch =
        !q ||
        control.control_id.toLowerCase().includes(q) ||
        (control.title || '').toLowerCase().includes(q) ||
        (control.name || '').toLowerCase().includes(q);
      const matchesFramework = frameworkFilter === 'all' || control.framework === frameworkFilter;
      return matchesSearch && matchesFramework;
    });
  }, [controls, searchTerm, frameworkFilter]);

  const toggleControl = (controlId: string) => {
    if (selectedControls.includes(controlId)) {
      onChange(selectedControls.filter((id) => id !== controlId));
    } else {
      onChange([...selectedControls, controlId]);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-blue-600" />
        <div>
          <div className="text-sm font-semibold text-gray-900">Link to Compliance Controls</div>
          <div className="text-xs text-gray-600">
            Associate controls this playbook enforces to update effectiveness and evidence automatically.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search controls..."
            className="pl-9"
          />
        </div>
        <select
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
          value={frameworkFilter}
          onChange={(e) => setFrameworkFilter(e.target.value)}
        >
          {frameworks.map((fw) => (
            <option key={fw} value={fw}>
              {fw === 'all' ? 'All frameworks' : formatFramework(fw)}
            </option>
          ))}
        </select>
      </div>

      {selectedControls.length > 0 ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-semibold text-blue-800 mb-2">
            Selected controls ({selectedControls.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedControls.map((controlId) => (
              <span
                key={controlId}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
              >
                {controlId}
                <button
                  type="button"
                  onClick={() => toggleControl(controlId)}
                  className="rounded-full p-0.5 hover:bg-blue-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="max-h-80 overflow-y-auto rounded-md border border-gray-200">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading controls…</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">{error}</div>
        ) : filteredControls.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No controls found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredControls.map((control) => (
              <label
                key={`${control.framework}-${control.control_id}`}
                className="flex items-start gap-3 px-3 py-3 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedControls.includes(control.control_id)}
                  onChange={() => toggleControl(control.control_id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="info">{formatFramework(control.framework)}</Badge>
                    <span className="font-semibold text-blue-600">{control.control_id}</span>
                  </div>
                  <div className="mt-1 font-medium text-gray-900">
                    {control.title || control.name || 'Untitled control'}
                  </div>
                  {control.description ? (
                    <div className="mt-1 text-xs text-gray-600 line-clamp-2">{control.description}</div>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

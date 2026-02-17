'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

type ControlRow = {
  control_id: string;
  title?: string;
  name?: string;
  framework_id?: string;
  framework?: string;
  description?: string;
};

export default function ControlSelector(props: {
  tenantId?: string;
  selected: string[];
  onChange: (next: string[]) => void;
  suggested?: string[];
}) {
  const { tenantId, selected, onChange, suggested } = props;
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [query, setQuery] = useState('');
  const [frameworkFilter, setFrameworkFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/controls?limit=200', {
          credentials: 'include',
          headers: tenantId ? { 'x-tenant-id': tenantId } : undefined,
        });
        const json = await res.json().catch(() => ({}));
        const items = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
        if (!cancelled) setControls(items);
      } catch {
        if (!cancelled) setControls([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return controls.filter((c) => {
      const framework = String(c.framework_id || c.framework || '').toLowerCase();
      if (frameworkFilter !== 'all' && framework !== frameworkFilter) return false;
      if (!q) return true;
      return (
        String(c.control_id || '').toLowerCase().includes(q) ||
        String(c.title || c.name || '').toLowerCase().includes(q)
      );
    });
  }, [controls, query, frameworkFilter]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const frameworks = useMemo(() => {
    const set = new Set<string>();
    for (const c of controls) {
      const f = String(c.framework_id || c.framework || '').toLowerCase();
      if (f) set.add(f);
    }
    return ['all', ...Array.from(set)];
  }, [controls]);

  return (
    <div className="space-y-4">
      {suggested && suggested.length ? (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="text-sm font-medium text-blue-900 mb-2">Suggested controls</div>
          <div className="flex flex-wrap gap-2">
            {suggested.map((id) => (
              <button
                key={id}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs ${
                  selected.includes(id)
                    ? 'border-blue-400 bg-blue-100 text-blue-700'
                    : 'border-blue-200 bg-white text-blue-700'
                }`}
                onClick={() => toggle(id)}
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
          <input
            className="w-full rounded-md border border-gray-200 pl-8 pr-3 py-2 text-sm"
            placeholder="Search controls by ID or name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {frameworks.map((f) => (
            <button
              key={f}
              type="button"
              className={`rounded-full border px-3 py-1 text-xs ${
                frameworkFilter === f ? 'border-gray-400 bg-gray-100 text-gray-900' : 'border-gray-200 text-gray-600'
              }`}
              onClick={() => setFrameworkFilter(f)}
            >
              {f === 'all' ? 'All' : f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded-lg border border-gray-200">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No controls found.</div>
        ) : (
          filtered.map((c) => {
            const id = String(c.control_id || '');
            const label = String(c.title || c.name || id);
            const framework = String(c.framework_id || c.framework || '');
            return (
              <label key={id} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0">
                <input type="checkbox" checked={selected.includes(id)} onChange={() => toggle(id)} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">{id}</div>
                  {framework ? <Badge className="mt-2">{framework.toUpperCase()}</Badge> : null}
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

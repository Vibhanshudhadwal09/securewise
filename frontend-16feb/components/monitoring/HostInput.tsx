'use client';

import { useMemo, useState } from 'react';
import { Plus, XCircle } from 'lucide-react';

function isValidHost(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return false;
  const parts = trimmed.split(':');
  const host = parts[0];
  const port = parts[1];
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) return false;
  if (port && !/^\d+$/.test(port)) return false;
  return true;
}

export default function HostInput(props: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { value, onChange } = props;
  const [draft, setDraft] = useState('');
  const [bulk, setBulk] = useState('');
  const hosts = Array.isArray(value) ? value : [];

  const invalidHosts = useMemo(() => hosts.filter((h) => !isValidHost(h)), [hosts]);

  const addHost = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...hosts, trimmed]));
    onChange(next);
    setDraft('');
  };

  const importBulk = () => {
    const lines = bulk
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const next = Array.from(new Set([...hosts, ...lines]));
    onChange(next);
    setBulk('');
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="example.com:443"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          onClick={addHost}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {hosts.map((host) => (
          <div key={host} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-xs">
            <span className={isValidHost(host) ? 'text-gray-700' : 'text-red-600'}>{host}</span>
            <button type="button" onClick={() => onChange(hosts.filter((h) => h !== host))}>
              <XCircle size={12} className="text-gray-400 hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {invalidHosts.length ? (
        <div className="text-xs text-red-600">Some hosts look invalid. Use hostname:port format.</div>
      ) : null}

      <div className="rounded-md border border-dashed border-gray-200 p-3">
        <div className="text-xs text-gray-500 mb-2">Bulk import (comma or new line separated)</div>
        <textarea
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs"
          rows={2}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder="example.com:443, api.example.com"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            onClick={importBulk}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import Editor from '@monaco-editor/react';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KeyValueEditor, { type KeyValuePair } from '@/components/evidence/KeyValueEditor';
import { Badge } from '@/components/ui/badge';

const TEMPLATE_SNIPPETS: Record<string, string> = {
  'AWS CLI Snapshot': 'aws iam get-account-password-policy --output json',
  'Kubernetes Config Dump': 'kubectl get all --all-namespaces -o json',
  'Local File Hash': 'sha256sum /etc/ssh/sshd_config',
  'Database Query': 'psql -c "SELECT now();"',
  'Custom Script': '# Write your script here',
};

export default function Step2ScriptRunner(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;
  const cfg = value || {};
  const [language, setLanguage] = useState(cfg.language || 'python');
  const envVars = Array.isArray(cfg.env_vars) ? cfg.env_vars : [];

  const update = (patch: Record<string, any>) => onChange({ ...cfg, ...patch });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Script configuration</div>
          <div className="text-xs text-gray-500">Run a script to collect evidence automatically.</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-50 text-purple-700 border-purple-200">Script</Badge>
          <button
            type="button"
            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Dry run
          </button>
        </div>
      </div>

      <Tabs value={language} onValueChange={(v) => {
        setLanguage(v);
        update({ language: v });
      }}>
        <TabsList>
          <TabsTrigger value="python">Python</TabsTrigger>
          <TabsTrigger value="bash">Bash</TabsTrigger>
          <TabsTrigger value="powershell">PowerShell</TabsTrigger>
          <TabsTrigger value="node">Node.js</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 space-y-2">
          <label className="text-xs font-medium text-gray-600">Script</label>
          <Editor
            height="220px"
            language={language === 'node' ? 'javascript' : language}
            value={cfg.script || ''}
            onChange={(val) => update({ script: val || '' })}
            options={{ minimap: { enabled: false }, fontSize: 12 }}
          />
        </div>
        <div className="lg:col-span-4 space-y-2">
          <label className="text-xs font-medium text-gray-600">Template</label>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={cfg.template || ''}
            onChange={(e) => {
              const tmpl = e.target.value;
              update({ template: tmpl, script: TEMPLATE_SNIPPETS[tmpl] || cfg.script });
            }}
          >
            <option value="">Select template</option>
            {Object.keys(TEMPLATE_SNIPPETS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <label className="text-xs font-medium text-gray-600 mt-4">Timeout (seconds)</label>
          <input
            type="range"
            min={30}
            max={600}
            value={cfg.timeout_seconds || 120}
            onChange={(e) => update({ timeout_seconds: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-500">{cfg.timeout_seconds || 120}s</div>

          <label className="text-xs font-medium text-gray-600 mt-4">Working directory</label>
          <input
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="/tmp"
            value={cfg.working_directory || ''}
            onChange={(e) => update({ working_directory: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-900">Environment variables</div>
        <KeyValueEditor
          value={envVars as KeyValuePair[]}
          onChange={(items) => update({ env_vars: items })}
          keyPlaceholder="Variable"
          valuePlaceholder="Value"
          allowSecret
        />
      </div>
    </div>
  );
}

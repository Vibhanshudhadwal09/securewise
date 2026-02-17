"use client";

import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KeyValueEditor, { type KeyValuePair } from '@/components/evidence/KeyValueEditor';

const TEMPLATE_SNIPPETS: Record<string, string> = {
  'AWS CLI Command': 'aws iam get-account-password-policy --output json',
  'Azure CLI Command': 'az account show --output json',
  'Kubernetes Config Check': 'kubectl get nodes -o json',
  'Database Query': 'psql -c "SELECT now();"',
  'API Call': 'curl -s https://api.example.com/health',
  'File System Check': 'ls -la /etc',
};

export default function Step2ScriptEditor(props: {
  value: any;
  onChange: (next: any) => void;
}) {
  const { value, onChange } = props;
  const config = value || {};
  const [language, setLanguage] = useState(config.language || 'python');
  const params = Array.isArray(config.script_parameters) ? config.script_parameters : [];
  const envVars = Array.isArray(config.env_vars) ? config.env_vars : [];

  const update = (patch: Record<string, any>) => onChange({ ...config, ...patch });

  return (
    <div className="space-y-5">
      <Tabs
        value={language}
        onValueChange={(v) => {
          setLanguage(v);
          update({ language: v });
        }}
      >
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
            value={config.script_content || ''}
            onChange={(val) => update({ script_content: val || '' })}
            options={{ minimap: { enabled: false }, fontSize: 12 }}
          />
        </div>
        <div className="lg:col-span-4 space-y-2">
          <label className="text-xs font-medium text-gray-600">Script template</label>
          <select
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={config.template || ''}
            onChange={(e) => {
              const tmpl = e.target.value;
              update({ template: tmpl, script_content: TEMPLATE_SNIPPETS[tmpl] || config.script_content });
            }}
          >
            <option value="">Select template</option>
            {Object.keys(TEMPLATE_SNIPPETS).map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <label className="text-xs font-medium text-gray-600 mt-3">Timeout (seconds)</label>
          <input
            type="range"
            min={30}
            max={600}
            value={config.timeout_seconds || 300}
            onChange={(e) => update({ timeout_seconds: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-xs text-gray-500">{config.timeout_seconds || 300}s</div>
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Parameters</div>
        <KeyValueEditor
          value={params as KeyValuePair[]}
          onChange={(items) => update({ script_parameters: items })}
          keyPlaceholder="Parameter"
          valuePlaceholder="Value"
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Environment variables</div>
        <KeyValueEditor
          value={envVars as KeyValuePair[]}
          onChange={(items) => update({ env_vars: items })}
          keyPlaceholder="Variable"
          valuePlaceholder="Value"
          allowSecret
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
        >
          Test script
        </button>
      </div>
    </div>
  );
}

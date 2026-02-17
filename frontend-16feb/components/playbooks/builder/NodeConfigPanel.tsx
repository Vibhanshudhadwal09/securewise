"use client";

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Node } from '@xyflow/react';

export interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (nodeId: string, config: any) => void;
  onClose: () => void;
}

const vendorActions: Record<string, string[]> = {
  wazuh: ['send_alert', 'isolate_asset', 'block_ip', 'kill_process', 'quarantine_file'],
  okta: ['disable_user', 'revoke_sessions', 'reset_password'],
  crowdstrike: ['isolate_endpoint', 'kill_process', 'quarantine_file'],
  palo_alto: ['block_ip', 'create_rule', 'block_domain'],
  servicenow: ['create_incident', 'update_ticket'],
};

export default function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<any>(node.data?.config || {});

  useEffect(() => {
    setConfig(node.data?.config || {});
  }, [node]);

  const handleSave = () => {
    onUpdate(node.id, config);
  };

  const renderTriggerConfig = () => (
    <div className="space-y-4">
      <label className="text-xs text-gray-600 block">
        Trigger Type
        <select
          className="mt-1 w-full border rounded px-2 py-1 text-sm"
          value={config.triggerType || 'violation'}
          onChange={(e) => setConfig({ ...config, triggerType: e.target.value })}
        >
          <option value="violation">Control Violation</option>
          <option value="signal">Security Signal</option>
          <option value="risk_threshold">Risk Threshold</option>
          <option value="manual">Manual</option>
        </select>
      </label>

      {config.triggerType === 'violation' ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-800">Severity</div>
          {['critical', 'high', 'medium', 'low'].map((sev) => {
            const current = config.conditions?.severity || [];
            const checked = current.includes(sev);
            return (
              <label key={sev} className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked ? [...current, sev] : current.filter((s: string) => s !== sev);
                    setConfig({ ...config, conditions: { ...config.conditions, severity: next } });
                  }}
                />
                <span className="capitalize">{sev}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  const renderConditionConfig = () => (
    <div className="space-y-4">
      <label className="text-xs text-gray-600 block">
        Field
        <select
          className="mt-1 w-full border rounded px-2 py-1 text-sm"
          value={config.field || ''}
          onChange={(e) => setConfig({ ...config, field: e.target.value })}
        >
          <option value="">Select field</option>
          <option value="severity">Severity</option>
          <option value="signal_type">Signal Type</option>
          <option value="user_email">User Email</option>
          <option value="asset_id">Asset ID</option>
          <option value="source_ip">Source IP</option>
        </select>
      </label>
      <label className="text-xs text-gray-600 block">
        Operator
        <select
          className="mt-1 w-full border rounded px-2 py-1 text-sm"
          value={config.operator || 'equals'}
          onChange={(e) => setConfig({ ...config, operator: e.target.value })}
        >
          <option value="equals">Equals</option>
          <option value="contains">Contains</option>
          <option value="greater_than">Greater Than</option>
          <option value="less_than">Less Than</option>
        </select>
      </label>
      <label className="text-xs text-gray-600 block">
        Value
        <input
          className="mt-1 w-full border rounded px-2 py-1 text-sm"
          value={config.value || ''}
          onChange={(e) => setConfig({ ...config, value: e.target.value })}
          placeholder="Enter value"
        />
      </label>
    </div>
  );

  const renderActionConfig = () => {
    const vendor = config.vendor || 'wazuh';
    const actions = vendorActions[vendor] || ['send_alert'];
    return (
      <div className="space-y-4">
        <label className="text-xs text-gray-600 block">
          Vendor
          <select
            className="mt-1 w-full border rounded px-2 py-1 text-sm"
            value={vendor}
            onChange={(e) => setConfig({ ...config, vendor: e.target.value })}
          >
            {Object.keys(vendorActions).map((v) => (
              <option key={v} value={v}>
                {v.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600 block">
          Action Type
          <select
            className="mt-1 w-full border rounded px-2 py-1 text-sm"
            value={config.actionType || actions[0]}
            onChange={(e) => setConfig({ ...config, actionType: e.target.value })}
          >
            {actions.map((action) => (
              <option key={action} value={action}>
                {action.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-gray-600 block">
          Parameters (JSON)
          <textarea
            className="mt-1 w-full border rounded px-2 py-1 text-xs font-mono"
            rows={5}
            value={JSON.stringify(config.parameters || {}, null, 2)}
            onChange={(e) => {
              try {
                setConfig({ ...config, parameters: JSON.parse(e.target.value) });
              } catch {
                // ignore invalid JSON
              }
            }}
          />
        </label>
        <p className="text-xs text-gray-500">Use {"{{signal.asset_id}}"} for dynamic values.</p>
      </div>
    );
  };

  return (
    <aside className="w-96 border-l border-gray-200 bg-white p-6 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          {String(node.type || '').replace(/^\w/, (c) => c.toUpperCase())} Configuration
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="h-4 w-4" />
        </button>
      </div>

      {node.type === 'trigger' ? renderTriggerConfig() : null}
      {node.type === 'condition' ? renderConditionConfig() : null}
      {node.type === 'action' ? renderActionConfig() : null}

      <button className="w-full bg-blue-600 text-white text-sm px-4 py-2 rounded" onClick={handleSave}>
        Update Configuration
      </button>
    </aside>
  );
}

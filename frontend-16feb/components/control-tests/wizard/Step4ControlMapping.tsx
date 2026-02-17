"use client";

import ControlSelector from '@/components/evidence/ControlSelector';
import { Badge } from '@/components/ui/badge';

export default function Step4ControlMapping(props: {
  tenantId?: string;
  name: string;
  description: string;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  selectedControls: string[];
  onChangeControls: (next: string[]) => void;
  schedule: any;
  onChangeSchedule: (next: any) => void;
}) {
  const { tenantId, name, description, onChangeName, onChangeDescription, selectedControls, onChangeControls, schedule, onChangeSchedule } =
    props;
  const cfg = schedule || {};

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-gray-900">Test details</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <input
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Test name"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
          />
          <input
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Description"
            value={description}
            onChange={(e) => onChangeDescription(e.target.value)}
          />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Map to controls</div>
        <div className="text-xs text-gray-500">Select controls this test supports.</div>
      </div>
      <ControlSelector tenantId={tenantId} selected={selectedControls} onChange={onChangeControls} />
      {selectedControls.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedControls.map((id) => (
            <Badge key={id} className="bg-gray-100 text-gray-700 border-gray-200">
              {id}
            </Badge>
          ))}
        </div>
      ) : null}

      <div>
        <div className="text-sm font-semibold text-gray-900">Schedule</div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-700 mt-2">
          {['manual', 'audit', 'scheduled'].map((mode) => (
            <label key={mode} className="flex items-center gap-2">
              <input
                type="radio"
                checked={(cfg.mode || 'manual') === mode}
                onChange={() => onChangeSchedule({ ...cfg, mode })}
              />
              {mode === 'manual' ? 'Manual only' : mode === 'audit' ? 'Before audits' : 'Scheduled'}
            </label>
          ))}
        </div>
        {cfg.mode === 'scheduled' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <select
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={cfg.frequency || 'daily'}
              onChange={(e) => onChangeSchedule({ ...cfg, frequency: e.target.value })}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <input
              type="time"
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              value={cfg.time || '09:00'}
              onChange={(e) => onChangeSchedule({ ...cfg, time: e.target.value })}
            />
            <input
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Timezone (e.g., UTC)"
              value={cfg.timezone || ''}
              onChange={(e) => onChangeSchedule({ ...cfg, timezone: e.target.value })}
            />
          </div>
        ) : null}
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={Boolean(cfg.run_immediately)}
            onChange={(e) => onChangeSchedule({ ...cfg, run_immediately: e.target.checked })}
          />
          Run immediately after save
        </label>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Evidence options</div>
        <div className="space-y-2 mt-2 text-sm text-gray-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(cfg.collect_evidence)}
              onChange={(e) => onChangeSchedule({ ...cfg, collect_evidence: e.target.checked })}
            />
            Auto-collect evidence
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(cfg.link_controls)}
              onChange={(e) => onChangeSchedule({ ...cfg, link_controls: e.target.checked })}
            />
            Link evidence to controls
          </label>
          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={cfg.retention_days || 90}
            onChange={(e) => onChangeSchedule({ ...cfg, retention_days: Number(e.target.value) })}
          >
            {[30, 60, 90, 180, 365].map((d) => (
              <option key={d} value={d}>
                Retain for {d} days
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

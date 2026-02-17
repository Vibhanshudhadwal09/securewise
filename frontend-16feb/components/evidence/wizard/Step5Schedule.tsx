'use client';

import * as React from 'react';
import { FormField } from '@/components/ui/FormField';

type EvidenceFormValues = {
  name: string;
  description?: string;
  type: string;
  endpoint?: string;
  apiKey: string;
  frequency: string;
  enabled: boolean;
};

type ScheduleValues = {
  schedule_mode: 'manual' | 'scheduled';
  schedule_frequency: string;
  schedule_time: string;
  schedule_timezone: string;
  retention_days: number;
  notify_on_failure: boolean;
  notify_on_expiry: boolean;
  notify_email: string;
  notify_slack: string;
};

export default function Step5Schedule({
  values,
  onChange,
  onBlur,
  getFieldError,
  schedule,
  onScheduleChange,
  onTypeChange,
}: {
  values: EvidenceFormValues;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onBlur: (fieldName: string) => void;
  getFieldError: (fieldName: string) => string | undefined;
  schedule: ScheduleValues;
  onScheduleChange: (next: ScheduleValues) => void;
  onTypeChange: (nextType: string) => void;
}) {
  const scheduleMode = schedule.schedule_mode;
  const updateSchedule = (patch: Partial<ScheduleValues>) => onScheduleChange({ ...schedule, ...patch });
  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e);
    updateSchedule({ schedule_frequency: e.target.value });
  };
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e);
    onTypeChange(e.target.value);
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="text-sm font-semibold text-gray-900">Schedule & save</div>
        <div className="text-xs text-gray-500">Name your collection and set a schedule.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Collection Name"
          name="name"
          type="text"
          value={values.name}
          onChange={onChange}
          onBlur={() => onBlur('name')}
          error={getFieldError('name')}
          required
          placeholder="e.g., User Access Reports"
          helpText="A descriptive name for this evidence collection"
        />
        <FormField
          label="Collection Type"
          name="type"
          type="select"
          value={values.type}
          onChange={handleTypeChange}
          onBlur={() => onBlur('type')}
          error={getFieldError('type')}
          required
          options={[
            { value: 'api', label: 'API Integration' },
            { value: 'cloud', label: 'Cloud Service' },
            { value: 'database', label: 'Database Query' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600">Retention (days)</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={schedule.retention_days}
            onChange={(e) => updateSchedule({ retention_days: Number(e.target.value) })}
          >
            {[30, 60, 90, 180, 365].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </div>
      </div>

      <FormField
        label="Description"
        name="description"
        type="textarea"
        value={values.description || ''}
        onChange={onChange}
        onBlur={() => onBlur('description')}
        error={getFieldError('description')}
        placeholder="Describe what this collection does..."
        rows={3}
      />

      <div className="space-y-3">
        <label className="text-xs font-medium text-gray-600">Schedule</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="manual"
              checked={scheduleMode === 'manual'}
              onChange={() => updateSchedule({ schedule_mode: 'manual' })}
            />
            Manual only
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="scheduled"
              checked={scheduleMode === 'scheduled'}
              onChange={() => updateSchedule({ schedule_mode: 'scheduled' })}
            />
            Scheduled
          </label>
        </div>
        {scheduleMode === 'scheduled' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField
              label="Collection Frequency"
              name="frequency"
              type="select"
              value={values.frequency}
              onChange={handleFrequencyChange}
              onBlur={() => onBlur('frequency')}
              error={getFieldError('frequency')}
              required
              options={[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
            />
            <input
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              type="time"
              value={schedule.schedule_time}
              onChange={(e) => updateSchedule({ schedule_time: e.target.value })}
            />
            <input
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Timezone (e.g., UTC)"
              value={schedule.schedule_timezone}
              onChange={(e) => updateSchedule({ schedule_timezone: e.target.value })}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">Alerts</label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={schedule.notify_on_failure}
            onChange={(e) => updateSchedule({ notify_on_failure: e.target.checked })}
          />
          Notify me if collection fails
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={schedule.notify_on_expiry}
            onChange={(e) => updateSchedule({ notify_on_expiry: e.target.checked })}
          />
          Notify me when evidence expires
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Email recipients (comma separated)"
            value={schedule.notify_email}
            onChange={(e) => updateSchedule({ notify_email: e.target.value })}
          />
          <input
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Slack webhook URL"
            value={schedule.notify_slack}
            onChange={(e) => updateSchedule({ notify_slack: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

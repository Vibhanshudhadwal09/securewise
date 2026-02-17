"use client";

import FrequencySelector from '@/components/monitoring/FrequencySelector';
import NotificationChannelConfig from '@/components/monitoring/NotificationChannelConfig';

export default function Step3AlertConfig(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;
  const config = value || {};

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-gray-900">Severity</div>
        <select
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={config.severity || 'medium'}
          onChange={(e) => onChange({ ...config, severity: e.target.value })}
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Check frequency</div>
        <FrequencySelector
          value={config.check_frequency_minutes || 60}
          onChange={(value) => onChange({ ...config, check_frequency_minutes: value })}
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Notification channels</div>
        <NotificationChannelConfig
          value={config.notification || { channels: ['email'] }}
          onChange={(next) => onChange({ ...config, notification: next })}
        />
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Quiet hours</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <input
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Start (e.g., 22:00)"
            value={config.quiet_start || ''}
            onChange={(e) => onChange({ ...config, quiet_start: e.target.value })}
          />
          <input
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="End (e.g., 06:00)"
            value={config.quiet_end || ''}
            onChange={(e) => onChange({ ...config, quiet_end: e.target.value })}
          />
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-900">Escalation rules</div>
        <textarea
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          rows={2}
          placeholder="Describe escalation steps"
          value={config.escalation || ''}
          onChange={(e) => onChange({ ...config, escalation: e.target.value })}
        />
      </div>
    </div>
  );
}

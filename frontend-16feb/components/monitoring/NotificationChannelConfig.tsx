'use client';

import { Mail, MessageSquare, Bell, Webhook, Ticket } from 'lucide-react';

type NotificationConfig = {
  channels: string[];
  email?: { recipients?: string };
  slack?: { channel?: string };
  pagerduty?: { integration_key?: string };
  jira?: { project_key?: string };
  webhook?: { url?: string };
};

const CHANNELS = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'slack', label: 'Slack', icon: MessageSquare },
  { id: 'pagerduty', label: 'PagerDuty', icon: Bell },
  { id: 'jira', label: 'Jira', icon: Ticket },
  { id: 'webhook', label: 'Webhook', icon: Webhook },
];

export default function NotificationChannelConfig(props: {
  value: NotificationConfig;
  onChange: (next: NotificationConfig) => void;
}) {
  const { value, onChange } = props;
  const channels = value?.channels || [];

  const toggle = (id: string) => {
    const next = channels.includes(id) ? channels.filter((c) => c !== id) : [...channels, id];
    onChange({ ...value, channels: next });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          const active = channels.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                active ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
              }`}
              onClick={() => toggle(c.id)}
            >
              <Icon size={16} /> {c.label}
            </button>
          );
        })}
      </div>

      {channels.includes('email') ? (
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="Email recipients (comma separated)"
          value={value.email?.recipients || ''}
          onChange={(e) => onChange({ ...value, email: { recipients: e.target.value } })}
        />
      ) : null}

      {channels.includes('slack') ? (
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="Slack channel (e.g., #security-alerts)"
          value={value.slack?.channel || ''}
          onChange={(e) => onChange({ ...value, slack: { channel: e.target.value } })}
        />
      ) : null}

      {channels.includes('pagerduty') ? (
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="PagerDuty integration key"
          value={value.pagerduty?.integration_key || ''}
          onChange={(e) => onChange({ ...value, pagerduty: { integration_key: e.target.value } })}
        />
      ) : null}

      {channels.includes('jira') ? (
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="Jira project key"
          value={value.jira?.project_key || ''}
          onChange={(e) => onChange({ ...value, jira: { project_key: e.target.value } })}
        />
      ) : null}

      {channels.includes('webhook') ? (
        <input
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="Webhook URL"
          value={value.webhook?.url || ''}
          onChange={(e) => onChange({ ...value, webhook: { url: e.target.value } })}
        />
      ) : null}
    </div>
  );
}

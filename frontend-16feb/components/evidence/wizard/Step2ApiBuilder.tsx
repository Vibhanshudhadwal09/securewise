import type React from 'react';
import KeyValueEditor, { type KeyValuePair } from '@/components/evidence/KeyValueEditor';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/FormField';
import { helpContent } from '@/config/helpContent';

export default function Step2ApiBuilder(props: {
  value: any;
  onChange: (next: any) => void;
  validation?: {
    values: Record<string, any>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (fieldName: string) => void;
    getFieldError: (fieldName: string) => string | undefined;
  };
}) {
  const { value, onChange, validation } = props;
  const cfg = value || {};

  const update = (patch: Record<string, any>) => onChange({ ...cfg, ...patch });

  const headers = Array.isArray(cfg.headers) ? cfg.headers : [];
  const params = Array.isArray(cfg.query_params) ? cfg.query_params : [];

  const authType = String(cfg.auth?.type || 'none');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">API configuration</div>
          <div className="text-xs text-gray-500">Connect to a service and define the request.</div>
        </div>
        <Badge className="bg-blue-50 text-blue-700 border-blue-200">API</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600">Service</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={cfg.service || ''}
            onChange={(e) => update({ service: e.target.value })}
          >
            <option value="">Select service</option>
            <option value="aws">AWS</option>
            <option value="azure">Azure</option>
            <option value="gcp">GCP</option>
            <option value="custom">Custom API</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Region</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="us-east-1"
            value={cfg.region || ''}
            onChange={(e) => update({ region: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600">HTTP Method</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={cfg.http_method || 'GET'}
            onChange={(e) => update({ http_method: e.target.value })}
          >
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <FormField
            label="API Endpoint"
            name="endpoint"
            type="url"
            value={validation?.values?.endpoint || cfg.endpoint || ''}
            onChange={(e) => {
              update({ endpoint: e.target.value });
              validation?.onChange(e);
            }}
            onBlur={() => validation?.onBlur('endpoint')}
            error={validation?.getFieldError('endpoint')}
            required
            placeholder="https://api.example.com/v1/data"
            helpText={helpContent.fields.apiEndpoint.content}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Path</label>
        <input
          className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          placeholder="/v1/security/policy"
          value={cfg.path || ''}
          onChange={(e) => update({ path: e.target.value })}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900">Authentication</div>
          <label className="text-xs text-gray-500 flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(cfg.use_existing_integration)}
              onChange={(e) => update({ use_existing_integration: e.target.checked })}
            />
            Use existing integration
          </label>
        </div>
        <select
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          value={authType}
          onChange={(e) => update({ auth: { ...cfg.auth, type: e.target.value } })}
        >
          <option value="none">None</option>
          <option value="bearer">Bearer token</option>
          <option value="api_key">API key</option>
          <option value="oauth">OAuth 2.0</option>
          <option value="aws_iam">AWS IAM</option>
          <option value="azure_ad">Azure AD</option>
        </select>

        {authType === 'bearer' || authType === 'api_key' ? (
          <div className="space-y-1">
            <FormField
              label="API Key"
              name="apiKey"
              type="password"
              value={validation?.values?.apiKey || cfg.auth?.token || ''}
              onChange={(e) => {
                update({ auth: { ...cfg.auth, token: e.target.value } });
                validation?.onChange(e);
              }}
              onBlur={() => validation?.onBlur('apiKey')}
              error={validation?.getFieldError('apiKey')}
              required
              placeholder={authType === 'bearer' ? 'Bearer token' : 'API key'}
              helpText={helpContent.fields.apiKey.content}
            />
          </div>
        ) : null}

        {authType === 'oauth' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Client ID"
              value={cfg.auth?.client_id || ''}
              onChange={(e) => update({ auth: { ...cfg.auth, client_id: e.target.value } })}
            />
            <input
              className="rounded-md border border-gray-200 px-3 py-2 text-sm"
              placeholder="Client secret"
              value={cfg.auth?.client_secret || ''}
              onChange={(e) => update({ auth: { ...cfg.auth, client_secret: e.target.value } })}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-900">Headers</div>
        <KeyValueEditor
          value={headers as KeyValuePair[]}
          onChange={(items) => update({ headers: items })}
          keyPlaceholder="Header name"
          valuePlaceholder="Header value"
          allowSecret
        />
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-gray-900">Query parameters</div>
        <KeyValueEditor
          value={params as KeyValuePair[]}
          onChange={(items) => update({ query_params: items })}
          keyPlaceholder="Parameter"
          valuePlaceholder="Value"
        />
      </div>

      <div className="flex justify-end">
        <button type="button" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
          Test connection
        </button>
      </div>
    </div>
  );
}

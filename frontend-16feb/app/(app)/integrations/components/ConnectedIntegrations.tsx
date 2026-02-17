'use client';

import { useMemo, useState } from 'react';
import { Trash2, RefreshCw, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/badge';

interface ConnectedIntegrationsProps {
  integrations: any[];
  onRefresh: () => void;
}

function readCookie(name: string): string | null {
  const cur = String(document.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function ConnectedIntegrations({ integrations, onRefresh }: ConnectedIntegrationsProps) {
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const toast = useToast();
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;

    setDisconnecting(integrationId);
    try {
      const response = await fetch(`/api/integrations/connected/${encodeURIComponent(integrationId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Integration disconnected');
        onRefresh();
      } else {
        toast.error('Failed to disconnect integration');
      }
    } catch (error) {
      toast.error('Failed to disconnect integration');
    } finally {
      setDisconnecting(null);
    }
  };

  const handleTest = async (integrationId: string) => {
    setTesting(integrationId);
    try {
      const response = await fetch(`/api/integrations/connected/${encodeURIComponent(integrationId)}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Connection test successful!');
        onRefresh();
      } else {
        toast.error('Connection test failed');
      }
    } catch (error) {
      toast.error('Failed to test connection');
    } finally {
      setTesting(null);
    }
  };

  if (!integrations.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white py-16 shadow-card">
        <div className="flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="heading-3 text-gray-900 mb-2">No integrations connected yet</h3>
          <p className="text-gray-600 mb-6 max-w-sm">
            Connect your first integration to start collecting evidence automatically and improve audit readiness.
          </p>
          <Button variant="primary" onClick={onRefresh}>
            Refresh integrations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {integrations.map((integration) => (
        <div key={integration.id} className="border border-gray-200 rounded-2xl p-6 bg-white shadow-card hover:shadow-card-hover transition-all duration-300">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">{integration.vendorName || integration.vendorId}</h3>
                {integration.isConnected ? (
                  <CheckCircle className="w-5 h-5 text-success-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-danger-600" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant="info">{integration.category || 'General'}</Badge>
                {integration.isConnected ? <Badge variant="success">Connected</Badge> : <Badge variant="danger">Disconnected</Badge>}
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Collections:</span> {integration.enabledCollections?.length || 0} active
                </div>
                <div>
                  <span className="font-medium">Rules:</span> {integration.enabledMonitoringRules?.length || 0} active
                </div>
                {integration.lastSyncAt ? (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Last sync: {new Date(integration.lastSyncAt).toLocaleDateString()}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                loading={testing === integration.id}
                onClick={() => handleTest(integration.id)}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Test
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={disconnecting === integration.id}
                onClick={() => handleDisconnect(integration.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

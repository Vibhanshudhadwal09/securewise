import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ChatMessageProps = {
  content: any;
};

export default function ChatMessage({ content }: ChatMessageProps) {
  if (!content) return null;

  if (content.type === 'enforcement_result') {
    return (
      <div className="space-y-3">
        <Card className="p-4 border-2 border-purple-500 bg-purple-50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-bold text-purple-900">Enforcement executed</h4>
              <p className="text-sm text-purple-700 mt-1">
                Action: <span className="font-medium">{content.action}</span>
              </p>
              <p className="text-sm text-purple-700">
                Target: <span className="font-mono text-xs bg-purple-100 px-2 py-0.5 rounded">{content.target}</span>
              </p>
            </div>
            <Badge variant={content.success ? 'success' : 'danger'}>
              {content.success ? 'Success' : 'Failed'}
            </Badge>
          </div>

          <div className="space-y-2">
            {content.steps?.map((step: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-2 bg-white rounded-lg border border-purple-200">
                <span className="text-xs font-semibold flex-shrink-0">{step.icon || 'STEP'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {String(step.step || '').replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{step.message}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-purple-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-purple-700">
                Action ID: {String(content.actionId || '').slice(0, 20)}...
              </span>
              {content.canRollback && <span className="text-blue-600 font-medium">Rollback available</span>}
            </div>
          </div>
        </Card>

        {content.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-800">
              <strong>Enforcement successful.</strong> Actions executed and logged for audit compliance.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (content.type === 'enforcement_status') {
    return (
      <div className="space-y-3">
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300">
          <h4 className="font-bold text-purple-900 mb-3">Wazuh enforcement status</h4>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <p className="text-2xl font-bold text-purple-600">{content.stats?.total_actions || 0}</p>
              <p className="text-xs text-gray-600">Total Actions</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-green-200">
              <p className="text-2xl font-bold text-green-600">{content.stats?.successful || 0}</p>
              <p className="text-xs text-gray-600">Successful</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-2xl font-bold text-blue-600">{content.stats?.last_24h || 0}</p>
              <p className="text-xs text-gray-600">Last 24 Hours</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-indigo-200">
              <p className="text-2xl font-bold text-indigo-600">{content.controls_enforced || 0}</p>
              <p className="text-xs text-gray-600">Controls Enforced</p>
            </div>
          </div>

          {content.active_policies && content.active_policies.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Active Policies:</p>
              <div className="space-y-1">
                {content.active_policies.map((policy: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm">
                    <span className="font-medium">{policy.name}</span>
                    <Badge variant="neutral">{policy.mode}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (content.type === 'text') {
    return <p className="text-sm text-gray-800 whitespace-pre-wrap">{content.text}</p>;
  }

  return (
    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
      {JSON.stringify(content, null, 2)}
    </pre>
  );
}

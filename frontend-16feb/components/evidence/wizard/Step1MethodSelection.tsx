import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TemplateLibrary from '@/components/evidence/TemplateLibrary';
import type { EvidenceTemplate } from '@/types/evidence';
import { Cloud, Globe, ShieldCheck, TerminalSquare } from 'lucide-react';

export type MethodCard = {
  icon: ReactNode;
  title: string;
  description: string;
  method: 'api' | 'script' | 'tls_check' | 'cloud_provider';
};

const METHODS: MethodCard[] = [
  { icon: <Globe size={20} />, title: 'API Connection', description: 'Pull evidence from APIs securely', method: 'api' },
  { icon: <TerminalSquare size={20} />, title: 'Script Runner', description: 'Run scripts to collect evidence', method: 'script' },
  { icon: <ShieldCheck size={20} />, title: 'TLS Check', description: 'Check certificates and TLS posture', method: 'tls_check' },
  { icon: <Cloud size={20} />, title: 'Cloud Provider', description: 'Connect AWS, Azure, GCP directly', method: 'cloud_provider' },
];

export default function Step1MethodSelection(props: {
  selectedMethod?: MethodCard['method'] | null;
  selectedTemplate?: EvidenceTemplate | null;
  onSelectMethod: (method: MethodCard['method']) => void;
  onSelectTemplate: (template: EvidenceTemplate) => void;
  tenantId?: string;
}) {
  const { selectedMethod, onSelectMethod, onSelectTemplate, tenantId } = props;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3">Start from scratch</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METHODS.map((method) => (
            <Card
              key={method.method}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedMethod === method.method ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => onSelectMethod(method.method)}
            >
              <div className="flex items-start gap-3">
                <div className="text-blue-600">{method.icon}</div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">{method.title}</div>
                  <div className="text-xs text-gray-500">{method.description}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs uppercase tracking-wide text-gray-400">or start from a template</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">Template library</div>
          <Badge className="bg-gray-100 text-gray-600 border-gray-200">Curated</Badge>
        </div>
        <TemplateLibrary onSelect={onSelectTemplate} tenantId={tenantId} />
      </div>
    </div>
  );
}

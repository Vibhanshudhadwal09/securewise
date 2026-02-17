'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import { FormField } from '@/components/ui/FormField';
import { useToast } from '@/components/ui/Toast';
import { FadeIn, SlideIn } from '@/components/ui/Transitions';

interface IntegrationSetupModalProps {
  template?: any;
  integration?: any;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onSave?: () => void;
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

function ModalTransition({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!isOpen) return null;
  const content = (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <FadeIn className="relative z-10 w-full">
        <SlideIn direction="up" className="w-full">
          {children}
        </SlideIn>
      </FadeIn>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return null;
}

export default function IntegrationSetupModal({
  template,
  integration,
  isOpen,
  onClose,
  onComplete,
  onSave,
}: IntegrationSetupModalProps) {
  const activeTemplate = template ?? integration;
  const [step, setStep] = useState(1);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [connecting, setConnecting] = useState(false);
  const toast = useToast();
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);

  const coerceList = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const authFields = coerceList(activeTemplate?.authFields ?? activeTemplate?.auth_fields);
  const evidenceCollections = coerceList(activeTemplate?.evidenceCollections ?? activeTemplate?.evidence_collections);
  const monitoringRules = coerceList(activeTemplate?.monitoringRules ?? activeTemplate?.monitoring_rules);
  const vendorName = String(activeTemplate?.vendorName || activeTemplate?.vendor_name || 'Integration');
  const category = String(activeTemplate?.category || 'General');

  const handleCredentialChange = (fieldName: string, value: string) => {
    setCredentials((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleClose = () => {
    setStep(1);
    setCredentials({});
    setSelectedCollections([]);
    setSelectedRules([]);
    onClose();
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          template_id: activeTemplate?.id || activeTemplate?.template_id,
          vendor_id: activeTemplate?.vendorId || activeTemplate?.vendor_id,
          credentials,
          enabled_collections: selectedCollections,
          enabled_monitoring_rules: selectedRules,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (onSave) onSave();
        if (onComplete) onComplete();
      } else {
        toast.error('Failed to connect integration', data.error || 'Please try again');
      }
    } catch (error) {
      toast.error('Failed to connect integration');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <ModalTransition isOpen={isOpen} onClose={handleClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="heading-3 text-gray-900">Connect {vendorName}</h2>
            <p className="text-gray-600 mt-1">{category}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {s}
              </div>
              {s < 3 ? <div className={`flex-1 h-1 mx-2 ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`} /> : null}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Step 1: Enter Credentials</h3>
            <div className="space-y-4">
              {authFields.map((field: any) => {
                const fieldType =
                  field?.type === 'password' || field?.type === 'url' || field?.type === 'email' ? field.type : 'text';
                return (
                <FormField
                  key={field.name}
                  label={field.label || field.name}
                  name={field.name}
                  type={fieldType}
                  value={credentials[field.name] || ''}
                  onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                  required={Boolean(field.required)}
                  placeholder={field.placeholder}
                  helpText={field.helpText}
                />
                );
              })}
              {!authFields.length ? (
                <div className="text-sm text-gray-600 border border-dashed border-gray-200 rounded-lg p-4">
                  No credentials required for this integration.
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setStep(2)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Step 2: Select Evidence Collections</h3>
            <div className="space-y-3 mb-6">
              {evidenceCollections.map((collection: any) => (
                <label
                  key={collection.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(collection.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCollections((prev) => [...prev, collection.id]);
                      } else {
                        setSelectedCollections((prev) => prev.filter((id) => id !== collection.id));
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{collection.name}</p>
                    <p className="text-sm text-gray-600">{collection.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Frequency: {collection.frequency} • Maps to: {(collection.mapsToControls || []).join(', ')}
                    </p>
                  </div>
                </label>
              ))}
              {!evidenceCollections.length ? (
                <div className="text-sm text-gray-600 border border-dashed border-gray-200 rounded-lg p-4">
                  No evidence collections available for this integration.
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button variant="primary" onClick={() => setStep(3)}>
                Next
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Step 3: Select Monitoring Rules</h3>
            <div className="space-y-3 mb-6">
              {monitoringRules.map((rule: any) => (
                <label
                  key={rule.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRules((prev) => [...prev, rule.id]);
                      } else {
                        setSelectedRules((prev) => prev.filter((id) => id !== rule.id));
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{rule.name}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          rule.severity === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : rule.severity === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : rule.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {rule.severity || 'info'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{rule.description}</p>
                  </div>
                </label>
              ))}
              {!monitoringRules.length ? (
                <div className="text-sm text-gray-600 border border-dashed border-gray-200 rounded-lg p-4">
                  No monitoring rules available for this integration.
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button variant="primary" loading={connecting} onClick={handleConnect}>
                Connect Integration
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </ModalTransition>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Step1MethodSelection from './wizard/Step1MethodSelection';
import Step2ApiBuilder from './wizard/Step2ApiBuilder';
import Step2ScriptRunner from './wizard/Step2ScriptRunner';
import Step2TlsChecker from './wizard/Step2TlsChecker';
import Step3TestPreview from './wizard/Step3TestPreview';
import Step4ControlMapping from './wizard/Step4ControlMapping';
import Step5Schedule from './wizard/Step5Schedule';
import type { EvidenceTemplate } from '@/types/evidence';
import { createEvidenceAutomation } from '@/lib/api/evidence-templates';
import type { ConnectionTestResult } from '@/types/evidence';
import { useFormValidation } from '@/hooks/useFormValidation';
import { evidenceCollectionSchema } from '@/utils/validation';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/button';

type Method = 'api' | 'script' | 'tls_check' | 'cloud_provider';

const STEP_LABELS = ['Select', 'Configure', 'Test', 'Controls', 'Schedule'];

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

const DEFAULT_SCHEDULE: ScheduleValues = {
  schedule_mode: 'manual',
  schedule_frequency: 'daily',
  schedule_time: '',
  schedule_timezone: 'UTC',
  retention_days: 90,
  notify_on_failure: true,
  notify_on_expiry: true,
  notify_email: '',
  notify_slack: '',
};
const mapMethodToType = (method: Method | null) => {
  if (method === 'cloud_provider') return 'cloud';
  if (method === 'api') return 'api';
  return 'database';
};

const mapTypeToMethod = (type: string) => {
  if (type === 'cloud') return 'cloud_provider';
  return 'api';
};

export default function EvidenceWizard(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
  onCreated?: () => void;
  onCreate?: (data: any) => Promise<void>;
}) {
  const { open, onOpenChange, tenantId, onCreated, onCreate } = props;
  const [step, setStep] = useState(0);
  const [method, setMethod] = useState<Method | null>(null);
  const [template, setTemplate] = useState<EvidenceTemplate | null>(null);
  const [config, setConfig] = useState<any>({});
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<ScheduleValues>(DEFAULT_SCHEDULE);
  const toast = useToast();
  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    isSubmitting,
    getFieldError,
  } = useFormValidation(evidenceCollectionSchema, {
    name: '',
    description: '',
    type: 'api',
    endpoint: '',
    apiKey: '',
    frequency: 'daily',
    enabled: true,
  });

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(method || template);
    if (step === 1) return Boolean(method);
    if (step === 3) return selectedControls.length > 0;
    return true;
  }, [step, method, template, selectedControls]);

  const resetWizard = () => {
    setStep(0);
    setMethod(null);
    setTemplate(null);
    setConfig({});
    setTestResult(null);
    setSelectedControls([]);
    setSchedule(DEFAULT_SCHEDULE);
    resetForm();
  };

  useEffect(() => {
    if (!open) resetWizard();
  }, [open]);

  const handleConfigChange = (next: any) => {
    setConfig(next);
    if (typeof next?.endpoint === 'string') {
      setFieldValue('endpoint', next.endpoint);
    }
    if (typeof next?.auth?.token === 'string') {
      setFieldValue('apiKey', next.auth.token);
    }
  };

  const handleTemplate = (tpl: EvidenceTemplate) => {
    setTemplate(tpl);
    setMethod(tpl.collection_method);
    handleConfigChange(tpl.default_config || {});
    setFieldValue('name', tpl.template_name);
    setFieldValue('description', String(tpl.description || ''));
    setFieldValue('type', mapMethodToType(tpl.collection_method));
    if (tpl.default_config?.endpoint) {
      setFieldValue('endpoint', String(tpl.default_config?.endpoint || ''));
    }
    if (tpl.default_config?.auth?.token) {
      setFieldValue('apiKey', String(tpl.default_config?.auth?.token || ''));
    }
    setStep(1);
  };

  const onSubmit = async () => {
    const success = await handleSubmit(async (validatedData) => {
      const scheduleType = schedule.schedule_mode === 'scheduled' ? 'scheduled' : 'manual';
      const nextMethod = method || mapTypeToMethod(validatedData.type);
      const payload = {
        rule_name: validatedData.name,
        rule_description: validatedData.description,
        collection_method: nextMethod,
        collection_config: {
          ...config,
          endpoint: validatedData.endpoint,
          auth: {
            ...(config.auth || {}),
            type: config.auth?.type || 'api_key',
            token: validatedData.apiKey,
          },
          schedule_frequency: validatedData.frequency,
          schedule_time: schedule.schedule_time,
          schedule_timezone: schedule.schedule_timezone,
          notifications: {
            notify_on_failure: schedule.notify_on_failure,
            notify_on_expiry: schedule.notify_on_expiry,
            notify_email: schedule.notify_email,
            notify_slack: schedule.notify_slack,
          },
        },
        template_id: template?.id,
        control_ids: selectedControls,
        schedule_type: scheduleType,
        evidence_retention_days: schedule.retention_days,
        is_active: validatedData.enabled,
      };

      try {
        if (onCreate) {
          await onCreate(payload);
        } else {
          await createEvidenceAutomation(payload, tenantId);
        }
        toast.success('Evidence collection created!', 'Collection will run on schedule');
        onCreated?.();
        onOpenChange(false);
        resetWizard();
      } catch (error: any) {
        toast.error('Failed to create collection', error?.message || 'Please try again');
        throw error;
      }
    });

    if (!success) {
      toast.error('Please fix the errors in the form');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Create evidence collection</DialogTitle>
          <div className="mt-3">
            <Tabs value={String(step)} onValueChange={(v) => setStep(Number(v))}>
              <TabsList className="w-full justify-between">
                {STEP_LABELS.map((label, idx) => (
                  <TabsTrigger key={label} value={String(idx)} className="flex-1">
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>
        <DialogBody className="max-h-[75vh] overflow-y-auto">
          {step === 0 ? (
            <Step1MethodSelection
              selectedMethod={method || undefined}
              selectedTemplate={template}
              onSelectMethod={(m) => {
                setMethod(m);
                setTemplate(null);
                handleConfigChange({});
                setFieldValue('type', mapMethodToType(m));
                setFieldValue('endpoint', '');
                setFieldValue('apiKey', '');
                setStep(1);
              }}
              onSelectTemplate={handleTemplate}
              tenantId={tenantId}
            />
          ) : null}
          {step === 1 && method === 'api' ? (
            <Step2ApiBuilder
              value={config}
              onChange={handleConfigChange}
              validation={{ values, onChange: handleChange, onBlur: handleBlur, getFieldError }}
            />
          ) : null}
          {step === 1 && method === 'script' ? <Step2ScriptRunner value={config} onChange={setConfig} /> : null}
          {step === 1 && method === 'tls_check' ? <Step2TlsChecker value={config} onChange={setConfig} /> : null}
          {step === 1 && method === 'cloud_provider' ? (
            <Step2ApiBuilder
              value={config}
              onChange={handleConfigChange}
              validation={{ values, onChange: handleChange, onBlur: handleBlur, getFieldError }}
            />
          ) : null}
          {step === 2 ? (
            <Step3TestPreview
              config={{ ...config, collection_method: method }}
              tenantId={tenantId}
              onResult={setTestResult}
            />
          ) : null}
          {step === 3 ? (
            <Step4ControlMapping
              tenantId={tenantId}
              selectedControls={selectedControls}
              onChange={setSelectedControls}
              suggested={template?.suggested_controls || []}
            />
          ) : null}
          {step === 4 ? (
            <Step5Schedule
              values={values}
              onChange={handleChange}
              onBlur={handleBlur}
              getFieldError={getFieldError}
              schedule={schedule}
              onScheduleChange={setSchedule}
              onTypeChange={(nextType) => {
                const nextMethod = mapTypeToMethod(nextType);
                if (nextMethod !== method) {
                  setMethod(nextMethod);
                }
              }}
            />
          ) : null}
        </DialogBody>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 4 ? (
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
            >
              Continue
            </button>
          ) : (
            <Button
              variant="primary"
              type="button"
              loading={isSubmitting}
              disabled={Object.keys(errors).length > 0}
              onClick={onSubmit}
            >
              Create Collection
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

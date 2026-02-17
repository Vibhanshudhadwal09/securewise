"use client";

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Step1TemplateSelection from '@/components/control-tests/wizard/Step1TemplateSelection';
import Step2ScriptEditor from '@/components/control-tests/wizard/Step2ScriptEditor';
import Step3PassCriteria from '@/components/control-tests/wizard/Step3PassCriteria';
import Step4ControlMapping from '@/components/control-tests/wizard/Step4ControlMapping';
import MFAEnforcementBuilder from '@/components/control-tests/wizard/builders/MFAEnforcementBuilder';
import PasswordPolicyBuilder from '@/components/control-tests/wizard/builders/PasswordPolicyBuilder';
import EncryptionBuilder from '@/components/control-tests/wizard/builders/EncryptionBuilder';
import AntivirusBuilder from '@/components/control-tests/wizard/builders/AntivirusBuilder';
import PatchComplianceBuilder from '@/components/control-tests/wizard/builders/PatchComplianceBuilder';
import {
  createControlTestScript,
  getControlTestTemplates,
  updateControlTestScript,
} from '@/lib/api/control-test-templates';
import type { ControlTestScript, ControlTestTemplate } from '@/types/control-tests';

const STEPS = ['Select', 'Configure', 'Pass criteria', 'Controls & schedule'];

function toCron(frequency: string, time: string) {
  const [hourStr, minuteStr] = (time || '09:00').split(':');
  const hour = Number(hourStr || 9);
  const minute = Number(minuteStr || 0);
  if (frequency === 'weekly') return `${minute} ${hour} * * 1`;
  if (frequency === 'monthly') return `${minute} ${hour} 1 * *`;
  return `${minute} ${hour} * * *`;
}

export default function ControlTestWizard(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
  onCreated?: () => void;
  onCreate?: (data: any) => Promise<void>;
  mode?: 'create' | 'edit';
  initialScript?: ControlTestScript | null;
  initialTemplate?: ControlTestTemplate | null;
}) {
  const { open, onOpenChange, tenantId, onCreated, onCreate, mode = 'create', initialScript, initialTemplate } = props;
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<ControlTestTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ControlTestTemplate | null>(null);
  const [configType, setConfigType] = useState<'no_code' | 'script'>('no_code');
  const [config, setConfig] = useState<any>({});
  const [scriptConfig, setScriptConfig] = useState<any>({ language: 'python', script_content: '', timeout_seconds: 300 });
  const [passCriteria, setPassCriteria] = useState<any>({ conditions: [] });
  const [severity, setSeverity] = useState('medium');
  const [selectedControls, setSelectedControls] = useState<string[]>([]);
  const [schedule, setSchedule] = useState<any>({ mode: 'manual', frequency: 'daily', time: '09:00', timezone: 'UTC' });
  const [scriptName, setScriptName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    async function load() {
      const res = await getControlTestTemplates(undefined, tenantId);
      if (!active) return;
      setTemplates(Array.isArray(res?.items) ? res.items : []);
    }
    load();
    return () => {
      active = false;
    };
  }, [open, tenantId]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setSelectedCategory(null);
      setSelectedTemplate(null);
      setConfigType('no_code');
      setConfig({});
      setScriptConfig({ language: 'python', script_content: '', timeout_seconds: 300 });
      setPassCriteria({ conditions: [] });
      setSeverity('medium');
      setSelectedControls([]);
      setSchedule({ mode: 'manual', frequency: 'daily', time: '09:00', timezone: 'UTC' });
      setScriptName('');
      setDescription('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !initialScript) return;
    setSelectedCategory(initialScript.category);
    setSelectedTemplate(null);
    setConfigType(initialScript.config_type || 'no_code');
    setConfig(initialScript.test_config || {});
    setScriptConfig({
      language: initialScript.language || 'python',
      script_content: initialScript.script_content || '',
      script_parameters: initialScript.script_parameters || [],
      timeout_seconds: initialScript.timeout_seconds || 300,
    });
    setPassCriteria(initialScript.pass_criteria || { conditions: [] });
    setSeverity(initialScript.severity || 'medium');
    setSelectedControls(initialScript.control_ids || []);
    setSchedule({
      mode: initialScript.schedule_enabled ? 'scheduled' : 'manual',
      frequency: 'daily',
      time: '09:00',
      timezone: 'UTC',
    });
    setScriptName(initialScript.script_name || '');
    setDescription(initialScript.description || '');
    setStep(1);
  }, [open, initialScript]);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(selectedTemplate || selectedCategory);
    if (step === 3) return Boolean(scriptName.trim());
    return true;
  }, [step, selectedTemplate, selectedCategory, scriptName]);

  const handleTemplate = (template: ControlTestTemplate) => {
    setSelectedTemplate(template);
    setSelectedCategory(template.category);
    setConfigType('no_code');
    setConfig(template.default_config || {});
    setPassCriteria(template.pass_criteria || { conditions: [] });
    setSeverity('medium');
    setScriptName(template.template_name);
    setDescription(template.description || '');
    setStep(1);
  };

  useEffect(() => {
    if (open && initialTemplate) {
      handleTemplate(initialTemplate);
    }
  }, [open, initialTemplate]);

  const renderNoCodeBuilder = () => {
    const templateId = selectedTemplate?.template_id || '';
    if (templateId === 'mfa-enforcement') return <MFAEnforcementBuilder value={config} onChange={setConfig} />;
    if (templateId === 'password-policy-check') return <PasswordPolicyBuilder value={config} onChange={setConfig} />;
    if (templateId === 'encryption-at-rest' || templateId === 'encryption-in-transit') {
      return <EncryptionBuilder value={config} onChange={setConfig} />;
    }
    if (templateId === 'antivirus-status-check') return <AntivirusBuilder value={config} onChange={setConfig} />;
    if (templateId === 'patch-compliance-check') return <PatchComplianceBuilder value={config} onChange={setConfig} />;
    return (
      <textarea
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
        rows={6}
        placeholder="Enter configuration JSON"
        value={JSON.stringify(config || {}, null, 2)}
        onChange={(e) => {
          try {
            setConfig(JSON.parse(e.target.value));
          } catch {
            setConfig(config);
          }
        }}
      />
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const scheduleEnabled = schedule.mode === 'scheduled';
    const cron = scheduleEnabled ? toCron(schedule.frequency, schedule.time) : undefined;
    const payload = {
      script_name: scriptName,
      description,
      test_type: selectedTemplate?.test_type || 'custom',
      template_id: selectedTemplate?.template_id,
      category: selectedTemplate?.category || selectedCategory,
      config_type: configType,
      test_config: configType === 'no_code' ? config : undefined,
      language: configType === 'script' ? scriptConfig.language : undefined,
      script_content: configType === 'script' ? scriptConfig.script_content : undefined,
      script_parameters: configType === 'script' ? scriptConfig.script_parameters : undefined,
      pass_criteria: passCriteria,
      severity,
      control_ids: selectedControls,
      schedule_enabled: scheduleEnabled,
      schedule_cron: cron,
      timeout_seconds: configType === 'script' ? scriptConfig.timeout_seconds : 300,
    };

    try {
      if (mode === 'edit' && initialScript?.id) {
        await updateControlTestScript(initialScript.id, payload, tenantId);
      } else if (onCreate) {
        await onCreate(payload);
      } else {
        await createControlTestScript(payload, tenantId);
      }
      onCreated?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit control test' : 'Create control test'}</DialogTitle>
          <div className="mt-3">
            <Tabs value={String(step)} onValueChange={(v) => setStep(Number(v))}>
              <TabsList className="w-full justify-between">
                {STEPS.map((label, idx) => (
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
            <Step1TemplateSelection
              templates={templates}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectTemplate={handleTemplate}
            />
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    configType === 'no_code' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                  onClick={() => setConfigType('no_code')}
                >
                  No-code builder
                </button>
                <button
                  type="button"
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    configType === 'script' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                  onClick={() => setConfigType('script')}
                >
                  Script editor
                </button>
              </div>
              {configType === 'no_code' ? renderNoCodeBuilder() : <Step2ScriptEditor value={scriptConfig} onChange={setScriptConfig} />}
            </div>
          ) : null}

          {step === 2 ? (
            <Step3PassCriteria
              configType={configType}
              value={passCriteria}
              onChange={setPassCriteria}
              severity={severity}
              onSeverityChange={setSeverity}
            />
          ) : null}

          {step === 3 ? (
            <Step4ControlMapping
              tenantId={tenantId}
              name={scriptName}
              description={description}
              onChangeName={setScriptName}
              onChangeDescription={setDescription}
              selectedControls={selectedControls}
              onChangeControls={setSelectedControls}
              schedule={schedule}
              onChangeSchedule={setSchedule}
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
          {step < 3 ? (
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => setStep(step + 1)}
              disabled={!canContinue}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={handleSave}
              disabled={saving || !scriptName.trim()}
            >
              {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create test'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

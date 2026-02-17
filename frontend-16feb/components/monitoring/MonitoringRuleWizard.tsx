"use client";

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getMonitoringCategories,
  getMonitoringTemplates,
  createMonitoringRule,
  testMonitoringRule,
  updateMonitoringRule,
} from '@/lib/api/monitoring-templates';
import Step1CategorySelection, { DEFAULT_CATEGORIES } from '@/components/monitoring/wizard/Step1CategorySelection';
import Step2ConfigureCertificate from '@/components/monitoring/wizard/Step2ConfigureCertificate';
import Step2ConfigureCloudSecurity from '@/components/monitoring/wizard/Step2ConfigureCloudSecurity';
import Step2ConfigureAccessControl from '@/components/monitoring/wizard/Step2ConfigureAccessControl';
import Step2ConfigureCompliance from '@/components/monitoring/wizard/Step2ConfigureCompliance';
import Step2ConfigureEndpoint from '@/components/monitoring/wizard/Step2ConfigureEndpoint';
import Step3AlertConfig from '@/components/monitoring/wizard/Step3AlertConfig';
import Step4Review from '@/components/monitoring/wizard/Step4Review';
import type { MonitoringRule, MonitoringTemplate } from '@/types/monitoring';

const STEPS = ['Select', 'Configure', 'Alerts', 'Review'];

export default function MonitoringRuleWizard(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
  onCreated?: () => void;
  onCreate?: (data: any) => Promise<void>;
  mode?: 'create' | 'edit';
  initialRule?: MonitoringRule | null;
}) {
  const { open, onOpenChange, tenantId, onCreated, onCreate, mode = 'create', initialRule } = props;
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<MonitoringTemplate[]>([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MonitoringTemplate | null>(null);
  const [config, setConfig] = useState<any>({});
  const [alertConfig, setAlertConfig] = useState<any>({ severity: 'medium', check_frequency_minutes: 60, notification: { channels: ['email'] } });
  const [ruleName, setRuleName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    async function load() {
      const [templatesRes, categoriesRes] = await Promise.allSettled([
        getMonitoringTemplates(undefined, tenantId),
        getMonitoringCategories(tenantId),
      ]);
      if (!active) return;
      if (templatesRes.status === 'fulfilled') {
        setTemplates(Array.isArray(templatesRes.value?.items) ? templatesRes.value.items : []);
      }
      if (categoriesRes.status === 'fulfilled') {
        const items = Array.isArray(categoriesRes.value?.items) ? categoriesRes.value.items : [];
        if (items.length) {
          setCategories(
            DEFAULT_CATEGORIES.map((c) => ({
              ...c,
              templateCount: Number(items.find((i: any) => i.category === c.id)?.count || c.templateCount),
            }))
          );
        }
      }
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
      setConfig({});
      setAlertConfig({ severity: 'medium', check_frequency_minutes: 60, notification: { channels: ['email'] } });
      setRuleName('');
      setDescription('');
      setTestResult(null);
      setTestError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !initialRule) return;
    setSelectedCategory(initialRule.category);
    setSelectedTemplate(null);
    setConfig(initialRule.config || {});
    setRuleName(initialRule.rule_name || '');
    setDescription(initialRule.description || '');
    setAlertConfig({
      severity: initialRule.severity || 'medium',
      check_frequency_minutes: initialRule.check_frequency_minutes || 60,
      notification: { channels: initialRule.notification_channels || ['email'] },
    });
    setStep(1);
  }, [open, initialRule]);

  useEffect(() => {
    if (!initialRule?.template_id || selectedTemplate) return;
    const match = templates.find((t) => t.template_id === initialRule.template_id);
    if (match) setSelectedTemplate(match);
  }, [templates, initialRule, selectedTemplate]);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(selectedCategory || selectedTemplate);
    if (step === 3) return Boolean(ruleName.trim());
    return true;
  }, [step, selectedCategory, selectedTemplate, ruleName]);

  const onSelectTemplate = (template: MonitoringTemplate) => {
    setSelectedTemplate(template);
    setSelectedCategory(template.category);
    setConfig(template.default_config || {});
    setRuleName(template.template_name);
    setDescription(template.description || '');
    setAlertConfig({
      severity: template.severity || 'medium',
      check_frequency_minutes: template.check_frequency_minutes || 60,
      notification: { channels: template.notification_channels || ['email'] },
    });
    setStep(1);
  };

  const renderConfigureStep = () => {
    const category = selectedTemplate?.category || selectedCategory;
    if (category === 'security') return <Step2ConfigureCertificate template={selectedTemplate} value={config} onChange={setConfig} />;
    if (category === 'cloud') return <Step2ConfigureCloudSecurity template={selectedTemplate} value={config} onChange={setConfig} />;
    if (category === 'access') return <Step2ConfigureAccessControl template={selectedTemplate} value={config} onChange={setConfig} />;
    if (category === 'compliance') return <Step2ConfigureCompliance template={selectedTemplate} value={config} onChange={setConfig} />;
    if (category === 'endpoint') return <Step2ConfigureEndpoint template={selectedTemplate} value={config} onChange={setConfig} />;
    return <div className="text-sm text-gray-500">Choose a category to continue.</div>;
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestError(null);
    try {
      const id = selectedTemplate?.template_id || 'preview';
      const res = await testMonitoringRule(id, config, tenantId);
      setTestResult(res?.result || res);
    } catch (err: any) {
      setTestError(err?.message || 'Unable to run test.');
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        rule_name: ruleName,
        description,
        category: selectedTemplate?.category || selectedCategory,
        rule_type: selectedTemplate?.rule_type || initialRule?.rule_type || 'custom',
        template_id: selectedTemplate?.template_id || initialRule?.template_id,
        config,
        check_frequency_minutes: alertConfig.check_frequency_minutes || 60,
        severity: alertConfig.severity || 'medium',
        threshold_value: alertConfig.threshold_value,
        conditions: alertConfig.conditions,
        notification_channels: alertConfig.notification?.channels || [],
        notification_enabled: true,
        is_active: true,
      };

      if (mode === 'edit' && initialRule?.id) {
        await updateMonitoringRule(initialRule.id, payload, tenantId);
      } else if (onCreate) {
        await onCreate(payload);
      } else {
        await createMonitoringRule(payload, tenantId);
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
          <DialogTitle>Create monitoring rule</DialogTitle>
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
            <Step1CategorySelection
              categories={categories}
              templates={templates}
              selectedCategory={selectedCategory}
              onSelectCategory={(id) => {
                setSelectedCategory(id);
                setSelectedTemplate(null);
              }}
              onSelectTemplate={onSelectTemplate}
            />
          ) : null}
          {step === 1 ? renderConfigureStep() : null}
          {step === 2 ? <Step3AlertConfig value={alertConfig} onChange={setAlertConfig} /> : null}
          {step === 3 ? (
            <Step4Review
              ruleName={ruleName}
              description={description}
              category={selectedTemplate?.category || selectedCategory}
              templateName={selectedTemplate?.template_name || null}
              config={config}
              alertConfig={alertConfig}
              onNameChange={setRuleName}
              onDescriptionChange={setDescription}
              onTest={handleTest}
              testLoading={testLoading}
              testResult={testResult}
              testError={testError}
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
              disabled={saving || !ruleName.trim()}
            >
              {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Activate rule'}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import RuleTestRunner from '@/components/monitoring/RuleTestRunner';

export default function Step4Review(props: {
  ruleName: string;
  description: string;
  category?: string | null;
  templateName?: string | null;
  config: any;
  alertConfig: any;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTest: () => Promise<void>;
  testLoading: boolean;
  testResult?: any;
  testError?: string | null;
}) {
  const {
    ruleName,
    description,
    category,
    templateName,
    config,
    alertConfig,
    onNameChange,
    onDescriptionChange,
    onTest,
    testLoading,
    testResult,
    testError,
  } = props;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-gray-900">Rule summary</div>
        <div className="text-xs text-gray-500">Review the configuration before activation.</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600">Rule name</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={ruleName}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Description</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
        <div>Category: {category || 'N/A'}</div>
        <div>Template: {templateName || 'Custom rule'}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
          <div className="text-sm font-semibold text-gray-900 mb-2">Configuration</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(config || {}, null, 2)}</pre>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600">
          <div className="text-sm font-semibold text-gray-900 mb-2">Alert settings</div>
          <pre className="whitespace-pre-wrap">{JSON.stringify(alertConfig || {}, null, 2)}</pre>
        </div>
      </div>

      <RuleTestRunner onRun={onTest} loading={testLoading} result={testResult} error={testError} />
    </div>
  );
}

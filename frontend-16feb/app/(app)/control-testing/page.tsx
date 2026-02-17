'use client';

import { Loading } from '@/components/ui/Loading';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ControlTest = {
  id: string;
  control_code?: string;
  control_title?: string;
  framework?: string;
  test_name?: string;
  test_type?: string;
  status?: string;
  tested_by?: string;
  reviewed_by?: string;
  test_date?: string;
  next_test_date?: string;
  is_recurring?: boolean;
};

type TestCreateForm = {
  controlCode: string;
  framework: string;
  testName: string;
  testType: 'manual' | 'automated' | 'interview' | 'observation';
  testDescription: string;
  testProcedure: string;
  expectedResult: string;
  passFailCriteria: string;
  isRecurring: boolean;
  testFrequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  nextTestDate: string;
};

type ExecutionForm = {
  actualResult: string;
  status: 'passed' | 'failed' | 'not_applicable';
  findings: string;
  remediationNotes: string;
};

function statusVariant(status?: string) {
  switch (status) {
    case 'passed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'in_progress':
      return 'info';
    case 'not_applicable':
      return 'neutral';
    default:
      return 'warning';
  }
}

export default function ControlTestingPage() {
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';

  const [tests, setTests] = useState<ControlTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dueSoon, setDueSoon] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingError, setCreatingError] = useState('');
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const [createForm, setCreateForm] = useState<TestCreateForm>({
    controlCode: '',
    framework: 'iso27001',
    testName: '',
    testType: 'manual',
    testDescription: '',
    testProcedure: '',
    expectedResult: '',
    passFailCriteria: '',
    isRecurring: false,
    testFrequency: 'monthly',
    nextTestDate: '',
  });

  const [executionForm, setExecutionForm] = useState<ExecutionForm>({
    actualResult: '',
    status: 'passed',
    findings: '',
    remediationNotes: '',
  });

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dueSoon, page, tenantId]);

  async function fetchTests() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (dueSoon) params.set('due_soon', 'true');

      const res = await fetch(`/api/control-testing/tests?${params.toString()}`, {
        credentials: 'include',
        headers: { 'x-tenant-id': tenantId },
      });
      const data = await res.json();
      setTests(data.tests || []);
      setTotal(Number(data.total || 0));
    } catch (err: any) {
      setError(err?.message || 'Failed to load tests');
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const pending = tests.filter((t) => t.status === 'pending').length;
    const inProgress = tests.filter((t) => t.status === 'in_progress').length;
    const passed = tests.filter((t) => t.status === 'passed').length;
    const failed = tests.filter((t) => t.status === 'failed').length;
    return { pending, inProgress, passed, failed };
  }, [tests]);

  function updateCreateField<K extends keyof TestCreateForm>(key: K, value: TestCreateForm[K]) {
    setCreateForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateExecutionField<K extends keyof ExecutionForm>(key: K, value: ExecutionForm[K]) {
    setExecutionForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createTest() {
    setCreatingError('');
    if (!createForm.controlCode.trim() || !createForm.testName.trim()) {
      setCreatingError('Control code and test name are required.');
      return;
    }

    setSaving(true);
    try {
      await fetch('/api/control-testing/tests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          control_code: createForm.controlCode.trim(),
          framework: createForm.framework,
          test_name: createForm.testName.trim(),
          test_description: createForm.testDescription || undefined,
          test_type: createForm.testType,
          test_procedure: createForm.testProcedure || undefined,
          expected_result: createForm.expectedResult || undefined,
          pass_fail_criteria: createForm.passFailCriteria || undefined,
          is_recurring: createForm.isRecurring,
          test_frequency: createForm.isRecurring ? createForm.testFrequency : undefined,
          next_test_date: createForm.nextTestDate || undefined,
        }),
      });

      setShowCreate(false);
      setCreateForm({
        controlCode: '',
        framework: createForm.framework,
        testName: '',
        testType: 'manual',
        testDescription: '',
        testProcedure: '',
        expectedResult: '',
        passFailCriteria: '',
        isRecurring: false,
        testFrequency: 'monthly',
        nextTestDate: '',
      });
      await fetchTests();
    } catch (err: any) {
      setCreatingError(err?.message || 'Failed to create test');
    } finally {
      setSaving(false);
    }
  }

  async function executeTest(testId: string) {
    if (!executionForm.actualResult.trim()) return;

    setExecuting(true);
    try {
      await fetch(`/api/control-testing/tests/${encodeURIComponent(testId)}/execute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId },
        body: JSON.stringify({
          actual_result: executionForm.actualResult.trim(),
          status: executionForm.status,
          findings: executionForm.findings || undefined,
          remediation_notes: executionForm.remediationNotes || undefined,
        }),
      });

      setActiveExecutionId(null);
      setExecutionForm({ actualResult: '', status: 'passed', findings: '', remediationNotes: '' });
      await fetchTests();
    } catch (err) {
      setError('Failed to execute test');
    } finally {
      setExecuting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Control Testing</h1>
          <p className="text-sm text-gray-600 mt-1">Run manual tests, track results, and schedule recurring reviews.</p>
        </div>
        <Button onClick={() => setShowCreate((prev) => !prev)} variant="primary">
          {showCreate ? 'Close' : 'Create Test'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-semibold">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">In Progress</div>
          <div className="text-2xl font-semibold">{stats.inProgress}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Passed</div>
          <div className="text-2xl font-semibold">{stats.passed}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600">Failed</div>
          <div className="text-2xl font-semibold">{stats.failed}</div>
        </Card>
      </div>

      {showCreate ? (
        <Card className="p-6 space-y-4">
          <div className="text-lg font-semibold">Create Manual Test</div>
          {creatingError ? <div className="text-sm text-red-600">{creatingError}</div> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Control Code</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.controlCode}
                onChange={(e) => updateCreateField('controlCode', e.target.value)}
                placeholder="A.5.1 or CC6.1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Framework</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.framework}
                onChange={(e) => updateCreateField('framework', e.target.value)}
              >
                <option value="iso27001">ISO 27001</option>
                <option value="soc2">SOC 2</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Test Name</label>
              <input
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.testName}
                onChange={(e) => updateCreateField('testName', e.target.value)}
                placeholder="Access review"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Test Type</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.testType}
                onChange={(e) => updateCreateField('testType', e.target.value as TestCreateForm['testType'])}
              >
                <option value="manual">Manual</option>
                <option value="automated">Automated</option>
                <option value="interview">Interview</option>
                <option value="observation">Observation</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Test Description</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.testDescription}
                onChange={(e) => updateCreateField('testDescription', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Test Procedure</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.testProcedure}
                onChange={(e) => updateCreateField('testProcedure', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expected Result</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.expectedResult}
                onChange={(e) => updateCreateField('expectedResult', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Pass/Fail Criteria</label>
              <textarea
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.passFailCriteria}
                onChange={(e) => updateCreateField('passFailCriteria', e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={createForm.isRecurring}
                onChange={(e) => updateCreateField('isRecurring', e.target.checked)}
              />
              <label className="text-sm font-medium">Recurring Test</label>
            </div>
            <div>
              <label className="text-sm font-medium">Frequency</label>
              <select
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.testFrequency}
                onChange={(e) => updateCreateField('testFrequency', e.target.value as TestCreateForm['testFrequency'])}
                disabled={!createForm.isRecurring}
              >
                <option value="once">Once</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Next Test Date</label>
              <input
                type="date"
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                value={createForm.nextTestDate}
                onChange={(e) => updateCreateField('nextTestDate', e.target.value)}
                disabled={!createForm.isRecurring}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={createTest} loading={saving}>
              Create Test
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {['all', 'pending', 'in_progress', 'passed', 'failed', 'not_applicable'].map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'default' : 'outline'}
            onClick={() => {
              setStatusFilter(status);
              setPage(1);
            }}
          >
            {status.replace('_', ' ')}
          </Button>
        ))}
        <Button
          size="sm"
          variant={dueSoon ? 'default' : 'outline'}
          onClick={() => {
            setDueSoon((prev) => !prev);
            setPage(1);
          }}
        >
          Due Soon
        </Button>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="space-y-3">
        {loading ? (
          <Loading />
        ) : tests.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">No tests found</Card>
        ) : (
          tests.map((test) => {
            const isActive = activeExecutionId === test.id;
            return (
              <Card key={test.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="font-semibold">{test.test_name || 'Control Test'}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {(test.framework || 'framework').toUpperCase()}: {test.control_code || 'control'} -{' '}
                      {test.control_title || 'Untitled control'}
                    </div>
                    <div className="text-sm mt-2 text-gray-700">
                      Type: {test.test_type || 'manual'} | Tested by: {test.tested_by || 'Unassigned'}
                    </div>
                    {test.next_test_date ? (
                      <div className="text-sm text-gray-600 mt-1">
                        Next test: {new Date(test.next_test_date).toLocaleDateString()}
                      </div>
                    ) : null}
                    {test.test_date ? (
                      <div className="text-sm text-gray-600 mt-1">
                        Last executed: {new Date(test.test_date).toLocaleDateString()}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(test.status)}>{test.status || 'pending'}</Badge>
                    {(test.status === 'pending' || test.status === 'in_progress') && (
                      <Button size="sm" onClick={() => setActiveExecutionId(test.id)}>
                        Execute
                      </Button>
                    )}
                  </div>
                </div>

                {isActive ? (
                  <div className="border-t pt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Actual Result</label>
                        <textarea
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={executionForm.actualResult}
                          onChange={(e) => updateExecutionField('actualResult', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <select
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={executionForm.status}
                          onChange={(e) => updateExecutionField('status', e.target.value as ExecutionForm['status'])}
                        >
                          <option value="passed">Passed</option>
                          <option value="failed">Failed</option>
                          <option value="not_applicable">Not Applicable</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Findings</label>
                        <textarea
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={executionForm.findings}
                          onChange={(e) => updateExecutionField('findings', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Remediation Notes</label>
                        <textarea
                          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                          value={executionForm.remediationNotes}
                          onChange={(e) => updateExecutionField('remediationNotes', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={() => executeTest(test.id)} loading={executing}>
                        Submit Result
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActiveExecutionId(null);
                          setExecutionForm({ actualResult: '', status: 'passed', findings: '', remediationNotes: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Page {page} of {totalPages} ({total} tests)
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

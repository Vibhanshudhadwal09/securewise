'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

async function fetchJson(url: string, tenantId: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', 'x-tenant-id': tenantId, ...(init?.headers || {}) },
    cache: 'no-store',
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
  return json as any;
}

export default function AuditReportPage() {
  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(['iso27001']);
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeTests, setIncludeTests] = useState(true);
  const [includeCrosswalk, setIncludeCrosswalk] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchHistory() {
    try {
      setError(null);
      const data = await fetchJson('/api/audit-reports/history', tenantId);
      const reports = Array.isArray(data?.reports) ? data.reports : [];
      setHistory(reports);
    } catch (e: any) {
      setError(e?.message || 'Failed to load report history');
    }
  }

  function toggleFramework(framework: string) {
    if (selectedFrameworks.includes(framework)) {
      setSelectedFrameworks(selectedFrameworks.filter((f) => f !== framework));
    } else {
      setSelectedFrameworks([...selectedFrameworks, framework]);
    }
  }

  async function generateReport() {
    if (selectedFrameworks.length === 0) {
      setError('Select at least one framework.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetchJson('/api/audit-reports/generate', tenantId, {
        method: 'POST',
        body: JSON.stringify({
          frameworks: selectedFrameworks,
          startDate,
          endDate,
          includeEvidence,
          includeTests,
          includeCrosswalk: selectedFrameworks.length > 1 ? includeCrosswalk : false,
        }),
      });
      if (res?.downloadUrl) window.open(res.downloadUrl, '_blank');
      await fetchHistory();
    } catch (e: any) {
      setError(e?.message || 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Report Generator</h1>
        <p className="text-gray-600 mt-2">Generate audit packages for ISO 27001 and SOC 2.</p>
      </div>

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={() => {
            setSelectedFrameworks(['iso27001']);
            setIncludeCrosswalk(false);
          }}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <span className="text-lg font-semibold">ISO 27001 Only</span>
          <span className="text-xs text-gray-600">Generate ISO report</span>
        </Button>
        <Button
          onClick={() => {
            setSelectedFrameworks(['soc2']);
            setIncludeCrosswalk(false);
          }}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <span className="text-lg font-semibold">SOC 2 Only</span>
          <span className="text-xs text-gray-600">Generate SOC 2 report</span>
        </Button>
        <Button
          onClick={() => {
            setSelectedFrameworks(['iso27001', 'soc2']);
            setIncludeCrosswalk(true);
          }}
          variant="outline"
          className="h-auto py-4 flex flex-col items-center gap-2"
        >
          <span className="text-lg font-semibold">Combined Report</span>
          <span className="text-xs text-gray-600">ISO + SOC 2 with crosswalk</span>
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Custom Report Configuration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Framework Selection</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedFrameworks.includes('iso27001')} onChange={() => toggleFramework('iso27001')} />
                <div>
                  <div className="font-medium">ISO/IEC 27001:2022</div>
                  <div className="text-xs text-gray-600">Information security management system</div>
                </div>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedFrameworks.includes('soc2')} onChange={() => toggleFramework('soc2')} />
                <div>
                  <div className="font-medium">SOC 2 Type II</div>
                  <div className="text-xs text-gray-600">Service organization controls</div>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-2">Report Contents</label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeEvidence} onChange={(e) => setIncludeEvidence(e.target.checked)} />
              <span className="text-sm">Include Evidence Inventory</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeTests} onChange={(e) => setIncludeTests(e.target.checked)} />
              <span className="text-sm">Include Test Results</span>
            </label>
            {selectedFrameworks.length > 1 ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeCrosswalk} onChange={(e) => setIncludeCrosswalk(e.target.checked)} />
                <span className="text-sm">Include Cross-Framework Mapping</span>
              </label>
            ) : null}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <div className="text-sm text-blue-900">
              Generating {selectedFrameworks.length === 2 ? 'combined' : selectedFrameworks[0]?.toUpperCase()} report for{' '}
              {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}
            </div>
          </div>

          <Button onClick={generateReport} disabled={generating || selectedFrameworks.length === 0} className="w-full mt-4" size="lg">
            {generating
              ? 'Generating Report...'
              : `Generate ${selectedFrameworks.length === 2 ? 'Combined' : selectedFrameworks[0]?.toUpperCase()} Audit Report (PDF)`}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Report History</h2>
        {history.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No reports generated yet</p>
        ) : (
          <div className="space-y-3">
            {history.map((report) => {
              const metadata = typeof report.metadata === 'string' ? JSON.parse(report.metadata) : report.metadata || {};
              const frameworks = metadata.frameworks || [report.framework];
              return (
                <div key={report.id} className="flex items-center justify-between p-4 border rounded hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {frameworks.map((f: string) => (
                        <Badge key={f} variant="neutral">
                          {String(f).toUpperCase()}
                        </Badge>
                      ))}
                      {metadata.includeCrosswalk ? <Badge variant="info">Crosswalk</Badge> : null}
                    </div>
                    <div className="text-sm text-gray-600">
                      Generated: {report.generated_at ? new Date(report.generated_at).toLocaleString() : 'Unknown'} by {report.created_by || 'System'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Period: {metadata.startDate ? new Date(metadata.startDate).toLocaleDateString() : 'N/A'} -{' '}
                      {metadata.endDate ? new Date(metadata.endDate).toLocaleDateString() : 'N/A'} | Size:{' '}
                      {report.file_size ? (report.file_size / 1024 / 1024).toFixed(2) : '0'} MB
                    </div>
                  </div>
                  <Button onClick={() => window.open(`/api/audit-reports/${report.id}/download`, '_blank')} size="sm">
                    Download PDF
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

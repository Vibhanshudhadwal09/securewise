import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
  title: 'SecureWise Test Plan',
};

export default function TestPlanPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SecureWise Test Plan & Checklist</h1>
        <p className="text-gray-600">
          Download the full QA checklist covering all features, workflows, and use cases.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">PDF Test Plan</h2>
              <p className="text-sm text-gray-600">Printable overview of all test cases.</p>
            </div>
            <Badge variant="info">PDF</Badge>
          </div>
          <a
            href="/api/test-plan/pdf"
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Download PDF
          </a>
        </Card>

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Excel Checklist</h2>
              <p className="text-sm text-gray-600">Track progress and assign owners.</p>
            </div>
            <Badge variant="success">XLSX</Badge>
          </div>
          <a
            href="/api/test-plan/excel"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Download Excel
          </a>
        </Card>
      </div>

      <Card className="p-5 space-y-2">
        <h3 className="text-base font-semibold text-gray-900">Quick Links</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="/api/test-plan/json" className="text-blue-600 hover:underline">
            View JSON
          </a>
          <span className="text-gray-300">•</span>
          <span className="text-gray-600">Requires admin session</span>
        </div>
      </Card>
    </div>
  );
}

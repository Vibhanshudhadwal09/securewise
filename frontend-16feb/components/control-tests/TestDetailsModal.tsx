"use client";

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ControlTestExecution, ControlTestScript } from '@/types/control-tests';

export default function TestDetailsModal(props: {
  script: ControlTestScript | null;
  executions: ControlTestExecution[];
  onClose: () => void;
  onEdit?: () => void;
}) {
  const { script, executions, onClose, onEdit } = props;

  return (
    <Dialog open={Boolean(script)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Test details</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {script ? (
            <div className="space-y-4 text-sm text-gray-600">
              <div className="text-lg font-semibold text-gray-900">{script.script_name}</div>
              <div>{script.description || 'No description'}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>Category: {script.category}</div>
                <div>Type: {script.test_type}</div>
                <div>Severity: {script.severity}</div>
                <div>Schedule: {script.schedule_enabled ? script.schedule_cron || 'Scheduled' : 'Manual'}</div>
              </div>
              <div className="rounded-md bg-gray-50 p-3 text-xs">
                <div className="font-semibold mb-2 text-gray-800">Configuration</div>
                <pre className="whitespace-pre-wrap">{JSON.stringify(script.test_config || {}, null, 2)}</pre>
              </div>
              <div className="rounded-md bg-gray-50 p-3 text-xs">
                <div className="font-semibold mb-2 text-gray-800">Pass criteria</div>
                <pre className="whitespace-pre-wrap">{JSON.stringify(script.pass_criteria || {}, null, 2)}</pre>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">Latest executions</div>
                <div className="mt-2 space-y-2">
                  {executions.slice(0, 10).map((exec) => (
                    <div key={exec.id} className="rounded-md border border-gray-200 p-2 text-xs text-gray-600">
                      <div>{exec.started_at}</div>
                      <div>Status: {exec.status}</div>
                      <div>Duration: {exec.duration_ms || 0} ms</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={onEdit}
                >
                  Edit test
                </button>
              </div>
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

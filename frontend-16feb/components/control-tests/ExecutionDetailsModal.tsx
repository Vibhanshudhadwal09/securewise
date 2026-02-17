"use client";

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ControlTestExecution } from '@/types/control-tests';

export default function ExecutionDetailsModal(props: {
  execution: ControlTestExecution | null;
  onClose: () => void;
}) {
  const { execution, onClose } = props;

  return (
    <Dialog open={Boolean(execution)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Execution details</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {execution ? (
            <div className="space-y-4 text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>Started: {execution.started_at}</div>
                <div>Status: {execution.status}</div>
                <div>Duration: {execution.duration_ms || 0} ms</div>
                <div>Result: {execution.test_result}</div>
              </div>
              <div className="rounded-md bg-gray-50 p-3 text-xs">
                <div className="font-semibold mb-2 text-gray-800">Details</div>
                <pre className="whitespace-pre-wrap">{JSON.stringify(execution.details || {}, null, 2)}</pre>
              </div>
              {execution.output ? (
                <div className="rounded-md bg-gray-50 p-3 text-xs">
                  <div className="font-semibold mb-2 text-gray-800">Output</div>
                  <pre className="whitespace-pre-wrap">{execution.output}</pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

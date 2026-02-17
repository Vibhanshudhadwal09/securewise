'use client';

import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { MonitoringAlert } from '@/types/monitoring';

export default function AlertDetailsModal(props: {
  alert: MonitoringAlert | null;
  onClose: () => void;
}) {
  const { alert, onClose } = props;

  return (
    <Dialog open={Boolean(alert)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alert details</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {alert ? (
            <div className="space-y-3 text-sm text-gray-600">
              <div className="text-base font-semibold text-gray-900">{alert.rule_name}</div>
              <div>{alert.message}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>Severity: {alert.severity}</div>
                <div>Status: {alert.status}</div>
                <div>Resource: {alert.affected_resource || 'N/A'}</div>
                <div>Detected: {alert.detected_at}</div>
              </div>
              <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-700">
                <pre className="whitespace-pre-wrap">{JSON.stringify(alert.details || {}, null, 2)}</pre>
              </div>
              <div className="rounded-md border border-gray-200 p-3 text-xs text-gray-600">
                Recommended next step: confirm configuration, then apply remediation in your source system.
              </div>
            </div>
          ) : null}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

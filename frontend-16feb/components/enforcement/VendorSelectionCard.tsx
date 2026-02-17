import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';

export function VendorSelectionCard(props: {
  vendor?: string;
  score?: number;
  reasoning?: string;
  warnings?: string[];
}) {
  const warnings = props.warnings || [];
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Selected Vendor</p>
          <p className="text-lg font-semibold text-gray-900">{props.vendor || '-'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Score</p>
          <p className="text-lg font-semibold text-blue-600">{props.score ?? '-'}</p>
        </div>
      </div>
      {props.reasoning ? <p className="text-sm text-gray-600">{props.reasoning}</p> : null}
      {warnings.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {warnings.map((w) => (
            <Badge key={w} variant="warning">
              {w}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">No warnings for this selection.</p>
      )}
    </Card>
  );
}

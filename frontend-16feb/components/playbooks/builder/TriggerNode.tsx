"use client";

import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

type PlaybookNode = Node<{ config?: Record<string, any> }>;

function TriggerNode({ data, selected }: NodeProps<PlaybookNode>) {
  const config = data?.config || {};
  const triggerType = config.triggerType || 'violation';
  const severity = Array.isArray(config.conditions?.severity)
    ? config.conditions.severity.join(', ')
    : 'Any';

  return (
    <div
      className={`rounded-lg border-2 ${selected ? 'border-green-500' : 'border-green-200'} bg-green-50 p-4 min-w-[200px] shadow-sm`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Play className="h-4 w-4 text-green-700" />
        <span className="text-sm font-semibold text-green-900">Trigger</span>
      </div>
      <div className="text-xs text-gray-700 space-y-1">
        <div>Type: {triggerType}</div>
        {triggerType === 'violation' ? <div>Severity: {severity || 'Any'}</div> : null}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500" />
    </div>
  );
}

export default memo(TriggerNode);

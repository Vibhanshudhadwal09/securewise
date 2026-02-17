"use client";

import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

type PlaybookNode = Node<{ config?: Record<string, any> }>;

function ConditionNode({ data, selected }: NodeProps<PlaybookNode>) {
  const config = data?.config || {};
  const field = config.field || 'Select field';
  const operator = config.operator || 'equals';
  const value = config.value || 'value';

  return (
    <div
      className={`rounded-lg border-2 ${selected ? 'border-yellow-500' : 'border-yellow-200'} bg-yellow-50 p-4 min-w-[200px] shadow-sm`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500" />
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-4 w-4 text-yellow-700" />
        <span className="text-sm font-semibold text-yellow-900">Condition</span>
      </div>
      <div className="text-xs text-gray-700 font-mono">
        {field} {operator} {value}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500" />
    </div>
  );
}

export default memo(ConditionNode);

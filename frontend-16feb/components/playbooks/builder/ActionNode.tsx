"use client";

import React, { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

const vendorColors: Record<string, string> = {
  wazuh: 'text-blue-700',
  okta: 'text-purple-700',
  crowdstrike: 'text-red-700',
  palo_alto: 'text-orange-700',
  servicenow: 'text-green-700',
};

type PlaybookNode = Node<{ config?: Record<string, any> }>;

function ActionNode({ data, selected }: NodeProps<PlaybookNode>) {
  const config = data?.config || {};
  const vendor = config.vendor || 'wazuh';
  const actionType = config.actionType || 'send_alert';
  const vendorClass = vendorColors[vendor] || 'text-gray-700';

  return (
    <div
      className={`rounded-lg border-2 ${selected ? 'border-blue-500' : 'border-blue-200'} bg-blue-50 p-4 min-w-[200px] shadow-sm`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-blue-700" />
        <span className="text-sm font-semibold text-blue-900">Action</span>
      </div>
      <div className="text-xs">
        <div className={`font-semibold uppercase ${vendorClass}`}>{vendor}</div>
        <div className="text-gray-700 mt-1">{actionType.replace(/_/g, ' ')}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
    </div>
  );
}

export default memo(ActionNode);

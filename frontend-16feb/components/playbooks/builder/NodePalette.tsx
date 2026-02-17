"use client";

import React from 'react';
import { GitBranch, Play, Zap } from 'lucide-react';

type NodeType = {
  type: 'trigger' | 'condition' | 'action';
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
};

const nodeTypes: NodeType[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Start point for playbook',
    icon: <Play className="h-4 w-4 text-green-700" />,
    color: 'bg-green-50 border-green-200',
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Add if-then logic',
    icon: <GitBranch className="h-4 w-4 text-yellow-700" />,
    color: 'bg-yellow-50 border-yellow-200',
  },
  {
    type: 'action',
    label: 'Action',
    description: 'Execute enforcement action',
    icon: <Zap className="h-4 w-4 text-blue-700" />,
    color: 'bg-blue-50 border-blue-200',
  },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Node Types</h3>
        <p className="text-xs text-gray-500 mt-1">Drag nodes into the canvas.</p>
      </div>

      <div className="space-y-3">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className={`${node.color} border-2 rounded-lg p-3 cursor-move hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center gap-2">
              {node.icon}
              <span className="text-sm font-semibold text-gray-900">{node.label}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">{node.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
        Tip: Connect nodes by dragging from the handles.
      </div>
    </aside>
  );
}

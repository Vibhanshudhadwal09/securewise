'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/Toast';
import NodePalette from '@/components/playbooks/builder/NodePalette';
import TriggerNode from '@/components/playbooks/builder/TriggerNode';
import ConditionNode from '@/components/playbooks/builder/ConditionNode';
import ActionNode from '@/components/playbooks/builder/ActionNode';
import NodeConfigPanel from '@/components/playbooks/builder/NodeConfigPanel';
import ControlSelector from '@/components/playbooks/builder/ControlSelector';

type PlaybookResponse = {
  playbook: {
    playbook_id: string;
    name: string;
    description?: string;
    category?: string;
    enabled?: boolean;
    trigger_type?: string;
    trigger_config?: any;
    workflow?: { nodes?: any[]; edges?: any[] };
    linked_control_ids?: string[];
  };
};

type PlaybookNodeData = {
  label?: string;
  config?: Record<string, any>;
};

type PlaybookNode = Node<PlaybookNodeData>;

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cur = String(document.cookie || '');
  const cookie = cur.split('; ').find((row) => row.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
}

function defaultConfig(type: string) {
  switch (type) {
    case 'trigger':
      return { triggerType: 'violation', conditions: { severity: ['critical'] } };
    case 'condition':
      return { field: '', operator: 'equals', value: '' };
    case 'action':
      return { vendor: 'wazuh', actionType: 'send_alert', parameters: { target: '{{signal.asset_id}}' } };
    default:
      return {};
  }
}

function buildWorkflow(nodes: PlaybookNode[], edges: Edge[]) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      config: node.data?.config || {},
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    })),
  };
}

function normalizeConfig(type: string | undefined, config: any) {
  if (!config || typeof config !== 'object') return config;
  if (type === 'action') {
    return {
      ...config,
      actionType: config.actionType || config.action_type,
      parameters: config.parameters || config.params || {},
      vendor: config.vendor || config.adapter || 'wazuh',
    };
  }
  if (type === 'trigger') {
    return {
      ...config,
      triggerType: config.triggerType || config.type || 'violation',
      conditions: config.conditions || (config.severity ? { severity: config.severity } : {}),
    };
  }
  return config;
}

export default function PlaybookBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [tenantId, setTenantId] = useState('demo-tenant');
  const [nodes, setNodes, onNodesChange] = useNodesState<PlaybookNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<PlaybookNode | null>(null);
  const [playbookId, setPlaybookId] = useState<string | null>(null);
  const [playbookName, setPlaybookName] = useState('New Playbook');
  const [playbookDescription, setPlaybookDescription] = useState('');
  const [playbookCategory, setPlaybookCategory] = useState('security_response');
  const [linkedControlIds, setLinkedControlIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<{ type: 'warning' | 'error'; message: string } | null>(null);
  const flowWrapper = useRef<HTMLDivElement | null>(null);
  const reactFlowInstance = useRef<any>(null);

  useEffect(() => {
    setTenantId(readCookie('sw_tenant') || 'demo-tenant');
  }, []);

  useEffect(() => {
    const id = searchParams?.get('playbook') || searchParams?.get('id');
    if (!id) return;
    setPlaybookId(id);
  }, [searchParams]);

  useEffect(() => {
    if (!playbookId || !tenantId) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/playbooks/${encodeURIComponent(playbookId)}`, {
          headers: { 'x-tenant-id': tenantId },
          credentials: 'include',
        });
        const data: PlaybookResponse = await res.json().catch(() => ({} as any));
        if (!res.ok) throw new Error((data as any)?.error || `Failed to load playbook (${res.status})`);
        const playbook = data.playbook;
        setPlaybookName(playbook.name || 'Playbook');
        setPlaybookDescription(playbook.description || '');
        setPlaybookCategory(playbook.category || 'security_response');
        setLinkedControlIds(Array.isArray(playbook.linked_control_ids) ? playbook.linked_control_ids : []);
        const workflow = playbook.workflow || { nodes: [], edges: [] };
        const loadedNodes = (workflow.nodes || []).map((node: any) => ({
          id: node.id,
          type: node.type,
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.type,
            config: normalizeConfig(node.type, node.config || {}),
          },
        })) as PlaybookNode[];
        const loadedEdges = (workflow.edges || []).map((edge: any) => ({
          id: edge.id || `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
        }));
        setNodes(loadedNodes);
        setEdges(loadedEdges);
      } catch (err: any) {
        toast.error('Failed to load playbook', err?.message || 'Please try again');
      }
    };
    load();
  }, [playbookId, tenantId, setNodes, setEdges, toast]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;
      if (sourceNode.type === 'action') {
        toast.error('Invalid connection', 'Actions cannot be a source node.');
        return;
      }
      if (targetNode.type === 'trigger') {
        toast.error('Invalid connection', 'Triggers cannot have incoming edges.');
        return;
      }
      setEdges((eds) => addEdge(connection, eds));
    },
    [nodes, setEdges, toast]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !flowWrapper.current) return;

      const bounds = flowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current?.screenToFlowPosition
        ? reactFlowInstance.current.screenToFlowPosition({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          })
        : reactFlowInstance.current?.project
          ? reactFlowInstance.current.project({
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            })
          : { x: 0, y: 0 };

      const newNode: PlaybookNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type} node`,
          config: defaultConfig(type),
        },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, config: any) => {
      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, config } } : node))
      );
    },
    [setNodes]
  );

  const validateWorkflow = useCallback(() => {
    if (nodes.length === 0) return 'Add at least one node to the canvas.';
    return null;
  }, [nodes.length]);

  const workflowWarnings = useCallback(() => {
    const warnings: string[] = [];
    const triggerCount = nodes.filter((n) => n.type === 'trigger').length;
    const actionCount = nodes.filter((n) => n.type === 'action').length;
    if (triggerCount === 0) warnings.push('No Trigger node found; defaulting to a violation trigger.');
    if (actionCount === 0) warnings.push('No Action nodes yet; enforcement actions will not run.');
    if (edges.length === 0) warnings.push('No connections between nodes; sequence will be undefined.');
    return warnings;
  }, [nodes, edges]);

  const savePlaybook = useCallback(
    async (enabled: boolean) => {
      setWorkflowNotice(null);
      const validationError = validateWorkflow();
      if (validationError) {
        toast.error('Workflow invalid', validationError);
        setWorkflowNotice({ type: 'error', message: validationError });
        return null;
      }
      const warnings = workflowWarnings();
      if (warnings.length) {
        const warningMessage = warnings.join(' ');
        toast.warning('Workflow incomplete', warningMessage);
        setWorkflowNotice({ type: 'warning', message: warningMessage });
      }
      setSaving(true);
      try {
        const workflow = buildWorkflow(nodes, edges);
        const triggerNode = nodes.find((n) => n.type === 'trigger');
        const triggerType = triggerNode?.data?.config?.triggerType || 'violation';
        const triggerConfig = triggerNode?.data?.config?.conditions || {};
        const payload = {
          tenant_id: tenantId,
          name: playbookName,
          description: playbookDescription,
          category: playbookCategory,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          workflow,
          enabled,
          linked_control_ids: linkedControlIds,
        };
        const res = await fetch(playbookId ? `/api/playbooks/${playbookId}` : '/api/playbooks', {
          method: playbookId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Failed to save (${res.status})`);
        if (!playbookId) {
          setPlaybookId(data?.playbook?.playbook_id || null);
        }
        toast.success('Playbook saved');
        return data?.playbook?.playbook_id || playbookId;
      } catch (err: any) {
        toast.error('Failed to save playbook', err?.message || 'Please try again');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [
      validateWorkflow,
      workflowWarnings,
      nodes,
      edges,
      tenantId,
      playbookName,
      playbookDescription,
      playbookCategory,
      linkedControlIds,
      playbookId,
      toast,
    ]
  );

  const handleEnable = useCallback(async () => {
    const id = await savePlaybook(true);
    if (id) {
      router.push('/enforcement?tab=playbooks');
    }
  }, [router, savePlaybook]);

  const handleTest = useCallback(async () => {
    const id = playbookId || (await savePlaybook(false));
    if (!id) return;
    try {
      const res = await fetch(`/api/playbooks/${id}/test`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        credentials: 'include',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Failed to test (${res.status})`);
      toast.success('Playbook test executed', data?.execution?.status || 'Completed');
    } catch (err: any) {
      toast.error('Playbook test failed', err?.message || 'Please try again');
    }
  }, [playbookId, savePlaybook, tenantId, toast]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode) {
        setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
        setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
        setSelectedNode(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        savePlaybook(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, savePlaybook, setNodes, setEdges]);

  const headerActions = useMemo(
    () => (
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => savePlaybook(false)} loading={saving}>
          Save Draft
        </Button>
        <Button variant="secondary" onClick={handleTest} disabled={saving}>
          Test Playbook
        </Button>
        <Button onClick={handleEnable} loading={saving}>
          Save & Enable
        </Button>
      </div>
    ),
    [handleEnable, handleTest, savePlaybook, saving]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Playbook Builder"
        subtitle="Design automated enforcement workflows with drag-and-drop nodes."
        actions={headerActions}
      />

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-600">Playbook Name</label>
            <Input
              value={playbookName}
              onChange={(e) => setPlaybookName(e.target.value)}
              placeholder="Playbook name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Category</label>
            <select
              className="mt-1 w-full border rounded px-2 py-2 text-sm"
              value={playbookCategory}
              onChange={(e) => setPlaybookCategory(e.target.value)}
            >
              <option value="security_response">Security Response</option>
              <option value="access_control">Access Control</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600">Description</label>
            <Input
              value={playbookDescription}
              onChange={(e) => setPlaybookDescription(e.target.value)}
              placeholder="Describe this playbook"
            />
          </div>
        </div>
      </Card>

      {workflowNotice ? (
        <Card
          className={`p-3 border ${
            workflowNotice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <div className="text-sm font-semibold">
            {workflowNotice.type === 'error' ? 'Workflow error' : 'Workflow warning'}
          </div>
          <div className="text-sm mt-1">{workflowNotice.message}</div>
        </Card>
      ) : null}

      <ControlSelector
        tenantId={tenantId}
        selectedControls={linkedControlIds}
        onChange={setLinkedControlIds}
      />

      <div className="flex h-[calc(100vh-260px)] min-h-[560px] border border-gray-200 rounded-lg overflow-hidden bg-white">
        <NodePalette />
        <div className="flex-1" ref={flowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            onPaneClick={() => setSelectedNode(null)}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            onInit={(instance) => {
              reactFlowInstance.current = instance;
            }}
          >
            <Controls />
            <MiniMap />
            <Background gap={16} size={1} />
          </ReactFlow>
        </div>
        {selectedNode ? (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={updateNodeConfig}
            onClose={() => setSelectedNode(null)}
          />
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => router.push('/enforcement?tab=playbooks')}>
          Back to Playbooks
        </Button>
      </div>
    </div>
  );
}

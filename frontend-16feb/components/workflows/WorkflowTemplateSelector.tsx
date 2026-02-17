'use client';

import * as React from 'react';
import { Filter, Search } from 'lucide-react';
import { workflowTemplates } from '@/lib/data/workflow-templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WorkflowTemplate } from '@/types/workflows';

export interface WorkflowTemplateSelectorProps {
  onSelect: (template: WorkflowTemplate) => void;
  entityType?: string;
}

export function WorkflowTemplateSelector({ onSelect, entityType }: WorkflowTemplateSelectorProps) {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState(entityType || 'all');

  const types = React.useMemo(() => {
    const unique = Array.from(new Set(workflowTemplates.map((t) => t.entity_type)));
    return ['all', ...unique];
  }, []);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return workflowTemplates.filter((template) => {
      const matchesType = filter === 'all' || template.entity_type === filter;
      const matchesSearch =
        !query || template.name.toLowerCase().includes(query) || template.description.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Filter className="h-4 w-4" />
          <select
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {types.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All types' : type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((template) => (
          <Card key={template.id} className="border-gray-200">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                <Badge className="border-gray-200 text-gray-600">{template.entity_type}</Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-gray-500">{template.steps.length} steps</div>
              <Button size="sm" onClick={() => onSelect(template)}>
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
        {!filtered.length ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 md:col-span-2">
            No templates match your filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}

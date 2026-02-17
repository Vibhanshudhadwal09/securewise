'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Search, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/LoadingStates';

type PlaybookTemplate = {
  template_id: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  trigger_type: string;
  trigger_config: any;
  workflow: any;
};

function formatCategory(category?: string) {
  if (!category) return 'General';
  return category
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatSeverity(value?: string) {
  return String(value || 'all').toLowerCase();
}

export function PlaybookTemplatesModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (template: PlaybookTemplate) => void;
}) {
  const [templates, setTemplates] = useState<PlaybookTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [severity, setSeverity] = useState('all');

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch('/api/playbook-templates', { credentials: 'include' })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!mounted) return;
        if (!res.ok) throw new Error(data?.error || `Failed to load templates (${res.status})`);
        setTemplates(Array.isArray(data?.templates) ? data.templates : []);
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Failed to load templates');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    templates.forEach((t) => t.category && values.add(t.category));
    return ['all', ...Array.from(values.values())];
  }, [templates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        !q || template.name.toLowerCase().includes(q) || template.description?.toLowerCase().includes(q);
      const matchesCategory = category === 'all' || template.category === category;
      const matchesSeverity = severity === 'all' || formatSeverity(template.severity) === severity;
      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [templates, search, category, severity]);

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Playbook Templates</DialogTitle>
          <p className="text-sm text-gray-600">
            Select a template to prefill playbook details and configuration.
          </p>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] overflow-y-auto space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search playbooks..."
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <select
                  className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((option) => (
                    <option key={option} value={option}>
                      {option === 'all' ? 'All categories' : formatCategory(option)}
                    </option>
                  ))}
                </select>
              </div>
              <select
                className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
              >
                {['all', 'critical', 'high', 'medium', 'low'].map((option) => (
                  <option key={option} value={option}>
                    {option === 'all' ? 'All severities' : option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card className="p-4 border border-red-200 bg-red-50 text-red-700">
              {error}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filtered.map((template) => (
                <Card key={template.template_id} className="border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-gray-900">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span>{template.name}</span>
                    </div>
                    <Badge variant="warning">{formatCategory(template.category)}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-3">{template.description}</p>
                  <div className="text-xs text-gray-500">
                    {Array.isArray(template.workflow?.nodes)
                      ? `${template.workflow.nodes.filter((n: any) => n.type === 'action').length} actions`
                      : '0 actions'}
                  </div>
                  <Button size="sm" onClick={() => onSelect(template)}>
                    Use Template
                  </Button>
                </Card>
              ))}
              {!filtered.length ? (
                <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 md:col-span-2">
                  No templates match your filters.
                </div>
              ) : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

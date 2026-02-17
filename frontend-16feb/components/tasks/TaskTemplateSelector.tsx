'use client';

import * as React from 'react';
import { Search, X } from 'lucide-react';
import { taskTemplates, TaskTemplate } from '@/lib/data/task-templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface TaskTemplateSelectorProps {
  onSelect: (template: TaskTemplate) => void;
  open?: boolean;
  onClose?: () => void;
}

function truncate(text: string, max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

export function TaskTemplateSelector({ onSelect, open, onClose }: TaskTemplateSelectorProps) {
  const isOpen = Boolean(open);
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('All');

  const categories = React.useMemo(() => {
    const unique = Array.from(new Set(taskTemplates.map((t) => t.category)));
    return ['All', ...unique];
  }, []);

  const filteredTemplates = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return taskTemplates.filter((template) => {
      const matchesCategory = category === 'All' || template.category === category;
      const matchesQuery =
        !query ||
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [category, search]);

  React.useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setCategory('All');
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="flex items-start justify-between gap-4">
          <div>
            <DialogTitle>Task Templates</DialogTitle>
            <DialogDescription>Select a template to prefill task details and checklist.</DialogDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close templates">
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates"
                className="pl-9"
                aria-label="Search templates"
              />
            </div>
            <Tabs value={category} onValueChange={setCategory}>
              <TabsList className="flex flex-wrap gap-1">
                {categories.map((name) => (
                  <TabsTrigger key={name} value={name}>
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {filteredTemplates.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="border-gray-200">
                  <CardHeader className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <Badge className="border-gray-200 text-gray-600">{template.category}</Badge>
                    </div>
                    <CardDescription>{truncate(template.description)}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-gray-500">
                      {template.checklist.length} checklist items
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onSelect(template)}
                      className="w-full justify-center"
                    >
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No templates match your search.
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

"use client";

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { MonitoringTemplate } from '@/types/monitoring';

export type RuleCategory = {
  id: string;
  name: string;
  description: string;
  templateCount: number;
};

export const DEFAULT_CATEGORIES: RuleCategory[] = [
  {
    id: 'security',
    name: 'Security & Access',
    description: 'Certificate, TLS, authentication monitoring',
    templateCount: 17,
  },
  {
    id: 'cloud',
    name: 'Cloud Configuration',
    description: 'AWS, Azure, GCP security monitoring',
    templateCount: 12,
  },
  {
    id: 'access',
    name: 'Access Control',
    description: 'User activity, authentication, authorization',
    templateCount: 10,
  },
  {
    id: 'compliance',
    name: 'Compliance Drift',
    description: 'Control, evidence, policy monitoring',
    templateCount: 8,
  },
  {
    id: 'endpoint',
    name: 'Endpoint Security',
    description: 'Device compliance, AV, patching',
    templateCount: 5,
  },
];

export default function Step1CategorySelection(props: {
  categories?: RuleCategory[];
  templates: MonitoringTemplate[];
  selectedCategory?: string | null;
  onSelectCategory: (categoryId: string) => void;
  onSelectTemplate: (template: MonitoringTemplate) => void;
}) {
  const { categories, templates, selectedCategory, onSelectCategory, onSelectTemplate } = props;
  const [query, setQuery] = useState('');

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        t.template_name.toLowerCase().includes(q) ||
        String(t.description || '').toLowerCase().includes(q) ||
        String(t.rule_type || '').toLowerCase().includes(q)
      );
    });
  }, [templates, selectedCategory, query]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3">Choose a category</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(categories || DEFAULT_CATEGORIES).map((cat) => (
            <Card
              key={cat.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === cat.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{cat.name}</div>
                  <div className="text-xs text-gray-500">{cat.description}</div>
                  <div className="text-xs text-gray-400 mt-2">{cat.templateCount} templates</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">Templates</div>
          <input
            className="w-64 rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Search templates"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
          {filteredTemplates.length === 0 ? (
            <div className="text-sm text-gray-500">No templates match this filter.</div>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.template_id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">{template.template_name}</div>
                </div>
                <div className="text-xs text-gray-500">{template.description}</div>
                <button
                  type="button"
                  className="mt-auto rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => onSelectTemplate(template)}
                >
                  Use template
                </button>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

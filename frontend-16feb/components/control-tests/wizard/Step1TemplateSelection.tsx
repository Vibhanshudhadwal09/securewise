"use client";

import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import CategoryIcon from '@/components/control-tests/CategoryIcon';
import DifficultyBadge from '@/components/control-tests/DifficultyBadge';
import type { ControlTestTemplate } from '@/types/control-tests';

const CATEGORIES = [
  { id: 'access_control', name: 'Access Control', icon: 'access_control', templates: 8 },
  { id: 'data_protection', name: 'Data Protection', icon: 'data_protection', templates: 7 },
  { id: 'network_security', name: 'Network Security', icon: 'network_security', templates: 5 },
  { id: 'endpoint_security', name: 'Endpoint Security', icon: 'endpoint_security', templates: 5 },
];

export default function Step1TemplateSelection(props: {
  templates: ControlTestTemplate[];
  selectedCategory?: string | null;
  onSelectCategory: (category: string) => void;
  onSelectTemplate: (template: ControlTestTemplate) => void;
}) {
  const { templates, selectedCategory, onSelectCategory, onSelectTemplate } = props;
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (difficulty !== 'all' && t.difficulty !== difficulty) return false;
      if (!q) return true;
      return (
        t.template_name.toLowerCase().includes(q) ||
        String(t.description || '').toLowerCase().includes(q)
      );
    });
  }, [templates, selectedCategory, query, difficulty]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3">Choose a category</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedCategory === cat.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => onSelectCategory(cat.id)}
            >
              <div className="flex items-start gap-3">
                <CategoryIcon category={cat.icon} className="text-gray-600" size={18} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{cat.name}</div>
                  <div className="text-xs text-gray-500">{cat.templates} templates</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="flex-1 min-w-[220px] rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Search templates"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="all">All difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
          {filteredTemplates.length === 0 ? (
            <div className="text-sm text-gray-500">No templates match this filter.</div>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.template_id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold text-gray-900">{template.template_name}</div>
                  <DifficultyBadge difficulty={template.difficulty} />
                </div>
                <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
                <div className="text-xs text-gray-400">Controls: {template.suggested_controls?.length || 0}</div>
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

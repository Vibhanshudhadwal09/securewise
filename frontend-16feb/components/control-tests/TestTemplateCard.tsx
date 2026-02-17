'use client';

import { Card } from '@/components/ui/card';
import DifficultyBadge from '@/components/control-tests/DifficultyBadge';
import CategoryIcon from '@/components/control-tests/CategoryIcon';
import type { ControlTestTemplate } from '@/types/control-tests';

export default function TestTemplateCard(props: {
  template: ControlTestTemplate;
  onUse: () => void;
  onPreview?: () => void;
}) {
  const { template, onUse, onPreview } = props;
  return (
    <Card className="p-4 flex flex-col gap-3 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CategoryIcon category={template.category} className="text-gray-500" size={16} />
          {template.template_name}
        </div>
        <DifficultyBadge difficulty={template.difficulty} />
      </div>
      <div className="text-xs text-gray-500 line-clamp-2">{template.description}</div>
      <div className="text-xs text-gray-400">Controls: {template.suggested_controls?.length || 0}</div>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onPreview}
        >
          Preview
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
          onClick={onUse}
        >
          Quick start
        </button>
      </div>
    </Card>
  );
}

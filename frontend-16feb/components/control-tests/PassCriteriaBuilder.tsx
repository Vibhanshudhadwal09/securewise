"use client";

import { Plus, Trash2 } from 'lucide-react';

type Condition = { field: string; operator: string; value: string };

export default function PassCriteriaBuilder(props: {
  value: { conditions: Condition[]; logic?: 'and' | 'or' };
  onChange: (next: { conditions: Condition[]; logic?: 'and' | 'or' }) => void;
}) {
  const { value, onChange } = props;
  const conditions = Array.isArray(value.conditions) ? value.conditions : [];

  const updateCondition = (idx: number, patch: Partial<Condition>) => {
    const next = conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ ...value, conditions: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Logic</span>
        <select
          className="rounded-md border border-gray-200 px-2 py-1 text-xs"
          value={value.logic || 'and'}
          onChange={(e) => onChange({ ...value, logic: e.target.value as 'and' | 'or' })}
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
      </div>

      {conditions.map((condition, idx) => (
        <div key={`cond-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          <input
            className="md:col-span-4 rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Field (e.g., result.status)"
            value={condition.field}
            onChange={(e) => updateCondition(idx, { field: e.target.value })}
          />
          <select
            className="md:col-span-3 rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={condition.operator}
            onChange={(e) => updateCondition(idx, { operator: e.target.value })}
          >
            <option value="eq">Equals</option>
            <option value="neq">Not equals</option>
            <option value="gt">Greater than</option>
            <option value="gte">Greater or equal</option>
            <option value="lt">Less than</option>
            <option value="lte">Less or equal</option>
            <option value="contains">Contains</option>
          </select>
          <input
            className="md:col-span-4 rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="Value"
            value={condition.value}
            onChange={(e) => updateCondition(idx, { value: e.target.value })}
          />
          <button
            type="button"
            className="md:col-span-1 inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-500 hover:text-red-600"
            onClick={() => onChange({ ...value, conditions: conditions.filter((_, i) => i !== idx) })}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        onClick={() => onChange({ ...value, conditions: [...conditions, { field: '', operator: 'eq', value: '' }] })}
      >
        <Plus size={14} /> Add condition
      </button>
    </div>
  );
}

import { Plus, Trash2 } from 'lucide-react';

export type KeyValuePair = { key: string; value: string; secret?: boolean };

export default function KeyValueEditor(props: {
  value: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  allowSecret?: boolean;
}) {
  const { value, onChange, keyPlaceholder, valuePlaceholder, allowSecret } = props;
  const items = Array.isArray(value) ? value : [];

  const update = (idx: number, next: Partial<KeyValuePair>) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, ...next } : item));
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={`${item.key}-${idx}`} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
          <input
            className="md:col-span-4 rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder={keyPlaceholder || 'Key'}
            value={item.key}
            onChange={(e) => update(idx, { key: e.target.value })}
          />
          <input
            className="md:col-span-6 rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder={valuePlaceholder || 'Value'}
            value={item.value}
            type={allowSecret && item.secret ? 'password' : 'text'}
            onChange={(e) => update(idx, { value: e.target.value })}
          />
          <div className="md:col-span-2 flex items-center gap-2">
            {allowSecret ? (
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={Boolean(item.secret)}
                  onChange={(e) => update(idx, { secret: e.target.checked })}
                />
                Secret
              </label>
            ) : null}
            <button
              type="button"
              className="ml-auto inline-flex items-center justify-center rounded-md border border-gray-200 p-2 text-gray-500 hover:text-red-600"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        onClick={() => onChange([...items, { key: '', value: '' }])}
      >
        <Plus size={14} /> Add row
      </button>
    </div>
  );
}

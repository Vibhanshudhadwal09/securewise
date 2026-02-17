'use client';

import { useMemo } from 'react';

const QUICK_OPTIONS = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '1 hr', value: 60 },
  { label: '4 hr', value: 240 },
  { label: '24 hr', value: 1440 },
];

export default function FrequencySelector(props: { value: number; onChange: (value: number) => void }) {
  const { value, onChange } = props;
  const perDay = useMemo(() => Math.round((24 * 60) / Math.max(1, value)), [value]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`rounded-full border px-3 py-1 text-xs ${
              value === opt.value ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
            }`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <input
          type="range"
          min={5}
          max={1440}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Every {value} minutes</span>
          <span>{perDay} checks per day</span>
        </div>
      </div>
    </div>
  );
}

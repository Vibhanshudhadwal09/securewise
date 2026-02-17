import * as React from 'react';

function join(...parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Progress(props: { value?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, Number(props.value || 0)));
  return (
    <div className={join('h-2 w-full overflow-hidden rounded-full bg-gray-100', props.className)}>
      <div
        className="h-full rounded-full bg-primary-600 transition-all"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

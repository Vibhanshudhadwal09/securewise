'use client';

import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

export default function Breadcrumb(props: { items?: BreadcrumbItem[] }) {
  const items = props.items;
  if (!items || !items.length) return null;

  return (
    <nav className="flex items-center space-x-2 text-xs text-gray-500 py-3 px-6 bg-white border-b border-gray-200">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <div key={`${item.label}-${idx}`} className="flex items-center min-w-0">
            {idx > 0 ? <span className="mx-2 text-gray-300" aria-hidden="true">›</span> : null}
            {isLast ? (
              <span className="font-semibold text-gray-900 truncate max-w-xs">{item.label}</span>
            ) : (
              <Link href={item.href || '#'} className="hover:text-primary-600 transition-colors truncate max-w-xs">
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}


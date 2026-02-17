import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  stats?: { label: string; value: string | number }[];
}

export function PageHeader({ title, subtitle, description, icon: Icon, actions, breadcrumbs, stats }: PageHeaderProps) {
  const subtitleText = subtitle ?? description;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
      <div className="px-8 py-12">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="text-sm text-blue-100 mb-6 flex items-center gap-2">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={`${crumb.label}-${idx}`}>
                {idx > 0 && <span className="text-blue-200">/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-white transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-white">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-6">
            {Icon && (
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Icon className="w-10 h-10" strokeWidth={2.5} />
              </div>
            )}
            <div>
              <h1 className="text-5xl font-bold mb-3">{title}</h1>
              {subtitleText && <p className="text-xl text-blue-100">{subtitleText}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>

        {stats && stats.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={`${stat.label}-${idx}`} className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="text-sm text-blue-100 mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

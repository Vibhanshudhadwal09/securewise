'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  icon?: string;
  label: string;
  href?: string;
  children?: NavItem[];
};

const NAV_ITEMS: NavItem[] = [
  { icon: '', label: 'Dashboard', href: '/dashboard' },
  {
    icon: '',
    label: 'GRC & Compliance',
    children: [
      { icon: '', label: 'Compliance Overview', href: '/compliance' },
      { icon: '', label: 'Audit Periods', href: '/compliance/audit-periods' },
      { icon: '', label: 'Controls', href: '/compliance/controls' },
      { icon: '', label: 'Control Assignments', href: '/controls/assignments' },
      { icon: '', label: 'Evidence Collection', href: '/compliance/evidence-collection' },
      { icon: '', label: 'Evidence Review', href: '/evidence-review' },
      { icon: '', label: 'Evidence Ledger', href: '/compliance/evidence-ledger' },
      { icon: '', label: 'Exceptions', href: '/exceptions' },
      { icon: '', label: 'Compliance Gaps', href: '/compliance-gaps' },
    ],
  },
  {
    icon: '',
    label: 'Security Monitoring',
    children: [
      { icon: '', label: 'All Assets', href: '/assets' },
      { icon: '', label: 'Security Overview', href: '/security' },
    ],
  },
  {
    icon: '',
    label: 'Threat Intelligence',
    children: [
      { icon: '', label: 'Threat Map', href: '/threat-intel/map' },
      { icon: '', label: 'Threat Hunting', href: '/threat-intel/hunting' },
      { icon: '', label: 'MITRE ATT&CK', href: '/threat-intel/mitre' },
    ],
  },
  {
    icon: '',
    label: 'Platform',
    children: [
      { icon: '', label: 'Users', href: '/platform/users' },
      { icon: '', label: 'Settings', href: '/platform/settings' },
    ],
  },
];

export default function Navigation() {
  const pathname = usePathname() || '/';
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem('expandedNavSections');
    if (raw) {
      try {
        const j = JSON.parse(raw);
        if (Array.isArray(j)) setExpandedSections(j.map(String));
        return;
      } catch {}
    }
    setExpandedSections(NAV_ITEMS.filter((i) => i.children?.length).map((i) => i.label));
  }, []);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => {
      const next = prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label];
      window.localStorage.setItem('expandedNavSections', JSON.stringify(next));
      return next;
    });
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const items = useMemo(() => NAV_ITEMS, []);

  return (
    <nav className="w-full text-white h-full overflow-y-auto">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-6">SecureWise</h1>

        <ul className="space-y-1 list-none m-0 p-0">
          {items.map((item) => (
            <li key={item.label}>
              {item.children?.length ? (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleSection(item.label)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors border-0 bg-transparent"
                  >
                    <span className="flex items-center gap-2">
                      {item.icon ? <span>{item.icon}</span> : null}
                      <span className="font-medium">{item.label}</span>
                    </span>
                    <span className={`transition-transform ${expandedSections.includes(item.label) ? 'rotate-90' : ''}`}>›</span>
                  </button>

                  {expandedSections.includes(item.label) ? (
                    <ul className="ml-4 mt-1 space-y-1 list-none m-0 p-0">
                      {item.children.map((child) => (
                        <li key={child.label}>
                          <Link
                            href={child.href || '#'}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                              isActive(child.href) ? 'bg-blue-600 font-medium' : 'hover:bg-gray-800'
                            } no-underline`}
                          >
                            {child.icon ? <span>{child.icon}</span> : null}
                            <span className="text-sm">{child.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <Link
                  href={item.href || '#'}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href) ? 'bg-blue-600 font-medium' : 'hover:bg-gray-800'
                  } no-underline`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}


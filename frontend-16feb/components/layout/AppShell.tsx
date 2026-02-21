'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { SidebarNav } from './SidebarNav';
import Breadcrumb, { type BreadcrumbItem } from '../Breadcrumb';
import { ChatWidget } from '@/components/maina/ChatWidget';

type ShellCtx = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  reportPartial: (key: string, partial: boolean) => void;
  partialAny: boolean;
  breadcrumbItems: BreadcrumbItem[] | null;
  setBreadcrumbItems: (items: BreadcrumbItem[] | null) => void;
};

const Ctx = createContext<ShellCtx | null>(null);

export function useShell(): ShellCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useShell must be used within <AppShell>');
  return v;
}

export function AppShell(props: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const partialByKeyRef = useRef<Map<string, boolean>>(new Map());
  const [partialAny, setPartialAny] = useState<boolean>(false);
  const [breadcrumbItems, setBreadcrumbItems] = useState<BreadcrumbItem[] | null>(null);

  const reportPartial = (key: string, partial: boolean) => {
    partialByKeyRef.current.set(String(key), Boolean(partial));
    setPartialAny(Array.from(partialByKeyRef.current.values()).some(Boolean));
  };

  const value = useMemo(
    () => ({ collapsed, setCollapsed, reportPartial, partialAny, breadcrumbItems, setBreadcrumbItems }),
    [collapsed, partialAny, breadcrumbItems]
  );

  return (
    <Ctx.Provider value={value}>
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-50 h-screen flex-col overflow-y-auto border-r border-[var(--card-border)] bg-[var(--sidebar-bg)] transition-all duration-300 ${collapsed ? 'w-20' : 'w-60'}`}>
          <SidebarNav />
        </aside>

        <div className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-60'}`}>
          <div className="sticky top-0 z-40 w-full">
            <TopBar />
          </div>
          <div className="flex-1 px-8 py-6">
            <Breadcrumb items={breadcrumbItems || undefined} />
            <div className="mx-auto max-w-content animate-fadeIn">
              {props.children}
            </div>
          </div>
        </div>
        <ChatWidget />
      </div>
    </Ctx.Provider>
  );
}


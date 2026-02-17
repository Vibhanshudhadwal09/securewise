'use client';

import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import styles from './AppShell.module.css';
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
      <div className={styles.shell}>
        <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
          <SidebarNav />
        </aside>

        <div className={styles.main}>
          <div className={styles.topbar}>
            <TopBar />
          </div>
          <Breadcrumb items={breadcrumbItems || undefined} />
          <div className={styles.contentOuter}>
            <div className={styles.contentInner}>{props.children}</div>
          </div>
        </div>
        <ChatWidget />
      </div>
    </Ctx.Provider>
  );
}


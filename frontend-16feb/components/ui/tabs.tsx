'use client';

import * as React from 'react';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within <Tabs>');
  return ctx;
}

export function Tabs(props: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) {
  const { value, onValueChange, children } = props;
  return <TabsContext.Provider value={{ value, setValue: onValueChange }}>{children}</TabsContext.Provider>;
}

export function TabsList(props: React.HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props;
  return <div className={`inline-flex items-center rounded-lg bg-gray-100 p-1 ${className || ''}`} {...rest} />;
}

export function TabsTrigger(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const { value: tabValue, className, ...rest } = props;
  const { value, setValue } = useTabsContext();
  const active = value === tabValue;
  return (
    <button
      type="button"
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
      } ${className || ''}`}
      onClick={() => setValue(tabValue)}
      {...rest}
    />
  );
}

export function TabsContent(props: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { value: tabValue, className, ...rest } = props;
  const { value } = useTabsContext();
  if (value !== tabValue) return null;
  return <div className={className} {...rest} />;
}

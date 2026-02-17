'use client';
import React, { createContext, useContext } from 'react';
import { usePermissions } from '@/lib/permissions';
 
const PermissionContext = createContext<ReturnType<typeof usePermissions> | null>(null);
 
export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const perms = usePermissions();
  return <PermissionContext.Provider value={perms}>{children}</PermissionContext.Provider>;
}
 
export function usePermissionContext() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissionContext must be used within PermissionProvider');
  return ctx;
}
 
export default PermissionProvider;

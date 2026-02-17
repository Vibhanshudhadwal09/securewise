import React from 'react';
import { AppShell } from '../../components/layout/AppShell';
import { ComplianceProvider } from '@/contexts/ComplianceContext';

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ComplianceProvider>
        <AppShell>{children}</AppShell>
      </ComplianceProvider>
    </React.Suspense>
  );
}


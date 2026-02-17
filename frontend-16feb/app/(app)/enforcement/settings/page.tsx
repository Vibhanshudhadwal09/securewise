"use client";

import { PageHeader } from '@/components/PageHeader';
import { ShieldCheck } from 'lucide-react';
import { EnforcementSettingsPanel } from '@/components/enforcement/EnforcementSettingsPanel';

export default function EnforcementSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Enforcement Settings" subtitle="Configure throttling and circuit breaker." icon={ShieldCheck} />
      <EnforcementSettingsPanel />
    </div>
  );
}

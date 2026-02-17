'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuditPeriod {
  period_id: string;
  framework: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: 'planned' | 'active' | 'closed';
}

interface ComplianceContextType {
  framework: string;
  setFramework: (framework: string) => void;
  periodId: string | null;
  setPeriodId: (periodId: string | null) => void;
  periods: AuditPeriod[];
  refreshPeriods: () => Promise<void>;
  loading: boolean;
}

const ComplianceContext = createContext<ComplianceContextType | undefined>(undefined);

export function ComplianceProvider({ children }: { children: ReactNode }) {
  const [framework, setFramework] = useState<string>('iso27001');
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<AuditPeriod[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshPeriods = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit-periods?framework=${framework}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load periods');
      const data = await res.json();
      setPeriods(data.items || []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load audit periods:', err);
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPeriods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framework]);

  return (
    <ComplianceContext.Provider
      value={{
        framework,
        setFramework,
        periodId,
        setPeriodId,
        periods,
        refreshPeriods,
        loading,
      }}
    >
      {children}
    </ComplianceContext.Provider>
  );
}

export function useCompliance() {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error('useCompliance must be used within ComplianceProvider');
  }
  return context;
}

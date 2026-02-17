'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Tooltip } from 'antd';
import {
  ApartmentOutlined,
  BugOutlined,
  ClusterOutlined,
  CloudOutlined,
  ControlOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  SafetyOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  UserOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useShell } from './AppShell';

type GroupKey = 'dashboard' | 'grc' | 'assets' | 'endpoint' | 'threat' | 'platform' | 'admin';

type PersistedState = {
  collapsed: boolean;
  open: Record<GroupKey, boolean>;
};

const STORAGE_KEY = 'securewise.sidebar.state';

function safeParseState(raw: string | null): PersistedState | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    const open = j?.open || {};
    return {
      collapsed: Boolean(j?.collapsed),
      open: {
        dashboard: open.dashboard !== false,
        grc: open.grc !== false,
        assets: open.assets !== false,
        endpoint: open.endpoint !== false,
        threat: open.threat !== false,
        platform: open.platform !== false,
        admin: open.admin !== false,
      },
    };
  } catch {
    return null;
  }
}

// ---------- Phase 2.8 required helpers ----------
function getCurrentAssetId(pathname: string, sp: URLSearchParams): string | null {
  // 1) from pathname: /endpoints/<assetId>/...
  const m = String(pathname || '').match(/^\/endpoints\/([^\/?#]+)(?:\/|$)/);
  if (m?.[1]) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  }

  // 2) from pathname: /assets/<assetId>
  const m2 = String(pathname || '').match(/^\/assets\/([^\/?#]+)(?:\/|$)/);
  if (m2?.[1]) {
    try {
      return decodeURIComponent(m2[1]);
    } catch {
      return m2[1];
    }
  }

  // 3) fallback: query param assetId
  const fromQuery = sp.get('assetId');
  return fromQuery ? String(fromQuery) : null;
}

function buildCommonQuery(sp: URLSearchParams): string {
  const keep = ['tenantId', 'range', 'slaHours', 'enforceability', 'staleOnly'];
  const q = new URLSearchParams();
  for (const k of keep) {
    const v = sp.get(k);
    if (v !== null && String(v).trim() !== '') q.set(k, String(v));
  }
  return q.toString();
}

function endpointHref(assetId: string | null, commonQuery: string, routeSuffix: string): string {
  const qs = commonQuery ? `?${commonQuery}` : '';
  if (assetId) return `/endpoints/${encodeURIComponent(assetId)}/${String(routeSuffix).replace(/^\/+/, '')}${qs}`;
  // If no endpoint is selected, send user to the agent list (Assets) to pick one.
  return `/assets${qs}`;
}

function simpleHref(commonQuery: string, path: string): string {
  const qs = commonQuery ? `?${commonQuery}` : '';
  return `${String(path)}${qs}`;
}

export function SidebarNav() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const sp = useSearchParams();
  const { collapsed, setCollapsed } = useShell();

  const [open, setOpen] = useState<Record<GroupKey, boolean>>({
    dashboard: true,
    grc: true,
    assets: true,
    endpoint: true,
    threat: true,
    platform: true,
    admin: true,
  });

  // Load persisted state
  useEffect(() => {
    const s = safeParseState(localStorage.getItem(STORAGE_KEY));
    if (s) {
      setCollapsed(Boolean(s.collapsed));
      setOpen(s.open);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state
  useEffect(() => {
    const next: PersistedState = { collapsed, open: open as any };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [collapsed, open]);

  const items = useMemo(() => {
    const q = sp ? new URLSearchParams(sp.toString()) : new URLSearchParams();
    const commonQuery = buildCommonQuery(q);
    const assetId = getCurrentAssetId(pathname, q);
    const withQuery = (path: string, extra?: Record<string, string>) => {
      const p = new URLSearchParams(commonQuery);
      for (const [k, v] of Object.entries(extra || {})) p.set(k, v);
      const qs = p.toString();
      return `${path}${qs ? `?${qs}` : ''}`;
    };
    const assetOverview = assetId ? withQuery(`/assets/${encodeURIComponent(assetId)}`, { tab: 'compliance' }) : null;

    return {
      q,
      commonQuery,
      assetId,
      href: {
        // Dashboard
        dashboard: simpleHref(commonQuery, '/dashboard'),

        // GRC / Compliance
        controls: simpleHref(commonQuery, '/compliance/controls'),
        controlAssignments: simpleHref(commonQuery, '/controls/assignments'),
        controlTesting: simpleHref(commonQuery, '/control-testing'),
        evidence: simpleHref(commonQuery, '/compliance/evidence-ledger'),
        evidenceCollection: simpleHref(commonQuery, '/compliance/evidence-collection'),
        evidenceReview: simpleHref(commonQuery, '/evidence-review'),
        exceptions: simpleHref(commonQuery, '/exceptions'),
        complianceGaps: simpleHref(commonQuery, '/compliance-gaps'),
        complianceOverview: simpleHref(commonQuery, '/compliance'),
        auditPeriods: simpleHref(commonQuery, '/compliance/audit-periods'),
        complianceTrends: simpleHref(commonQuery, '/compliance/trends'),
        audits: simpleHref(commonQuery, '/audits'),
        analytics: simpleHref(commonQuery, '/analytics'),
        risks: simpleHref(commonQuery, '/risks'),
        riskTreatment: simpleHref(commonQuery, '/risks/treatment'),
        approvals: simpleHref(commonQuery, '/approvals'),
        myControls: simpleHref(commonQuery, '/my-controls'),
        remediationPlans: simpleHref(commonQuery, '/remediation-plans'),
        policies: simpleHref(commonQuery, '/policies'),
        vendors: simpleHref(commonQuery, '/vendors'),
        vendorsDashboard: simpleHref(commonQuery, '/vendors/dashboard'),
        reports: simpleHref(commonQuery, '/reports'),
        reportBuilder: simpleHref(commonQuery, '/reports/builder'),
        auditReports: simpleHref(commonQuery, '/reports/audit-report'),
        assetCoverageMatrix: simpleHref(commonQuery, '/assets/coverage-matrix'),

        // Assets
        assets: simpleHref(commonQuery, '/assets'),
        assetsAtRisk: simpleHref(commonQuery, '/assets/at-risk'),

        // Current Asset (conditional)
        currentAssetOverview: assetOverview,
        currentAssetLogs: assetId ? endpointHref(assetId, commonQuery, 'threat-hunting') : null,
        currentAssetEndpointSecurity: assetId ? endpointHref(assetId, commonQuery, 'configuration-assessment') : null,
        currentAssetThreatIntel: assetId ? endpointHref(assetId, commonQuery, 'threat-intelligence') : null,
        endpointCompliance: endpointHref(assetId, commonQuery, 'compliance'),

        // Endpoint Security (global)
        securityOverview: simpleHref(commonQuery, '/security'),
        configurationAssessment: simpleHref(commonQuery, '/endpoint-security/configuration-assessment'),
        malwareDetection: simpleHref(commonQuery, '/endpoint-security/malware-detection'),
        fim: simpleHref(commonQuery, '/endpoint-security/fim'),
        rootcheck: simpleHref(commonQuery, '/endpoint-security/rootcheck'),

        // Threat Intelligence (global)
        incidents: simpleHref(commonQuery, '/incidents'),
        incidentsDashboard: simpleHref(commonQuery, '/incidents/dashboard'),
        threatIndicators: simpleHref(commonQuery, '/threat-intelligence'),
        threatHunting: simpleHref(commonQuery, '/threat-intelligence/threat-hunting'),
        vulnerabilityDetection: simpleHref(commonQuery, '/threat-intelligence/vulnerability-detection'),
        mitre: simpleHref(commonQuery, '/threat-intelligence/mitre'),
        enforcement: simpleHref(commonQuery, '/enforcement'),

        // Platform
        agentManagement: simpleHref(commonQuery, '/agent-management'),
        platformUsers: simpleHref(commonQuery, '/platform/users'),
        platformRoles: simpleHref(commonQuery, '/platform/roles'),
        platformAuditLogs: simpleHref(commonQuery, '/platform/audit-logs'),
        platformEvidenceAutomation: simpleHref(commonQuery, '/platform/evidence-automation'),
        platformControlTestScripts: simpleHref(commonQuery, '/platform/control-test-scripts'),
        platformMonitoring: simpleHref(commonQuery, '/platform/monitoring'),
        serverManagement: simpleHref(commonQuery, '/server-management'),
        indexManagement: simpleHref(commonQuery, '/index-management'),
        dashboardManagement: simpleHref(commonQuery, '/dashboard-management'),
        integrations: simpleHref(commonQuery, '/integrations'),

        // Admin / Operations
        admin: simpleHref(commonQuery, '/admin'),
        onboarding: simpleHref(commonQuery, '/onboarding'),
        deadLetter: simpleHref(commonQuery, '/dead-letter'),
      },
    };
  }, [sp, pathname]);

  const toggleGroup = (k: GroupKey) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }));

  const go = (href: string) => router.push(href);

  const renderRow = (it: { label: string; icon: React.ReactNode; href?: string; disabled?: boolean; active?: boolean; isSub?: boolean }) => {
    // Tailwind classes
    const baseCls = "flex items-center gap-2.5 px-3 py-2 my-1 rounded-lg text-sm transition-colors duration-200 no-underline";
    const normalCls = "text-[var(--text-secondary)] hover:bg-[rgba(59,130,246,0.1)] hover:text-[var(--text-primary)]";
    const activeCls = "bg-[rgba(59,130,246,0.15)] text-[var(--accent-blue)] font-semibold shadow-[inset_3px_0_0_var(--accent-blue)] border border-[var(--accent-blue)]/30";
    const disabledCls = "opacity-40 cursor-not-allowed";
    const subCls = "pl-8"; // Increased padding for sub items

    let className = `${baseCls}`;
    if (it.disabled) className += ` ${disabledCls}`;
    else if (it.active) className += ` ${activeCls}`;
    else className += ` ${normalCls}`;

    if (it.isSub) className += ` ${subCls}`;

    const node = (
      <a
        className={className}
        href={it.href || '#'}
        onClick={(e) => {
          if (it.disabled) {
            e.preventDefault();
            return;
          }
          e.preventDefault();
          if (it.href) go(String(it.href));
        }}
      >
        <span className="flex items-center justify-center w-5 h-5 opacity-90">{it.icon}</span>
        {!collapsed && <span className="truncate">{it.label}</span>}
      </a>
    );
    if (it.disabled) return <Tooltip title="Coming soon">{node}</Tooltip>;
    return node;
  };

  const assetId = items.assetId;
  const endpointPrefix = assetId ? `/endpoints/${encodeURIComponent(assetId)}/` : null;

  const dashboardActive = pathname === '/dashboard';
  const grcGroupActive =
    pathname.startsWith('/compliance') ||
    pathname.startsWith('/compliance/controls') ||
    pathname.startsWith('/controls') ||
    pathname.startsWith('/compliance/evidence-collection') ||
    pathname.startsWith('/evidence-review') ||
    pathname.startsWith('/evidence') ||
    pathname.startsWith('/exceptions') ||
    pathname.startsWith('/compliance-gaps');
  const assetsGroupActive = pathname === '/assets' || pathname.startsWith('/assets/');
  const currentAssetActive = assetsGroupActive || (Boolean(endpointPrefix) && pathname.startsWith('/endpoints/'));
  const endpointGroupActive =
    pathname === '/security' ||
    pathname.startsWith('/endpoint-security/');
  const threatGroupActive =
    pathname === '/threat-intelligence' ||
    pathname.startsWith('/threat-intelligence/') ||
    pathname.startsWith('/incidents');
  const platformGroupActive =
    pathname.startsWith('/agent-management') ||
    pathname.startsWith('/platform/users') ||
    pathname.startsWith('/platform/roles') ||
    pathname.startsWith('/platform/audit-logs') ||
    pathname.startsWith('/server-management') ||
    pathname.startsWith('/index-management') ||
    pathname.startsWith('/dashboard-management') ||
    pathname.startsWith('/integrations');
  const adminGroupActive = pathname.startsWith('/admin') || pathname.startsWith('/onboarding') || pathname.startsWith('/dead-letter');

  // Shared classes for group headers
  const headerBase = "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer select-none transition-colors duration-200 text-[var(--text-secondary)] hover:bg-[rgba(59,130,246,0.1)] hover:text-[var(--text-primary)]";
  const headerActive = "bg-[rgba(59,130,246,0.1)] text-[var(--accent-blue)] border border-[var(--accent-blue)]/30 shadow-[inset_3px_0_0_var(--accent-blue)]";
  const sectionTitle = "px-2.5 py-4 text-[11px] uppercase tracking-widest text-[var(--text-tertiary)] font-bold";

  return (
    <div className={`flex flex-col h-full ${collapsed ? 'items-center' : ''}`}>
      {/* Brand */}
      <div className={`flex items-center w-full px-4 py-4 border-b border-[var(--card-border)] ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <span className="text-lg font-bold text-[var(--text-primary)] tracking-tight">SecureWise</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center p-1.5 rounded-full bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {!collapsed && <div className={sectionTitle}>Overview</div>}
        {renderRow({
          label: 'Dashboard',
          icon: <DashboardOutlined />,
          href: items.href.dashboard,
          active: dashboardActive,
        })}

        {/* GRC */}
        {!collapsed && <div className={sectionTitle}>Compliance</div>}
        <div
          className={`${headerBase} ${grcGroupActive ? headerActive : ''} ${collapsed ? 'justify-center' : ''}`}
          onClick={() => toggleGroup('grc')}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5"><SafetyOutlined /></span>
            {!collapsed && <span className="truncate font-medium text-sm">GRC / Compliance</span>}
          </div>
          {!collapsed && <span className="text-xs opacity-70">{open.grc ? '▾' : '▸'}</span>}
        </div>

        <div className={`overflow-hidden transition-all duration-300 ${!collapsed && open.grc ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-4 pl-0 border-l border-[var(--card-border)] my-1">
            {renderRow({ label: 'Compliance Overview', icon: <SafetyOutlined />, href: items.href.complianceOverview, active: pathname === '/compliance', isSub: true })}
            {renderRow({ label: 'Audit Periods', icon: <SafetyOutlined />, href: items.href.auditPeriods, active: pathname.startsWith('/compliance/audit-periods'), isSub: true })}
            {renderRow({ label: 'Controls', icon: <SafetyOutlined />, href: items.href.controls, active: pathname.startsWith('/compliance/controls') || pathname.startsWith('/controls'), isSub: true })}
            {renderRow({ label: 'Control Assignments', icon: <SafetyOutlined />, href: items.href.controlAssignments, active: pathname.startsWith('/controls/assignments'), isSub: true })}
            {renderRow({ label: 'Evidence Collection', icon: <FileSearchOutlined />, href: items.href.evidenceCollection, active: pathname.startsWith('/compliance/evidence-collection'), isSub: true })}
            {renderRow({ label: 'Evidence Review', icon: <FileSearchOutlined />, href: items.href.evidenceReview, active: pathname.startsWith('/evidence-review'), isSub: true })}
            {renderRow({ label: 'Evidence Ledger', icon: <FileSearchOutlined />, href: items.href.evidence, active: pathname.startsWith('/compliance/evidence-ledger'), isSub: true })}
            {renderRow({ label: 'Exceptions', icon: <SettingOutlined />, href: items.href.exceptions, active: pathname.startsWith('/exceptions'), isSub: true })}
            {renderRow({ label: 'Compliance Gaps', icon: <SafetyOutlined />, href: items.href.complianceGaps, active: pathname.startsWith('/compliance-gaps'), isSub: true })}
          </div>
        </div>

        {/* Assets */}
        {!collapsed && <div className={sectionTitle}>Assets</div>}
        <div className={`${headerBase} ${assetsGroupActive ? headerActive : ''} ${collapsed ? 'justify-center' : ''}`} onClick={() => toggleGroup('assets')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5"><ApartmentOutlined /></span>
            {!collapsed && <span className="truncate font-medium text-sm">Assets</span>}
          </div>
          {!collapsed && <span className="text-xs opacity-70">{open.assets ? '▾' : '▸'}</span>}
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${!collapsed && open.assets ? 'max-h-[150px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-4 pl-0 border-l border-[var(--card-border)] my-1">
            {renderRow({ label: 'All Assets', icon: <ApartmentOutlined />, href: items.href.assets, active: pathname === '/assets', isSub: true })}
            {renderRow({ label: 'Assets at Risk', icon: <ApartmentOutlined />, href: items.href.assetsAtRisk, active: pathname.startsWith('/assets/at-risk'), isSub: true })}
          </div>
        </div>

        {/* Current Asset */}
        {assetId ? (
          <>
            <div className={`${headerBase} ${currentAssetActive ? headerActive : ''} ${collapsed ? 'justify-center' : ''}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex items-center justify-center w-5 h-5"><ApartmentOutlined /></span>
                {!collapsed && <span className="truncate font-medium text-sm">Current Asset</span>}
              </div>
            </div>
            <div className={`overflow-hidden transition-all duration-300 max-h-[300px] opacity-100`}>
              <div className="ml-4 pl-0 border-l border-[var(--card-border)] my-1">
                {renderRow({ label: 'Overview', icon: <ApartmentOutlined />, href: items.href.currentAssetOverview || undefined, active: pathname.startsWith(`/assets/${encodeURIComponent(assetId)}`), isSub: true })}
                {renderRow({ label: 'View Logs', icon: <FileSearchOutlined />, href: items.href.currentAssetLogs || undefined, active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}threat-hunting`), isSub: true })}
                {renderRow({ label: 'Endpoint Security', icon: <ControlOutlined />, href: items.href.currentAssetEndpointSecurity || undefined, active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}configuration-assessment`), isSub: true })}
                {renderRow({ label: 'Threat Intelligence', icon: <SafetyOutlined />, href: items.href.currentAssetThreatIntel || undefined, active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}threat-intelligence`), isSub: true })}
                {renderRow({ label: 'Compliance', icon: <SafetyOutlined />, href: items.href.endpointCompliance, active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}compliance`), isSub: true })}
              </div>
            </div>
          </>
        ) : null}

        {/* Endpoint Security */}
        {!collapsed && <div className={sectionTitle}>Security Risk Intelligence</div>}
        <div className={`${headerBase} ${endpointGroupActive ? headerActive : ''} ${collapsed ? 'justify-center' : ''}`} onClick={() => toggleGroup('endpoint')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5"><SettingOutlined /></span>
            {!collapsed && <span className="truncate font-medium text-sm">Endpoint Security</span>}
          </div>
          {!collapsed && <span className="text-xs opacity-70">{open.endpoint ? '▾' : '▸'}</span>}
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${!collapsed && open.endpoint ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-4 pl-0 border-l border-[var(--card-border)] my-1">
            {renderRow({ label: 'Security Overview', icon: <SettingOutlined />, href: items.href.securityOverview, active: pathname === '/security', isSub: true })}
            {renderRow({ label: 'Configuration Assessment', icon: <ControlOutlined />, href: items.href.configurationAssessment, active: pathname.startsWith('/endpoint-security/configuration-assessment'), isSub: true })}
            {renderRow({ label: 'Malware Detection', icon: <BugOutlined />, href: items.href.malwareDetection, active: pathname.startsWith('/endpoint-security/malware-detection'), isSub: true })}
            {renderRow({ label: 'File Integrity Monitoring (FIM)', icon: <ThunderboltOutlined />, href: items.href.fim, active: pathname.startsWith('/endpoint-security/fim'), isSub: true })}
            {renderRow({ label: 'Rootcheck', icon: <AuditOutlined />, href: items.href.rootcheck, active: pathname.startsWith('/endpoint-security/rootcheck'), isSub: true })}
          </div>
        </div>

        {/* Threat Intelligence */}
        <div className={`${headerBase} ${threatGroupActive ? headerActive : ''} ${collapsed ? 'justify-center' : ''}`} onClick={() => toggleGroup('threat')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5"><SafetyOutlined /></span>
            {!collapsed && <span className="truncate font-medium text-sm">Threat Intelligence</span>}
          </div>
          {!collapsed && <span className="text-xs opacity-70">{open.threat ? '▾' : '▸'}</span>}
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${!collapsed && open.threat ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-4 pl-0 border-l border-[var(--card-border)] my-1">
            {renderRow({ label: 'Incidents', icon: <SafetyOutlined />, href: items.href.incidents, active: pathname === '/incidents' || pathname.startsWith('/incidents/'), isSub: true })}
            {renderRow({ label: 'Incident Dashboard', icon: <DashboardOutlined />, href: items.href.incidentsDashboard, active: pathname.startsWith('/incidents/dashboard'), isSub: true })}
            {renderRow({ label: 'Indicators', icon: <SafetyOutlined />, href: items.href.threatIndicators, active: pathname === '/threat-intelligence', isSub: true })}
            {renderRow({ label: 'Automated Enforcement', icon: <SafetyOutlined />, href: items.href.enforcement, active: pathname.startsWith('/enforcement'), isSub: true })}
            {renderRow({ label: 'Threat Hunting', icon: <FileSearchOutlined />, href: items.href.threatHunting, active: pathname.startsWith('/threat-intelligence/threat-hunting'), isSub: true })}
            {renderRow({ label: 'Vulnerability Detection', icon: <ControlOutlined />, href: items.href.vulnerabilityDetection, active: pathname.startsWith('/threat-intelligence/vulnerability-detection'), isSub: true })}
            {renderRow({ label: 'MITRE ATT&CK', icon: <SafetyOutlined />, href: items.href.mitre, active: pathname.startsWith('/threat-intelligence/mitre'), isSub: true })}
          </div>
        </div>

        {/* Platform */}
        {!collapsed && <div className={sectionTitle}>Platform</div>}
        <div className={`${headerBase} ${platformGroupActive ? headerActive : ''} ${collapsed ? 'justify-center' : ''}`} onClick={() => toggleGroup('platform')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5"><ClusterOutlined /></span>
            {!collapsed && <span className="truncate font-medium text-sm">Platform</span>}
          </div>
          {!collapsed && <span className="text-xs opacity-70">{open.platform ? '▾' : '▸'}</span>}
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${!collapsed && open.platform ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-4 pl-0 border-l border-[var(--card-border)] my-1">
            {renderRow({ label: 'Cloud Security', icon: <CloudOutlined />, disabled: true, isSub: true })}
            {renderRow({ label: 'Agent Management', icon: <ApartmentOutlined />, href: items.href.agentManagement, active: pathname.startsWith('/agent-management'), isSub: true })}
            {renderRow({ label: 'Users', icon: <UserOutlined />, href: items.href.platformUsers, active: pathname.startsWith('/platform/users'), isSub: true })}
            {renderRow({ label: 'Roles', icon: <SettingOutlined />, href: items.href.platformRoles, active: pathname.startsWith('/platform/roles'), isSub: true })}
            {renderRow({ label: 'Audit Logs', icon: <AuditOutlined />, href: items.href.platformAuditLogs, active: pathname.startsWith('/platform/audit-logs'), isSub: true })}
            {renderRow({ label: 'Evidence Automation', icon: <FileSearchOutlined />, href: items.href.platformEvidenceAutomation, active: pathname.startsWith('/platform/evidence-automation'), isSub: true })}
            {renderRow({ label: 'Control Test Scripts', icon: <ControlOutlined />, href: items.href.platformControlTestScripts, active: pathname.startsWith('/platform/control-test-scripts'), isSub: true })}
            {renderRow({ label: 'Monitoring', icon: <SafetyOutlined />, href: items.href.platformMonitoring, active: pathname.startsWith('/platform/monitoring'), isSub: true })}
            {renderRow({ label: 'Server Management', icon: <ClusterOutlined />, href: items.href.serverManagement, active: pathname.startsWith('/server-management'), isSub: true })}
            {renderRow({ label: 'Index Management', icon: <ClusterOutlined />, href: items.href.indexManagement, active: pathname.startsWith('/index-management'), isSub: true })}
            {renderRow({ label: 'Dashboard Management', icon: <ClusterOutlined />, href: items.href.dashboardManagement, active: pathname.startsWith('/dashboard-management'), isSub: true })}
            {renderRow({ label: 'Integrations', icon: <ClusterOutlined />, href: items.href.integrations, active: pathname.startsWith('/integrations'), isSub: true })}
          </div>
        </div>

        {/* Admin */}
        {!collapsed && <div className={sectionTitle}>Admin</div>}
        <div className={`${headerBase} ${adminGroupActive ? headerActive : ''} ${collapsed ? 'justify-center' : ''}`} onClick={() => toggleGroup('admin')}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5"><SettingOutlined /></span>
            {!collapsed && <span className="truncate font-medium text-sm">Admin / Operations</span>}
          </div>
          {!collapsed && <span className="text-xs opacity-70">{open.admin ? '▾' : '▸'}</span>}
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${!collapsed && open.admin ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="ml-4 pl-0 border-l border-[var(--card-border)] my-1">
            {renderRow({ label: 'Admin', icon: <SettingOutlined />, href: items.href.admin, active: pathname.startsWith('/admin'), isSub: true })}
            {renderRow({ label: 'Onboarding', icon: <SettingOutlined />, href: items.href.onboarding, active: pathname.startsWith('/onboarding'), isSub: true })}
            {renderRow({ label: 'Dead Letter', icon: <SettingOutlined />, href: items.href.deadLetter, active: pathname.startsWith('/dead-letter'), isSub: true })}
          </div>
        </div>
      </nav>

      {/* QA checklist preserved */}
    </div>
  );
}

export { buildCommonQuery, endpointHref, getCurrentAssetId, simpleHref };

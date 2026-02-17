'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './SidebarNav.module.css';
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
    const cls = `${styles.item} ${it.isSub ? styles.itemSub : ''} ${it.active ? styles.itemActive : ''} ${it.disabled ? styles.itemDisabled : ''}`;
    const node = (
      <a
        className={cls}
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
        <span className={styles.icon}>{it.icon}</span>
        <span className={styles.groupLabel}>{it.label}</span>
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

  return (
    <div className={`${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>SecureWise</span>
          <span
            className={styles.collapseBtn}
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            role="button"
          >
            {collapsed ? '»' : '«'}
          </span>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.sectionTitle}>Overview</div>
        {renderRow({
          label: 'Dashboard',
          icon: <DashboardOutlined />,
          href: items.href.dashboard,
          active: dashboardActive,
        })}

        {/* Navigation order:
            Dashboard → GRC/Compliance → Assets → Current Asset (conditional) → Endpoint Security → Threat Intelligence → Platform → Admin/Operations
        */}
        <div className={styles.sectionTitle}>Compliance</div>
        <div className={`${styles.groupHeader} ${grcGroupActive ? styles.groupHeaderActive : ''}`} onClick={() => toggleGroup('grc')}>
          <div className={styles.groupLeft}>
            <span className={styles.icon}>
              <SafetyOutlined />
            </span>
            <span className={styles.groupLabel}>GRC / Compliance</span>
          </div>
          <span className={styles.chev}>{open.grc ? '▾' : '▸'}</span>
        </div>
        <div className={`${styles.itemsWrap} ${open.grc ? styles.itemsOpen : styles.itemsClosed}`}>
          <div className={styles.items}>
            {renderRow({
              label: 'Compliance Overview',
              icon: <SafetyOutlined />,
              href: items.href.complianceOverview,
              active: pathname === '/compliance',
              isSub: true,
            })}
            {renderRow({
              label: 'Audit Periods',
              icon: <SafetyOutlined />,
              href: items.href.auditPeriods,
              active: pathname.startsWith('/compliance/audit-periods'),
              isSub: true,
            })}
            {renderRow({
              label: 'Controls',
              icon: <SafetyOutlined />,
              href: items.href.controls,
              active: pathname.startsWith('/compliance/controls') || pathname.startsWith('/controls'),
              isSub: true,
            })}
            {renderRow({
              label: 'Control Assignments',
              icon: <SafetyOutlined />,
              href: items.href.controlAssignments,
              active: pathname.startsWith('/controls/assignments'),
              isSub: true,
            })}
            {renderRow({
              label: 'Evidence Collection',
              icon: <FileSearchOutlined />,
              href: items.href.evidenceCollection,
              active: pathname.startsWith('/compliance/evidence-collection'),
              isSub: true,
            })}
            {renderRow({
              label: 'Evidence Review',
              icon: <FileSearchOutlined />,
              href: items.href.evidenceReview,
              active: pathname.startsWith('/evidence-review'),
              isSub: true,
            })}
            {renderRow({
              label: 'Evidence Ledger',
              icon: <FileSearchOutlined />,
              href: items.href.evidence,
              active: pathname.startsWith('/compliance/evidence-ledger'),
              isSub: true,
            })}
            {renderRow({
              label: 'Exceptions',
              icon: <SettingOutlined />,
              href: items.href.exceptions,
              active: pathname.startsWith('/exceptions'),
              isSub: true,
            })}
            {renderRow({
              label: 'Compliance Gaps',
              icon: <SafetyOutlined />,
              href: items.href.complianceGaps,
              active: pathname.startsWith('/compliance-gaps'),
              isSub: true,
            })}
          </div>
        </div>

        <div className={styles.sectionTitle}>Assets</div>
        <div className={`${styles.groupHeader} ${assetsGroupActive ? styles.groupHeaderActive : ''}`} onClick={() => toggleGroup('assets')}>
          <div className={styles.groupLeft}>
            <span className={styles.icon}>
              <ApartmentOutlined />
            </span>
            <span className={styles.groupLabel}>Assets</span>
          </div>
          <span className={styles.chev}>{open.assets ? '▾' : '▸'}</span>
        </div>
        <div className={`${styles.itemsWrap} ${open.assets ? styles.itemsOpen : styles.itemsClosed}`}>
          <div className={styles.items}>
            {renderRow({
              label: 'All Assets',
              icon: <ApartmentOutlined />,
              href: items.href.assets,
              active: pathname === '/assets',
              isSub: true,
            })}
            {renderRow({
              label: 'Assets at Risk',
              icon: <ApartmentOutlined />,
              href: items.href.assetsAtRisk,
              active: pathname.startsWith('/assets/at-risk'),
              isSub: true,
            })}
          </div>
        </div>

        {assetId ? (
          <div className={`${styles.groupHeader} ${currentAssetActive ? styles.groupHeaderActive : ''}`}>
            <div className={styles.groupLeft}>
              <span className={styles.icon}>
                <ApartmentOutlined />
              </span>
              <span className={styles.groupLabel}>Current Asset</span>
            </div>
          </div>
        ) : null}
        {assetId ? (
          <div className={`${styles.itemsWrap} ${styles.itemsOpen}`}>
            <div className={styles.items}>
              {renderRow({
                label: 'Overview',
                icon: <ApartmentOutlined />,
                href: items.href.currentAssetOverview || undefined,
                active: pathname.startsWith(`/assets/${encodeURIComponent(assetId)}`),
                isSub: true,
              })}
              {renderRow({
                label: 'View Logs',
                icon: <FileSearchOutlined />,
                href: items.href.currentAssetLogs || undefined,
                active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}threat-hunting`),
                isSub: true,
              })}
              {renderRow({
                label: 'Endpoint Security',
                icon: <ControlOutlined />,
                href: items.href.currentAssetEndpointSecurity || undefined,
                active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}configuration-assessment`),
                isSub: true,
              })}
              {renderRow({
                label: 'Threat Intelligence',
                icon: <SafetyOutlined />,
                href: items.href.currentAssetThreatIntel || undefined,
                active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}threat-intelligence`),
                isSub: true,
              })}
              {renderRow({
                label: 'Compliance',
                icon: <SafetyOutlined />,
                href: items.href.endpointCompliance,
                active: Boolean(endpointPrefix) && pathname.startsWith(`${endpointPrefix}compliance`),
                isSub: true,
              })}
            </div>
          </div>
        ) : null}

        <div className={styles.sectionTitle}>Security Risk Intelligence</div>
        <div className={`${styles.groupHeader} ${endpointGroupActive ? styles.groupHeaderActive : ''}`} onClick={() => toggleGroup('endpoint')}>
          <div className={styles.groupLeft}>
            <span className={styles.icon}>
              <SettingOutlined />
            </span>
            <span className={styles.groupLabel}>Endpoint Security</span>
          </div>
          <span className={styles.chev}>{open.endpoint ? '▾' : '▸'}</span>
        </div>
        <div className={`${styles.itemsWrap} ${open.endpoint ? styles.itemsOpen : styles.itemsClosed}`}>
          <div className={styles.items}>
            {renderRow({
              label: 'Security Overview',
              icon: <SettingOutlined />,
              href: items.href.securityOverview,
              active: pathname === '/security',
              isSub: true,
            })}
            {renderRow({
              label: 'Configuration Assessment',
              icon: <ControlOutlined />,
              href: items.href.configurationAssessment,
              active: pathname.startsWith('/endpoint-security/configuration-assessment'),
              isSub: true,
            })}
            {renderRow({
              label: 'Malware Detection',
              icon: <BugOutlined />,
              href: items.href.malwareDetection,
              active: pathname.startsWith('/endpoint-security/malware-detection'),
              isSub: true,
            })}
            {renderRow({
              label: 'File Integrity Monitoring (FIM)',
              icon: <ThunderboltOutlined />,
              href: items.href.fim,
              active: pathname.startsWith('/endpoint-security/fim'),
              isSub: true,
            })}
            {renderRow({
              label: 'Rootcheck',
              icon: <AuditOutlined />,
              href: items.href.rootcheck,
              active: pathname.startsWith('/endpoint-security/rootcheck'),
              isSub: true,
            })}
          </div>
        </div>

        <div className={`${styles.groupHeader} ${threatGroupActive ? styles.groupHeaderActive : ''}`} onClick={() => toggleGroup('threat')}>
          <div className={styles.groupLeft}>
            <span className={styles.icon}>
              <SafetyOutlined />
            </span>
            <span className={styles.groupLabel}>Threat Intelligence</span>
          </div>
          <span className={styles.chev}>{open.threat ? '▾' : '▸'}</span>
        </div>
        <div className={`${styles.itemsWrap} ${open.threat ? styles.itemsOpen : styles.itemsClosed}`}>
          <div className={styles.items}>
            {renderRow({
              label: 'Incidents',
              icon: <SafetyOutlined />,
              href: items.href.incidents,
              active: pathname === '/incidents' || pathname.startsWith('/incidents/'),
              isSub: true,
            })}
            {renderRow({
              label: 'Incident Dashboard',
              icon: <DashboardOutlined />,
              href: items.href.incidentsDashboard,
              active: pathname.startsWith('/incidents/dashboard'),
              isSub: true,
            })}
            {renderRow({
              label: 'Indicators',
              icon: <SafetyOutlined />,
              href: items.href.threatIndicators,
              active: pathname === '/threat-intelligence',
              isSub: true,
            })}
            {renderRow({
              label: 'Automated Enforcement',
              icon: <SafetyOutlined />,
              href: items.href.enforcement,
              active: pathname.startsWith('/enforcement'),
              isSub: true,
            })}
            {renderRow({
              label: 'Threat Hunting',
              icon: <FileSearchOutlined />,
              href: items.href.threatHunting,
              active: pathname.startsWith('/threat-intelligence/threat-hunting'),
              isSub: true,
            })}
            {renderRow({
              label: 'Vulnerability Detection',
              icon: <ControlOutlined />,
              href: items.href.vulnerabilityDetection,
              active: pathname.startsWith('/threat-intelligence/vulnerability-detection'),
              isSub: true,
            })}
            {renderRow({
              label: 'MITRE ATT&CK',
              icon: <SafetyOutlined />,
              href: items.href.mitre,
              active: pathname.startsWith('/threat-intelligence/mitre'),
              isSub: true,
            })}
          </div>
        </div>

        <div className={styles.sectionTitle}>Platform</div>
        <div className={`${styles.groupHeader} ${platformGroupActive ? styles.groupHeaderActive : ''}`} onClick={() => toggleGroup('platform')}>
          <div className={styles.groupLeft}>
            <span className={styles.icon}>
              <ClusterOutlined />
            </span>
            <span className={styles.groupLabel}>Platform</span>
          </div>
          <span className={styles.chev}>{open.platform ? '▾' : '▸'}</span>
        </div>
        <div className={`${styles.itemsWrap} ${open.platform ? styles.itemsOpen : styles.itemsClosed}`}>
          <div className={styles.items}>
            {renderRow({ label: 'Cloud Security', icon: <CloudOutlined />, disabled: true, isSub: true })}
            {renderRow({
              label: 'Agent Management',
              icon: <ApartmentOutlined />,
              href: items.href.agentManagement,
              active: pathname.startsWith('/agent-management'),
              isSub: true,
            })}
            {renderRow({
              label: 'Users',
              icon: <UserOutlined />,
              href: items.href.platformUsers,
              active: pathname.startsWith('/platform/users'),
              isSub: true,
            })}
            {renderRow({
              label: 'Roles',
              icon: <SettingOutlined />,
              href: items.href.platformRoles,
              active: pathname.startsWith('/platform/roles'),
              isSub: true,
            })}
            {renderRow({
              label: 'Audit Logs',
              icon: <AuditOutlined />,
              href: items.href.platformAuditLogs,
              active: pathname.startsWith('/platform/audit-logs'),
              isSub: true,
            })}
            {renderRow({
              label: 'Evidence Automation',
              icon: <FileSearchOutlined />,
              href: items.href.platformEvidenceAutomation,
              active: pathname.startsWith('/platform/evidence-automation'),
              isSub: true,
            })}
            {renderRow({
              label: 'Control Test Scripts',
              icon: <ControlOutlined />,
              href: items.href.platformControlTestScripts,
              active: pathname.startsWith('/platform/control-test-scripts'),
              isSub: true,
            })}
            {renderRow({
              label: 'Monitoring',
              icon: <SafetyOutlined />,
              href: items.href.platformMonitoring,
              active: pathname.startsWith('/platform/monitoring'),
              isSub: true,
            })}
            {renderRow({
              label: 'Server Management',
              icon: <ClusterOutlined />,
              href: items.href.serverManagement,
              active: pathname.startsWith('/server-management'),
              isSub: true,
            })}
            {renderRow({
              label: 'Index Management',
              icon: <ClusterOutlined />,
              href: items.href.indexManagement,
              active: pathname.startsWith('/index-management'),
              isSub: true,
            })}
            {renderRow({
              label: 'Dashboard Management',
              icon: <ClusterOutlined />,
              href: items.href.dashboardManagement,
              active: pathname.startsWith('/dashboard-management'),
              isSub: true,
            })}
            {renderRow({
              label: 'Integrations',
              icon: <ClusterOutlined />,
              href: items.href.integrations,
              active: pathname.startsWith('/integrations'),
              isSub: true,
            })}
          </div>
        </div>

        <div className={styles.sectionTitle}>Admin</div>
        <div className={`${styles.groupHeader} ${adminGroupActive ? styles.groupHeaderActive : ''}`} onClick={() => toggleGroup('admin')}>
          <div className={styles.groupLeft}>
            <span className={styles.icon}>
              <SettingOutlined />
            </span>
            <span className={styles.groupLabel}>Admin / Operations</span>
          </div>
          <span className={styles.chev}>{open.admin ? '▾' : '▸'}</span>
        </div>
        <div className={`${styles.itemsWrap} ${open.admin ? styles.itemsOpen : styles.itemsClosed}`}>
          <div className={styles.items}>
            {renderRow({ label: 'Admin', icon: <SettingOutlined />, href: items.href.admin, active: pathname.startsWith('/admin'), isSub: true })}
            {renderRow({ label: 'Onboarding', icon: <SettingOutlined />, href: items.href.onboarding, active: pathname.startsWith('/onboarding'), isSub: true })}
            {renderRow({ label: 'Dead Letter', icon: <SettingOutlined />, href: items.href.deadLetter, active: pathname.startsWith('/dead-letter'), isSub: true })}
          </div>
        </div>
      </nav>

      {/* QA checklist:
          - SidebarNav is mounted via AppShell
          - Top-level order matches IA (Dashboard → GRC/Compliance → Assets → Current Asset → Endpoint → Threat → Platform → Admin)
          - Asset context detected from /assets/:assetId and /endpoints/:assetId
          - While on /assets/:assetId, endpoint/threat clicks drill into /endpoints/:assetId/...
          - Query params preserved (tenantId/range/slaHours/enforceability/staleOnly)
      */} 
    </div>
  );
}

export { buildCommonQuery, endpointHref, getCurrentAssetId, simpleHref };

'use client';

import { useState } from 'react';
import { ExternalLink, Search, Filter, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Vulnerability = {
    id: string;
    cve_id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    cvss_score: number;
    status: 'open' | 'resolved' | 'accepted_risk';
    sla_breach_date: string;
    asset: string;
    source_ref: string;
};

// Mock data to demonstrate the layout according to specs
const MOCK_VULNS: Vulnerability[] = [
    {
        id: 'vuln-001',
        cve_id: 'CVE-2023-4863',
        title: 'Heap buffer overflow in WebP',
        severity: 'critical',
        cvss_score: 8.8,
        status: 'open',
        sla_breach_date: '2023-11-01',
        asset: 'prod-frontend-01',
        source_ref: 'https://security.example.com/vuln/CVE-2023-4863',
    },
    {
        id: 'vuln-002',
        cve_id: 'CVE-2023-38545',
        title: 'curl SOCKS5 heap buffer overflow',
        severity: 'high',
        cvss_score: 7.5,
        status: 'open',
        sla_breach_date: '2023-12-15',
        asset: 'prod-api-cluster',
        source_ref: 'https://security.example.com/vuln/CVE-2023-38545',
    },
    {
        id: 'vuln-003',
        cve_id: 'CVE-2021-44228',
        title: 'Apache Log4j2 JNDI features do not protect against attacker controlled LDAP',
        severity: 'critical',
        cvss_score: 10.0,
        status: 'resolved',
        sla_breach_date: '2021-12-25',
        asset: 'legacy-backend-04',
        source_ref: 'https://security.example.com/vuln/CVE-2021-44228',
    }
];

function severityVariant(severity: string) {
    if (severity === 'critical') return 'danger';
    if (severity === 'high') return 'warning';
    if (severity === 'medium') return 'info';
    return 'neutral';
}

function statusVariant(status: string) {
    if (status === 'resolved') return 'success';
    if (status === 'accepted_risk') return 'warning';
    return 'neutral';
}

export default function VulnerabilityDetectionPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('open');

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <div className="max-w-content mx-auto px-6 py-8 space-y-8">
                <div>
                    <nav className="text-xs text-[var(--text-secondary)] mb-2">
                        <span>SecOps</span> <span className="px-1">/</span> <span className="text-[var(--text-primary)]">Vulnerability Detection</span>
                    </nav>
                    <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Vulnerability Detection</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">
                        Monitor, prioritize, and remediate security vulnerabilities across your infrastructure based on strict SLAs.
                    </p>
                </div>

                {/* Severity overview cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="p-6 bg-[var(--card-bg)] border-l-4 border-l-[var(--accent-red)] border-[var(--card-border)] shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-sm text-[var(--text-secondary)]">Critical Severity</div>
                                <div className="text-3xl font-bold mt-2 text-red-500">24</div>
                            </div>
                            <ShieldAlert className="w-5 h-5 text-red-500 opacity-80" />
                        </div>
                        <div className="text-sm text-[var(--text-tertiary)] mt-1">Requires immediate action</div>
                    </Card>
                    <Card className="p-6 bg-[var(--card-bg)] border-l-4 border-l-[var(--accent-orange)] border-[var(--card-border)] shadow-sm">
                        <div className="text-sm text-[var(--text-secondary)]">High Severity</div>
                        <div className="text-3xl font-bold mt-2 text-amber-500">86</div>
                        <div className="text-sm text-[var(--text-tertiary)] mt-1">SLA breach approaching</div>
                    </Card>
                    <Card className="p-6 bg-[var(--card-bg)] border-l-4 border-l-[var(--accent-blue)] border-[var(--card-border)] shadow-sm">
                        <div className="text-sm text-[var(--text-secondary)]">Medium & Low</div>
                        <div className="text-3xl font-bold mt-2 text-blue-400">312</div>
                        <div className="text-sm text-[var(--text-tertiary)] mt-1">Routine patching required</div>
                    </Card>
                    <Card className="p-6 bg-[var(--card-bg)] border-l-4 border-l-[var(--accent-green)] border-[var(--card-border)] shadow-sm">
                        <div className="text-sm text-[var(--text-secondary)]">Resolved (30d)</div>
                        <div className="text-3xl font-bold mt-2 text-green-500">1,245</div>
                        <div className="text-sm text-[var(--text-tertiary)] mt-1">Successfully addressed</div>
                    </Card>
                </div>

                {/* Search + filter controls */}
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-3 flex-wrap">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search CVE, Asset, or Title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pl-9 w-72 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--text-secondary)]" />
                        </div>

                        <div className="relative">
                            <select
                                value={severityFilter}
                                onChange={(e) => setSeverityFilter(e.target.value)}
                                className="appearance-none border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                            >
                                <option value="all">All Severities</option>
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                            <Filter className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="appearance-none border border-[var(--card-border)] rounded-lg px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                            >
                                <option value="all">All Statuses</option>
                                <option value="open">Open</option>
                                <option value="resolved">Resolved</option>
                                <option value="accepted_risk">Accepted Risk</option>
                            </select>
                            <Filter className="absolute right-2.5 top-2.5 h-4 w-4 text-[var(--text-secondary)] pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* SLA-based vulnerability list (Enterprise Data Table Dense Layout) */}
                <div className="border border-[var(--card-border)] rounded-lg overflow-hidden bg-[var(--card-bg)] shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#111827] border-b border-[var(--card-border)] text-[var(--text-secondary)]">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium">CVE ID</th>
                                    <th className="px-3 py-2 text-left font-medium">Vulnerability Title</th>
                                    <th className="px-3 py-2 text-left font-medium">Severity / CVSS</th>
                                    <th className="px-3 py-2 text-left font-medium">Asset</th>
                                    <th className="px-3 py-2 text-left font-medium">SLA Deadline</th>
                                    <th className="px-3 py-2 text-left font-medium">Status</th>
                                    <th className="px-4 py-2 text-right font-medium uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--card-border)]">
                                {MOCK_VULNS.map((vuln) => {
                                    return (
                                        <tr key={vuln.id} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                                            <td className="px-3 py-2 font-mono text-xs text-[var(--accent-blue)]">{vuln.cve_id}</td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-[var(--text-primary)] max-w-sm truncate" title={vuln.title}>{vuln.title}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={severityVariant(vuln.severity)} className="uppercase px-1.5">{vuln.severity}</Badge>
                                                    <span className="text-xs text-[var(--text-secondary)]">{vuln.cvss_score.toFixed(1)}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-xs text-[var(--text-primary)]">{vuln.asset}</td>
                                            <td className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                                                {new Date(vuln.sla_breach_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Badge variant={statusVariant(vuln.status)}>{vuln.status.replace('_', ' ')}</Badge>
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Open in source deep-link guardrail enforced */}
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={!vuln.source_ref}
                                                                onClick={() => {
                                                                    if (!vuln.source_ref) return;
                                                                    window.open(vuln.source_ref, '_blank', 'noopener,noreferrer');
                                                                }}
                                                                className="text-xs h-8 px-2"
                                                            >
                                                                <ExternalLink className="w-3 h-3 mr-1.5" /> Source
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            {vuln.source_ref ? 'Open Source Link' : 'No source available'}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

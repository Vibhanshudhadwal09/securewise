'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, Check, ExternalLink, Zap } from 'lucide-react';
import IntegrationSetupModal from './components/IntegrationSetupModal';
import { useToast } from '@/components/ui/Toast';

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  logo: string;
  collections: number;
  rules: number;
  connected: boolean;
  status: 'available' | 'coming-soon';
  template: any;
}

function readCookie(name: string): string | null {
  const cur = String(document.cookie || '')
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`));
  if (!cur) return null;
  const raw = cur.split('=')[1] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function fetchJson(url: string, tenantId: string) {
  const res = await fetch(url, { credentials: 'include', headers: { 'x-tenant-id': tenantId }, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(String((json as any)?.error || `HTTP ${res.status}`));
  return json;
}

function coerceList(value: any) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const tenantId = useMemo(() => readCookie('sw_tenant') || 'demo-tenant', []);
  const toast = useToast();

  useEffect(() => {
    void fetchIntegrations();
  }, []);

  const getMockIntegrations = (): Integration[] => [
    {
      id: 'wazuh',
      name: 'Wazuh Manager',
      category: 'SIEM',
      description:
        'Open-source security monitoring platform. Automate evidence collection for endpoint security, FIM, SCA, vulnerability detection, and threat intelligence.',
      logo: '/logos/wazuh.svg',
      collections: 15,
      rules: 8,
      connected: false,
      status: 'available',
      template: { vendorId: 'wazuh', vendorName: 'Wazuh Manager', category: 'SIEM' },
    },
    {
      id: 'crowdstrike',
      name: 'CrowdStrike Falcon',
      category: 'EDR/XDR',
      description:
        'Industry-leading endpoint detection and response platform. Automate evidence collection for endpoint security, threat detection, and incident response compliance requirements.',
      logo: '/logos/crowdstrike.svg',
      collections: 8,
      rules: 4,
      connected: false,
      status: 'available',
      template: { vendorId: 'crowdstrike', vendorName: 'CrowdStrike Falcon', category: 'EDR/XDR' },
    },
    {
      id: 'aws',
      name: 'Amazon Web Services (AWS)',
      category: 'Cloud',
      description:
        'Leading cloud infrastructure platform. Automate evidence collection for infrastructure security, IAM policies, encryption, and cloud configuration compliance.',
      logo: '/logos/aws.svg',
      collections: 10,
      rules: 6,
      connected: false,
      status: 'available',
      template: { vendorId: 'aws', vendorName: 'Amazon Web Services (AWS)', category: 'Cloud' },
    },
    {
      id: 'okta',
      name: 'Okta',
      category: 'Identity/SSO',
      description:
        'Leading identity and access management platform. Automate user provisioning, MFA enforcement, and access review evidence for SOC 2 and ISO 27001 compliance.',
      logo: '/logos/okta.svg',
      collections: 6,
      rules: 3,
      connected: false,
      status: 'available',
      template: { vendorId: 'okta', vendorName: 'Okta', category: 'Identity/SSO' },
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      category: 'Cloud',
      description:
        'Microsoft cloud computing platform. Automate evidence collection for Azure infrastructure security, identity management, and cloud configuration compliance.',
      logo: '/logos/azure.svg',
      collections: 9,
      rules: 5,
      connected: false,
      status: 'available',
      template: { vendorId: 'azure', vendorName: 'Microsoft Azure', category: 'Cloud' },
    },
    {
      id: 'm365',
      name: 'Microsoft 365',
      category: 'Productivity',
      description:
        'Comprehensive productivity and collaboration platform. Automate evidence collection for data protection, access controls, and security configurations.',
      logo: '/logos/microsoft365.svg',
      collections: 7,
      rules: 4,
      connected: false,
      status: 'available',
      template: { vendorId: 'm365', vendorName: 'Microsoft 365', category: 'Productivity' },
    },
    {
      id: 'splunk',
      name: 'Splunk',
      category: 'SIEM',
      description:
        'Enterprise security information and event management. Automate evidence collection for log management, incident detection, and security monitoring compliance.',
      logo: '/logos/splunk.svg',
      collections: 12,
      rules: 8,
      connected: false,
      status: 'available',
      template: { vendorId: 'splunk', vendorName: 'Splunk', category: 'SIEM' },
    },
  ];

  const fetchIntegrations = async () => {
    let wazuhConnected = false;
    try {
      setLoading(true);
      const [templatesRes, connectedRes, wazuhRes] = await Promise.allSettled([
        fetchJson('/api/integrations/templates', tenantId),
        fetchJson('/api/integrations/connected', tenantId),
        fetchJson('/api/integrations/wazuh/config', tenantId),
      ]);

      const templatesJson = templatesRes.status === 'fulfilled' ? templatesRes.value : null;
      const connectedJson = connectedRes.status === 'fulfilled' ? connectedRes.value : null;
      const wazuhJson = wazuhRes.status === 'fulfilled' ? wazuhRes.value : null;
      wazuhConnected = Boolean(wazuhJson?.connected || wazuhJson?.config?.api_url);

      const connectedIds = new Set(
        (connectedJson?.integrations || []).map((i: any) => String(i.vendorId || i.vendor_id || '').toLowerCase())
      );

      const templates = Array.isArray(templatesJson?.templates) ? templatesJson.templates : [];
      if (!templates.length) throw new Error('No templates');

      const normalized: Integration[] = templates.map((t: any) => {
        const vendorId = String(t.vendorId || t.vendor_id || t.id || '');
        const vendorName = String(t.vendorName || t.vendor_name || 'Integration');
        const category = String(t.category || 'General');
        const description = String(t.description || '');
        const logo = String(t.logoUrl || t.logo_url || '');
        const collections = coerceList(t.evidenceCollections ?? t.evidence_collections).length;
        const rules = coerceList(t.monitoringRules ?? t.monitoring_rules).length;
        const isWazuh = vendorId.toLowerCase() === 'wazuh';
        return {
          id: vendorId || vendorName.toLowerCase().replace(/\s+/g, '-'),
          name: vendorName,
          category,
          description,
          logo,
          collections,
          rules,
          connected: connectedIds.has(vendorId.toLowerCase()) || (isWazuh && wazuhConnected),
          status: t.isActive === false ? 'coming-soon' : 'available',
          template: t,
        };
      });

      if (!normalized.some((i) => i.id === 'wazuh')) {
        normalized.unshift({
          id: 'wazuh',
          name: 'Wazuh Manager',
          category: 'SIEM',
          description:
            'Open-source security monitoring platform. Automate evidence collection for endpoint security, FIM, SCA, vulnerability detection, and threat intelligence.',
          logo: '/logos/wazuh.svg',
          collections: 15,
          rules: 8,
          connected: wazuhConnected,
          status: 'available',
          template: { vendorId: 'wazuh', vendorName: 'Wazuh Manager', category: 'SIEM' },
        });
      }

      setIntegrations(normalized);
      setUseMock(false);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      const fallback = getMockIntegrations().map((integration) =>
        integration.id === 'wazuh' ? { ...integration, connected: wazuhConnected } : integration
      );
      setIntegrations(fallback);
      setUseMock(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch =
      integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(integrations.map((i) => i.category)));

  const handleConnect = async (integration: Integration) => {
    if (useMock) {
      toast.error('Connect unavailable', 'Integration templates are unavailable.');
      return;
    }
    setSelectedTemplate(integration.template);
    setShowSetupModal(true);
  };

  const handleSetupComplete = () => {
    setShowSetupModal(false);
    setSelectedTemplate(null);
    void fetchIntegrations();
    toast.success('Integration connected successfully!');
  };

  const selectedIntegration = selectedTemplate;
  const handleSaveIntegration = handleSetupComplete;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* BLUE GRADIENT HEADER */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="px-8 py-12">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Zap className="w-10 h-10" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-5xl font-bold mb-3">Integration Marketplace</h1>
                <p className="text-xl text-blue-100">Connect 30+ security vendors for automated evidence collection</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4">
              <div className="text-sm text-blue-200 mb-1">Available</div>
              <div className="text-3xl font-bold">{integrations.filter((i) => i.status === 'available').length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4">
              <div className="text-sm text-blue-200 mb-1">Connected</div>
              <div className="text-3xl font-bold">{integrations.filter((i) => i.connected).length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search integrations by vendor or capability..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" strokeWidth={2} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-medium text-gray-700 bg-white cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* INTEGRATION CARDS GRID */}
      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading integrations...</p>
            </div>
          </div>
        ) : filteredIntegrations.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
              <Search className="w-8 h-8 text-gray-400" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No integrations found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredIntegrations.map((integration) => (
              <div
                key={integration.id}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-blue-400 hover:-translate-y-1"
              >
                {/* Logo and Category Badge */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    {integration.logo ? (
                      <img src={integration.logo} alt={integration.name} className="w-12 h-12 object-contain" />
                    ) : (
                      <span className="text-white font-bold text-2xl">{integration.name.substring(0, 2)}</span>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold border border-blue-200">
                    {integration.category}
                  </span>
                </div>

                {/* Integration Name */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">{integration.name}</h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-3">
                  {integration.description}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Collections</div>
                    <div className="text-lg font-bold text-gray-900">{integration.collections}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Rules</div>
                    <div className="text-lg font-bold text-gray-900">{integration.rules}</div>
                  </div>
                </div>

                {/* Connect Button */}
                {integration.id === 'wazuh' ? (
                  <Link
                    href="/integrations/wazuh"
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                  >
                    {integration.connected ? 'Configure' : 'Connect'}
                    <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                  </Link>
                ) : integration.connected ? (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-green-100 text-green-700 rounded-xl font-bold flex items-center justify-center gap-2 border-2 border-green-300"
                  >
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                    Connected
                  </button>
                ) : integration.status === 'coming-soon' ? (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold cursor-not-allowed"
                  >
                    Coming Soon
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(integration)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                  >
                    Connect
                    <ExternalLink className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keep the IntegrationSetupModal if it exists */}
      {selectedIntegration && (
        <IntegrationSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          integration={selectedIntegration}
          onSave={handleSaveIntegration}
        />
      )}
    </div>
  );
}

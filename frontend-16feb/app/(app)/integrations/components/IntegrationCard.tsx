'use client';

import { useState } from 'react';
import { CheckCircle, ExternalLink } from 'lucide-react';
import { Button as BoldButton } from '@/components/Button';
import { Badge } from '@/components/ui/badge';

interface IntegrationCardProps {
  template: any;
  viewMode: 'grid' | 'list';
  onConnect: (template: any) => void;
  isConnected: boolean;
}

export default function IntegrationCard({ template, viewMode, onConnect, isConnected }: IntegrationCardProps) {
  const vendorName = String(template.vendorName || template.vendor_name || 'Vendor');
  const category = String(template.category || 'General');
  const description = String(template.description || '');
  const logoUrl = template.logoUrl || template.logo_url || '';
  const websiteUrl = template.websiteUrl || template.website_url || '';
  const evidenceCollections = template.evidenceCollections || template.evidence_collections || [];
  const monitoringRules = template.monitoringRules || template.monitoring_rules || [];

  const [logoError, setLogoError] = useState(false);
  const hasLogo = Boolean(logoUrl && !logoError);
  const handleConnectClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isConnected) return;
    onConnect(template);
  };

  const handleCardClick = () => {
    if (isConnected) return;
    onConnect(template);
  };

  if (viewMode === 'list') {
    return (
      <div
        className="border-2 border-gray-200 rounded-2xl p-4 bg-white flex items-center gap-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0">
          {hasLogo ? (
            <img
              src={logoUrl}
              alt={vendorName}
              className="w-12 h-12 object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="text-2xl font-bold text-gray-400">{vendorName[0]}</div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{vendorName}</h3>
            {isConnected ? <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" /> : null}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="info">{category}</Badge>
            {isConnected ? <Badge variant="success">Connected</Badge> : <Badge>Available</Badge>}
          </div>
          <p className="text-sm text-gray-700 line-clamp-2">{description}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {websiteUrl ? (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600"
              aria-label="Open vendor website"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          ) : null}
          <BoldButton
            variant={isConnected ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleConnectClick}
            disabled={isConnected}
          >
            {isConnected ? 'Connected' : 'Connect'}
          </BoldButton>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-2 border-gray-200 rounded-2xl p-6 bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-16 h-16 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
          {hasLogo ? (
            <img
              src={logoUrl}
              alt={vendorName}
              className="w-12 h-12 object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="text-2xl font-bold text-gray-400">{vendorName[0]}</div>
          )}
        </div>
        {isConnected ? <CheckCircle className="w-6 h-6 text-success-600" /> : null}
      </div>

      <h3 className="font-semibold text-lg mb-1">{vendorName}</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant="info">{category}</Badge>
        {isConnected ? <Badge variant="success">Connected</Badge> : <Badge>Available</Badge>}
      </div>
      <p className="text-sm text-gray-700 mb-4 line-clamp-3">{description}</p>

      <div className="flex gap-4 mb-4 text-xs text-gray-600">
        <div>
          <span className="font-medium">{evidenceCollections.length || 0}</span> Collections
        </div>
        <div>
          <span className="font-medium">{monitoringRules.length || 0}</span> Rules
        </div>
      </div>

      <div className="flex gap-2">
        <BoldButton
          variant={isConnected ? 'secondary' : 'primary'}
          fullWidth
          onClick={handleConnectClick}
          disabled={isConnected}
        >
          {isConnected ? 'Connected' : 'Connect'}
        </BoldButton>
        {websiteUrl ? (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Open vendor website"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink className="w-5 h-5 text-gray-600" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

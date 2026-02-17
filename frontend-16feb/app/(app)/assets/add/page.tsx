'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type AssetType = {
  type_code: string;
  display_name: string;
  category?: string;
  description?: string;
  default_criticality?: string;
  recommended_controls?: Array<{ framework: string; code: string }> | string;
};

export default function AddAssetPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tenantId = sp?.get('tenantId') || 'demo-tenant';

  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [formData, setFormData] = useState({
    assetId: '',
    name: '',
    kind: 'endpoint',
    env: 'prod',
    criticality: 'medium',
    description: '',
    ownerEmail: '',
    department: '',
    location: '',
    ipAddress: '',
    hostname: '',
    operatingSystem: '',
    tags: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAssetTypes();
  }, [tenantId]);

  async function fetchAssetTypes() {
    const res = await fetch('/api/assets/types', {
      credentials: 'include',
      headers: { 'x-tenant-id': tenantId }
    });
    const data = await res.json();
    setAssetTypes(data.types || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        assetId: formData.assetId || generateAssetId(formData.kind),
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': tenantId },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : '';
        router.push(`/assets${qs}`);
      } else {
        alert(`Error: ${data.error || 'Unable to create asset'}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function generateAssetId(kind: string) {
    const prefix = kind.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
  }

  const selectedType = useMemo(
    () => assetTypes.find((t) => t.type_code === formData.kind),
    [assetTypes, formData.kind]
  );
  const recommendedControls = useMemo(() => {
    if (!selectedType?.recommended_controls) return [];
    if (typeof selectedType.recommended_controls === 'string') {
      try {
        return JSON.parse(selectedType.recommended_controls) as Array<{ framework: string; code: string }>;
      } catch {
        return [];
      }
    }
    return selectedType.recommended_controls;
  }, [selectedType]);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Asset</h1>
        <p className="text-gray-600 mt-2">Register a new asset with automatic control recommendations</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-3">Asset Type</label>
            <div className="grid grid-cols-3 gap-3">
              {assetTypes.map((type) => (
                <button
                  key={type.type_code}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      kind: type.type_code,
                      criticality: type.default_criticality || formData.criticality
                    })
                  }
                  className={`p-4 border-2 rounded-lg text-left hover:border-blue-500 transition ${
                    formData.kind === type.type_code ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="font-semibold">{type.display_name}</div>
                  <div className="text-xs text-gray-600 mt-1">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Asset Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="e.g., Production Web Server"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Asset ID</label>
              <input
                type="text"
                value={formData.assetId}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Auto-generated if empty"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2 h-20"
              placeholder="Describe this asset"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Environment</label>
              <select
                value={formData.env}
                onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="prod">Production</option>
                <option value="staging">Staging</option>
                <option value="dev">Development</option>
                <option value="test">Test</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Criticality</label>
              <select
                value={formData.criticality}
                onChange={(e) => setFormData({ ...formData, criticality: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Owner Email</label>
              <input
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="owner@company.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Security Operations"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="AWS us-east-1, Building A"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">IP Address</label>
              <input
                type="text"
                value={formData.ipAddress}
                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="10.0.1.100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Hostname</label>
              <input
                type="text"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="host-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Operating System</label>
              <input
                type="text"
                value={formData.operatingSystem}
                onChange={(e) => setFormData({ ...formData, operatingSystem: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ubuntu 22.04"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tags</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="production, critical, database"
            />
          </div>

          {selectedType && recommendedControls.length > 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold text-blue-900">Auto-Protection Enabled</p>
              <p className="text-sm text-blue-700 mt-1">
                This asset will receive {recommendedControls.length} control recommendations
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {recommendedControls.map((ctrl) => (
                  <Badge key={`${ctrl.framework}-${ctrl.code}`} variant="neutral">
                    {ctrl.framework}: {ctrl.code}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating Asset...' : 'Create Asset with Auto-Protection'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}

import { Badge } from '@/components/ui/badge';

const CHECKS = [
  { id: 'expiry', label: 'Expiry date' },
  { id: 'issuer', label: 'Issuer validation' },
  { id: 'cipher', label: 'Cipher strength' },
  { id: 'chain', label: 'Chain validity' },
  { id: 'revocation', label: 'Certificate revocation (CRL/OCSP)' },
];

export default function Step2TlsChecker(props: { value: any; onChange: (next: any) => void }) {
  const { value, onChange } = props;
  const cfg = value || {};
  const checks = Array.isArray(cfg.checks) ? cfg.checks : [];

  const toggleCheck = (id: string) => {
    if (checks.includes(id)) {
      onChange({ ...cfg, checks: checks.filter((c: string) => c !== id) });
    } else {
      onChange({ ...cfg, checks: [...checks, id] });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">TLS / Certificate check</div>
          <div className="text-xs text-gray-500">Monitor certificate health and expiration.</div>
        </div>
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">TLS</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600">Hostname</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            placeholder="example.com"
            value={cfg.hostname || ''}
            onChange={(e) => onChange({ ...cfg, hostname: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Port</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            value={cfg.port || 443}
            onChange={(e) => onChange({ ...cfg, port: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">Checks</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CHECKS.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={checks.includes(c.id)} onChange={() => toggleCheck(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600">Alert threshold (days before expiry)</label>
        <input
          type="range"
          min={7}
          max={90}
          value={cfg.alert_days || 30}
          onChange={(e) => onChange({ ...cfg, alert_days: Number(e.target.value) })}
          className="w-full"
        />
        <div className="text-xs text-gray-500">{cfg.alert_days || 30} days</div>
      </div>

      <div className="flex justify-end">
        <button type="button" className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
          Test check
        </button>
      </div>
    </div>
  );
}

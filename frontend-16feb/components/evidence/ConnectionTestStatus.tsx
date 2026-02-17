import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import type { ConnectionTestResult } from '@/types/evidence';

export default function ConnectionTestStatus(props: { loading?: boolean; result?: ConnectionTestResult | null }) {
  const { loading, result } = props;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="animate-spin" size={16} /> Testing connection...
      </div>
    );
  }

  if (!result) return null;

  if (result.success) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle size={16} /> Connection successful
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-red-600">
      <XCircle size={16} /> {result.error || 'Connection failed'}
    </div>
  );
}

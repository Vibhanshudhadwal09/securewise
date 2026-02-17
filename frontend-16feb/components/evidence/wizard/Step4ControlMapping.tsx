import ControlSelector from '@/components/evidence/ControlSelector';
import { Badge } from '@/components/ui/badge';

export default function Step4ControlMapping(props: {
  tenantId?: string;
  selectedControls: string[];
  onChange: (next: string[]) => void;
  suggested?: string[];
}) {
  const { tenantId, selectedControls, onChange, suggested } = props;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Map to controls</div>
          <div className="text-xs text-gray-500">Choose which controls this evidence supports.</div>
        </div>
        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">{selectedControls.length} selected</Badge>
      </div>

      {suggested && suggested.length ? (
        <div className="text-xs text-gray-600">
          Based on this evidence, we suggest these controls. You can edit them anytime.
        </div>
      ) : null}

      <ControlSelector tenantId={tenantId} selected={selectedControls} onChange={onChange} suggested={suggested} />

      {selectedControls.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedControls.map((id) => (
            <Badge key={id} className="bg-gray-100 text-gray-700 border-gray-200">
              {id}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

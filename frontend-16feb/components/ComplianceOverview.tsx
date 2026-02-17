'use client';
 
interface ComplianceOverviewProps {
  scores: Array<{
    framework: string;
    score_percentage: number;
    total_controls: number;
    controls_with_evidence: number;
    evidence_count: number;
  }>;
}
 
export default function ComplianceOverview({ scores }: ComplianceOverviewProps) {
  if (!scores || scores.length === 0) return null;
 
  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score_percentage, 0) / scores.length);
  const totalControls = scores.reduce((sum, s) => sum + s.total_controls, 0);
  const totalEvidence = scores.reduce((sum, s) => sum + s.evidence_count, 0);
  const readyForAudit = scores.filter((s) => s.score_percentage >= 80).length;
  const needsAttention = scores.filter((s) => s.score_percentage < 60).length;
 
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-blue-600 text-sm font-medium mb-2">Average Compliance</div>
        <div className="text-4xl font-bold text-blue-700">{avgScore}%</div>
      </div>
 
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-purple-600 text-sm font-medium mb-2">Total Controls</div>
        <div className="text-4xl font-bold text-purple-700">{totalControls}</div>
      </div>
 
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-green-600 text-sm font-medium mb-2">Evidence Collected</div>
        <div className="text-4xl font-bold text-green-700">{totalEvidence}</div>
      </div>
 
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="text-amber-600 text-sm font-medium mb-2">Ready for Audit</div>
        <div className="text-4xl font-bold text-amber-700">{readyForAudit}/{scores.length}</div>
        <div className="text-xs text-amber-700 mt-1">Needs attention: {needsAttention}</div>
      </div>
    </div>
  );
}

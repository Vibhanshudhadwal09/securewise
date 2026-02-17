'use client';
 
interface ComplianceScoreCardProps {
  framework: string;
  score: number;
  controlsWithEvidence: number;
  totalControls: number;
  evidenceCount: number;
}
 
export default function ComplianceScoreCard({
  framework,
  score,
  controlsWithEvidence,
  totalControls,
  evidenceCount,
}: ComplianceScoreCardProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (s >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };
 
  const getProgressColor = (s: number) => {
    if (s >= 80) return 'bg-green-600';
    if (s >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };
 
  const getScoreIcon = (s: number) => {
    if (s >= 80) return 'OK';
    if (s >= 60) return 'At risk';
    return 'Off track';
  };
 
  const gap = Math.max(0, totalControls - controlsWithEvidence);
 
  return (
    <div className={`border-2 rounded-lg p-6 ${getScoreColor(score)} transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold uppercase">{framework}</h3>
        <span className="text-xs font-semibold uppercase">{getScoreIcon(score)}</span>
      </div>
 
      <div className="text-5xl font-bold mb-2">{score}%</div>
 
      <div className="w-full bg-white rounded-full h-3 mb-4">
        <div
          className={`${getProgressColor(score)} rounded-full h-3 transition-all duration-500`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
 
      <div className="text-sm space-y-1">
        <p>
          Controls with Evidence: <strong>{controlsWithEvidence} / {totalControls}</strong>
        </p>
        <p>
          Total Evidence: <strong>{evidenceCount}</strong>
        </p>
        <p>
          Gaps: <strong>{gap} controls</strong>
        </p>
      </div>
    </div>
  );
}

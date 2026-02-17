import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SecurityPostureTrendChart from './SecurityPostureTrendChart';
import ComplianceBreakdownChart from './ComplianceBreakdownChart';

type PostureType = 'security' | 'compliance';

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function palette(score: number) {
  if (score >= 80) {
    return { color: '#16a34a', badge: 'bg-green-50 text-green-700 border-green-200', label: 'Healthy' };
  }
  if (score >= 60) {
    return { color: '#f59e0b', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'At risk' };
  }
  return { color: '#dc2626', badge: 'bg-red-50 text-red-700 border-red-200', label: 'Critical' };
}

export default function PostureScoreCard({ score, type }: { score: number; type: PostureType }) {
  const pct = clampScore(score);
  const { color, badge, label } = palette(pct);
  const title = type === 'security' ? 'Security posture' : 'Compliance posture';
  const [open, setOpen] = useState(false);

  return (
    <Card className="h-full transition-all hover:shadow-md hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge className={badge}>{label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-6">
          <div
            className="relative h-28 w-28 rounded-full p-1"
            style={{ background: `conic-gradient(${color} ${pct}%, #e5e7eb ${pct}% 100%)` }}
            aria-label={`${title} score ${pct}%`}
          >
            <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
              <div className="text-2xl font-semibold text-gray-900">{pct}%</div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div>Target: 80%+</div>
            <div>Current score reflects latest posture snapshot.</div>
            <button
              type="button"
              className="mt-2 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              onClick={() => setOpen(true)}
            >
              View details →
            </button>
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title} details</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {type === 'security' ? <SecurityPostureTrendChart days={90} /> : <ComplianceBreakdownChart />}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

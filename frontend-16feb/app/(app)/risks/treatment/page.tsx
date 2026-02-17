'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function RiskTreatmentLandingPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Risk Treatments</h1>
        <p className="text-gray-600 mt-2">Select a risk to manage treatment plans and progress.</p>
      </div>

      <Card className="p-6">
        <p className="text-sm text-gray-600">
          Risk treatments are managed per-risk. Open a risk from the register to create or update treatments, link
          controls, and review progress.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/risks">
            <Button>Go to Risk Register</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

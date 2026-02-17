import { redirect } from 'next/navigation';

// Security overview placeholder: for now, route to the main dashboard.
export default function SecurityOverviewPage() {
  redirect('/dashboard');
}


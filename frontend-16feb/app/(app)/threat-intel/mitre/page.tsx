import { redirect } from 'next/navigation';

// Back-compat: map the new IA route to the existing MITRE page.
export default function ThreatMitreRedirect() {
  redirect('/threat-intelligence/mitre');
}


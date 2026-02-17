import { redirect } from 'next/navigation';

// Back-compat: map the new IA route to the existing Threat Intelligence page.
export default function ThreatHuntingRedirect() {
  redirect('/threat-intelligence/threat-hunting');
}


import { LoginClient } from './LoginClient';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const sp = await searchParams;
  const tenant = (sp.tenant || 'demo-tenant').trim() || 'demo-tenant';
  return <LoginClient tenant={tenant} />;
}

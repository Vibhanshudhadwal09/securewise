import { apiFetch } from '../../../lib/server-api';

async function getJson(path: string) {
  const res = await apiFetch(path, { tenantId: 'demo-tenant' });
  return res.json();
}

export default async function Page() {
  const data = await getJson('auth/me');
  return (
    <main style={{ padding: 24 }}>
      <h1>Onboarding</h1>
      <pre style={{ background: '#f6f6f6', padding: 12, borderRadius: 8 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </main>
  );
}

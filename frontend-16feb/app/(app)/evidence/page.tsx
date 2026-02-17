import { redirect } from 'next/navigation';

export default async function EvidenceRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();

  Object.entries(sp || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else if (value) {
      params.set(key, value);
    }
  });

  const suffix = params.toString();
  redirect(`/compliance/evidence-collection${suffix ? `?${suffix}` : ''}`);
}

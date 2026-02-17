import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED = [
  '/dashboard',
  '/approvals',
  '/exceptions',
  '/risks',
  '/dead-letter',
  '/assets',
  '/controls',
  '/evidence',
  '/admin',
  '/endpoints',
  '/compliance',
  '/security',
  '/threat-intel',
  '/platform',
];

function stripPort(host: string): string {
  const h = String(host || '').trim();
  // If host is an IPv6 literal like "[::1]:3020", keep only the address part.
  if (h.startsWith('[')) {
    const end = h.indexOf(']');
    return end >= 0 ? h.slice(1, end) : h;
  }
  // Otherwise remove ":port" for normal hostnames / IPv4.
  return h.replace(/:\d+$/, '');
}

function isIpv4(host: string): boolean {
  const h = stripPort(host);
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
  const parts = h.split('.').map((p) => Number(p));
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
}

function isIpv6(host: string): boolean {
  const h = stripPort(host);
  // Minimal check: contains ":" and no spaces, typical for IPv6 literals.
  return Boolean(h) && h.includes(':') && !h.includes(' ');
}

function resolveTenant(req: NextRequest) {
  // Priority:
  // 1) cookie sw_tenant
  // 2) ?tenant= query (local dev)
  // 3) subdomain (tenant.example.com)
  const fromCookie = req.cookies.get('sw_tenant')?.value;
  if (fromCookie) return fromCookie;

  const fromQuery = req.nextUrl.searchParams.get('tenant');
  if (fromQuery) return fromQuery;

  const hostRaw = req.headers.get('host') || '';
  const host = stripPort(hostRaw);
  // If accessed via raw IP (e.g. 127.0.0.1 or ::1), do NOT treat the first
  // segment as a tenant. Fall back to a stable default.
  if (isIpv4(host) || isIpv6(host)) return 'demo-tenant';
  const parts = host.split('.');
  if (parts.length >= 3) return parts[0]; // tenant.example.com
  return 'demo-tenant';
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  if (!PROTECTED.some((p) => url.pathname.startsWith(p))) return NextResponse.next();

  const tenantId = resolveTenant(req);

  // Build an origin from request headers instead of relying on Next's inferred origin.
  // This prevents bad redirects like http://0.0.0.0:3020/... when running behind NAT or binding to 0.0.0.0.
  const proto = (req.headers.get('x-forwarded-proto') || 'http').split(',')[0].trim();
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(',')[0].trim();
  const origin = host ? `${proto}://${host}` : req.nextUrl.origin;

  const cookie = req.headers.get('cookie') || '';
  const res = await fetch(new URL('/api/auth/me', origin).toString(), {
    headers: { cookie, 'x-tenant-id': tenantId },
    cache: 'no-store',
  });

  if (res.ok) {
    const j: any = await res.json().catch(()=>null);
    if (j?.ok) {
      const next = NextResponse.next();
      // keep a stable cookie so the UI and API agree
      next.cookies.set('sw_tenant', tenantId, { sameSite: 'lax' });
      return next;
    }
  }

  const login = new URL('/login', origin);
  login.searchParams.set('tenant', tenantId);
  return NextResponse.redirect(login);
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };

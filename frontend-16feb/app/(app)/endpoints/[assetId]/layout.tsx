import React from 'react';

export default function EndpointLayout({ children }: { children: React.ReactNode }) {
  // AppShell provides the enterprise chrome; keep this layout minimal.
  return <>{children}</>;
}


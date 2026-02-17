import React from 'react';
import 'antd/dist/reset.css';
import './globals.css';
import PermissionProvider from '@/components/providers/PermissionProvider';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata = { title: 'SecureWise', description: 'Governed real-time GRC' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-[var(--gray-50)] text-[var(--gray-900)] antialiased">
        <PermissionProvider>
          <ToastProvider>{children}</ToastProvider>
        </PermissionProvider>
      </body>
    </html>
  );
}

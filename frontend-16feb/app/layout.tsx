import React from 'react';
import 'antd/dist/reset.css';
import './globals.css';
import PermissionProvider from '@/components/providers/PermissionProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
export const metadata = { title: 'SecureWise', description: 'Governed real-time GRC' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans min-h-screen bg-[var(--gray-50)] text-[var(--gray-900)] antialiased">
        <PermissionProvider>
          <ToastProvider>{children}</ToastProvider>
        </PermissionProvider>
      </body>
    </html>
  );
}

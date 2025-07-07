import '@/styles/globals.css';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/providers/AuthProvider';

export const metadata = { title: 'Weanime' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ash-900 text-ash-100">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

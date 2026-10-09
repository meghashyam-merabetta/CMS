import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Merabetta Admin | Dashboard',
  description: 'Admin panel for Merabetta - handle brands, categories, products, and more.',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#F9FAFB] text-[#20252D]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3006'),
  title: { default: 'NOVA Commerce — Remarkable essentials', template: '%s — NOVA Commerce' },
  description: 'A considered edit of everyday objects, wardrobe foundations, and independent design.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider><Header />{children}</ThemeProvider></body></html>;
}

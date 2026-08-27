import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Header } from '@/components/layout/header';

export const metadata: Metadata = { title: 'NOVA Commerce', description: 'Modern commerce, thoughtfully built.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><ThemeProvider><Header />{children}</ThemeProvider></body></html>;
}

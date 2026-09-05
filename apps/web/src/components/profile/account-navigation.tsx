'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LayoutDashboard, MapPin, Package, Settings } from 'lucide-react';

const items = [
  { href: '/profile', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/orders', label: 'Orders', icon: Package },
  { href: '/wishlist', label: 'Saved pieces', icon: Heart },
  { href: '/profile/addresses', label: 'Addresses', icon: MapPin },
  { href: '/profile/settings', label: 'Settings', icon: Settings },
];

export function AccountNavigation() {
  const pathname = usePathname();
  return (
    <nav className="account-navigation" aria-label="Account navigation">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon size={17} /><span>{label}</span></Link>;
      })}
    </nav>
  );
}

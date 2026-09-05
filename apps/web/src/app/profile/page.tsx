'use client';

import Link from 'next/link';
import { ArrowUpRight, Heart, MapPin, Package, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { ProfileCard } from '@/components/profile/profile-card';

const shortcuts = [
  { href: '/orders', icon: Package, eyebrow: 'Purchases', title: 'Track your orders', copy: 'Delivery updates, invoices and returns.' },
  { href: '/wishlist', icon: Heart, eyebrow: 'Your edit', title: 'Saved pieces', copy: 'Everything you marked for later.' },
  { href: '/profile/addresses', icon: MapPin, eyebrow: 'Delivery', title: 'Address book', copy: 'Manage destinations and defaults.' },
];

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  return (
    <div className="account-overview">
      <div className="account-page-heading">
        <div><p className="account-kicker">OVERVIEW</p><h2>Welcome back, {user.firstName ?? user.fullName?.split(' ')[0] ?? 'friend'}.</h2></div>
        <span className="verified-pill"><ShieldCheck size={15} /> {user.emailVerified ? 'Verified account' : 'Account active'}</span>
      </div>
      <ProfileCard user={user} />
      <div className="account-shortcuts">
        {shortcuts.map(({ href, icon: Icon, eyebrow, title, copy }) => (
          <Link href={href} key={href} className="account-shortcut">
            <div className="shortcut-top"><Icon size={20} /><ArrowUpRight size={17} /></div>
            <p>{eyebrow}</p><h3>{title}</h3><span>{copy}</span>
          </Link>
        ))}
      </div>
      <aside className="account-note"><span>THE NOVA STANDARD</span><p>Every purchase includes tracked delivery, considered packaging and a 30-day return window.</p></aside>
    </div>
  );
}

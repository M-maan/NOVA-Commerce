'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Boxes, ClipboardList, LayoutDashboard, MessageSquareText, PackageSearch, Percent, RotateCcw, UsersRound } from 'lucide-react';

const navigation = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/products', label: 'Catalog', icon: Boxes },
  { href: '/admin/customers', label: 'Customers', icon: UsersRound },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/promotions', label: 'Promotions', icon: Percent },
  { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { href: '/admin/reviews', label: 'Reviews', icon: MessageSquareText },
  { href: '/admin/reports', label: 'Reports', icon: PackageSearch },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin/dashboard" className="admin-brand"><span>N</span><div>NOVA<small>OPERATIONS</small></div></Link>
        <nav aria-label="Admin navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return <Link href={href} key={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon size={18} /><span>{label}</span></Link>;
          })}
        </nav>
        <Link href="/" className="admin-store-link">← Back to storefront</Link>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar"><div><span className="admin-live-dot" />System operational</div><p>Commerce control center</p></header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}

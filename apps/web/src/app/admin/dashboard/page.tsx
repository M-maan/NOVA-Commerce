'use client';

import Link from 'next/link';
import { ArrowRight, Box, CircleDollarSign, PackageCheck, ShoppingBag, TrendingUp, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

type Dashboard = { revenue: string | number; orders: number; averageOrderValue: string | number; customers: number; lowStockProducts: number; bestSellingProducts: Array<{ productId: string; _sum: { quantity: number | null; lineTotal: string | number | null } }>; recentActivities: Array<{ id: string; orderNumber: string; status: string; grandTotal: string | number; createdAt: string; user: { email: string } }> };

export default function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard>();
  const [error, setError] = useState('');
  useEffect(() => { api.get<Dashboard>('/admin/dashboard').then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load dashboard.')); }, []);
  const money = (value: string | number | undefined) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value ?? 0));

  const metrics = data ? [
    { label: 'Net revenue', value: money(data.revenue), note: 'Across confirmed sales', icon: CircleDollarSign, tone: 'lime' },
    { label: 'Total orders', value: data.orders, note: 'All order statuses', icon: ShoppingBag, tone: 'neutral' },
    { label: 'Average order', value: money(data.averageOrderValue), note: 'Per completed checkout', icon: TrendingUp, tone: 'neutral' },
    { label: 'Customers', value: data.customers, note: 'Registered accounts', icon: UsersRound, tone: 'clay' },
  ] : [];

  return (
    <main className="admin-dashboard-page">
      <div className="admin-page-heading"><div><p>BUSINESS OVERVIEW</p><h1>Good evening.</h1><span>Here is what is happening across NOVA today.</span></div><Link href="/admin/reports" className="admin-primary-action">Create report <ArrowRight size={16} /></Link></div>
      {error ? <div role="alert" className="admin-error">{error}<button type="button" onClick={() => location.reload()}>Retry</button></div> : null}
      {!data ? <div className="admin-metric-grid" aria-label="Loading dashboard">{[1,2,3,4].map((item) => <div className="admin-metric-skeleton" key={item} />)}</div> : <>
        <section className="admin-metric-grid" aria-label="Key business metrics">{metrics.map(({ label, value, note, icon: Icon, tone }) => <article className={`admin-metric admin-metric-${tone}`} key={label}><div><p>{label}</p><Icon size={19} /></div><strong>{value}</strong><span>{note}</span></article>)}</section>
        <div className="admin-dashboard-grid">
          <section className="admin-panel recent-panel"><div className="admin-panel-heading"><div><p>OPERATIONS</p><h2>Recent orders</h2></div><Link href="/admin/orders">View all <ArrowRight size={14} /></Link></div><div className="admin-order-list">{data.recentActivities.length ? data.recentActivities.slice(0, 5).map((item) => <Link href={`/admin/orders/${item.id}`} key={item.id}><span className="order-mark"><PackageCheck size={17} /></span><div><strong>{item.orderNumber}</strong><p>{item.user.email}</p></div><span className="order-status">{item.status.replaceAll('_', ' ')}</span><b>{money(item.grandTotal)}</b></Link>) : <div className="admin-empty"><PackageCheck size={25} /><p>No orders yet</p><span>New checkouts will appear here.</span></div>}</div></section>
          <aside className="admin-panel inventory-panel"><div className="admin-panel-heading"><div><p>INVENTORY</p><h2>Stock attention</h2></div><Box size={20} /></div><div className="inventory-number"><strong>{data.lowStockProducts}</strong><span>variants need attention</span></div><div className="inventory-track"><span style={{ width: `${Math.min(100, data.lowStockProducts * 12)}%` }} /></div><p>{data.lowStockProducts ? 'Review low-stock products before the next campaign.' : 'Inventory levels look healthy across the catalog.'}</p><Link href="/admin/products">Review catalog <ArrowRight size={15} /></Link></aside>
          <section className="admin-panel admin-quick-actions"><div className="admin-panel-heading"><div><p>SHORTCUTS</p><h2>Move quickly</h2></div></div><div><Link href="/admin/orders"><ShoppingBag size={18} /><span><strong>Manage orders</strong><small>Review fulfillment queue</small></span><ArrowRight size={15} /></Link><Link href="/admin/customers"><UsersRound size={18} /><span><strong>Customer directory</strong><small>Profiles and history</small></span><ArrowRight size={15} /></Link><Link href="/admin/analytics"><TrendingUp size={18} /><span><strong>Open analytics</strong><small>Trends and performance</small></span><ArrowRight size={15} /></Link></div></section>
        </div>
      </>}
    </main>
  );
}

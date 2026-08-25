'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ordersApi, type Order } from '@/lib/api/orders.api';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { ordersApi.list().then(setOrders).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load orders.')).finally(() => setLoading(false)); }, []);
  return <main className="mx-auto max-w-5xl space-y-6 p-6">
    <div><h1 className="text-3xl font-bold">My orders</h1><p className="mt-2 text-muted-foreground">Track purchases, delivery and returns.</p></div>
    {loading && <p className="rounded border p-4">Loading orders…</p>}
    {error && <p role="alert" className="rounded border border-red-400 p-4 text-red-500">{error}</p>}
    {!loading && !orders.length && !error && <p className="rounded border p-6 text-muted-foreground">You have no orders yet.</p>}
    <div className="grid gap-4">{orders.map((order) => <Link key={order.id} href={`/orders/${order.id}`} className="rounded-lg border p-5 transition hover:border-primary">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">{order.orderNumber}</h2><span className="rounded-full bg-muted px-3 py-1 text-sm">{order.status}</span></div>
      <p className="mt-2 text-sm text-muted-foreground">{new Date(order.placedAt).toLocaleString()} · {order.items.length} item(s)</p>
      <p className="mt-3 text-lg font-bold">{order.currency} {order.grandTotal}</p>
    </Link>)}</div>
  </main>;
}

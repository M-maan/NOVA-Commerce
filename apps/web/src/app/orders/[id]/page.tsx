'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ordersApi, type Order } from '@/lib/api/orders.api';

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { ordersApi.get(params.id).then(setOrder).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load order.')); }, [params.id]);
  if (error) return <main className="mx-auto max-w-4xl p-6"><p role="alert" className="rounded border border-red-400 p-4 text-red-500">{error}</p></main>;
  if (!order) return <main className="mx-auto max-w-4xl p-6"><p className="rounded border p-4">Loading order…</p></main>;
  return <main className="mx-auto max-w-4xl space-y-6 p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/orders" className="text-sm underline">← My orders</Link><h1 className="mt-2 text-3xl font-bold">{order.orderNumber}</h1><p className="text-muted-foreground">{new Date(order.placedAt).toLocaleString()}</p></div><span className="rounded-full bg-muted px-4 py-2">{order.status}</span></div>
    <section className="rounded-lg border p-5"><h2 className="text-xl font-semibold">Items</h2><div className="mt-4 divide-y">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-3"><div><p className="font-medium">{item.productNameSnapshot}</p><p className="text-sm text-muted-foreground">{item.variantNameSnapshot ?? item.skuSnapshot ?? ''} × {item.quantity}</p></div><p>{order.currency} {item.lineTotal}</p></div>)}</div><div className="mt-4 border-t pt-4 text-right font-bold">Total: {order.currency} {order.grandTotal}</div></section>
    <section className="rounded-lg border p-5"><h2 className="text-xl font-semibold">Order timeline</h2><ol className="mt-4 space-y-3">{order.statusHistory.map((event, index) => <li key={`${event.createdAt}-${index}`} className="border-l-2 pl-4"><p className="font-medium">{event.newStatus}</p><p className="text-sm text-muted-foreground">{event.reason ?? 'Status updated'} · {new Date(event.createdAt).toLocaleString()}</p></li>)}</ol></section>
    {order.shipments.length > 0 && <section className="rounded-lg border p-5"><h2 className="text-xl font-semibold">Shipment tracking</h2>{order.shipments.map((shipment, index) => <div key={index} className="mt-3"><p>{shipment.carrier} · {shipment.status}</p>{shipment.trackingNumber && <p className="text-sm">Tracking: {shipment.trackingNumber}</p>}{shipment.trackingUrl && <a className="text-sm underline" href={shipment.trackingUrl} target="_blank" rel="noreferrer">Open tracking</a>}</div>)}</section>}
    <div className="flex flex-wrap gap-3"><Link className="rounded border px-4 py-2" href={`/orders/${order.id}/invoice`}>Invoice</Link>{['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status) && <Link className="rounded border px-4 py-2" href={`/orders/${order.id}/cancel`}>Cancel order</Link>}{order.status === 'DELIVERED' && <Link className="rounded border px-4 py-2" href={`/orders/${order.id}/return`}>Request return</Link>}</div>
  </main>;
}

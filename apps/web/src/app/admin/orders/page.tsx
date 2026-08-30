'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import type { Order } from '@/lib/api/orders.api';

const orderStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'] as const;
type AdminOrder = Order & { email: string; fulfillmentStatus: string };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set('q', query.trim());
    if (status) next.set('status', status);
    return next.toString();
  }, [query, status]);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError('');
    try {
      setOrders(await api.get<AdminOrder[]>(`/admin/orders?${params}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load admin orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.get<AdminOrder[]>(`/admin/orders?${params}`)
      .then((response) => {
        if (active) setOrders(response);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load admin orders.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params]);

  function exportCsv() {
    const csv = [['order', 'status', 'payment', 'fulfillment', 'email', 'currency', 'total'], ...orders.map((order) => [
      order.orderNumber,
      order.status,
      order.paymentStatus,
      order.fulfillmentStatus,
      order.email,
      order.currency,
      order.grandTotal,
    ])].map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nova-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Operations</p>
          <h1 className="text-3xl font-bold">Admin orders</h1>
          <p className="mt-2 text-muted-foreground">Search, filter, inspect timelines, and export order operations data.</p>
        </div>
        <button onClick={exportCsv} disabled={!orders.length} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Export CSV</button>
      </div>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_240px_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order number or customer email" className="rounded-md border bg-background px-3 py-2" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border bg-background px-3 py-2">
          <option value="">All statuses</option>
          {orderStatuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button onClick={() => void load()} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Refresh</button>
      </section>

      {error && <p role="alert" className="rounded border border-red-400 p-3 text-red-500">{error}</p>}
      {loading ? <p className="rounded-md border p-6 text-muted-foreground">Loading orders...</p> : null}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Status</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Fulfillment</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3"><Link className="underline" href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                  <td className="p-3">{order.email}</td>
                  <td className="p-3">{order.status}</td>
                  <td className="p-3">{order.paymentStatus}</td>
                  <td className="p-3">{order.fulfillmentStatus}</td>
                  <td className="p-3">{order.currency} {Number(order.grandTotal).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!orders.length && <p className="p-8 text-center text-muted-foreground">No orders match the current filters.</p>}
        </div>
      )}
    </main>
  );
}

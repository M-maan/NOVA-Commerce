'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';

type ReportType = 'sales' | 'orders' | 'products' | 'customers' | 'inventory';
type ReportRow = Record<string, unknown>;

const reportTypes: Array<{ value: ReportType; label: string }> = [
  { value: 'sales', label: 'Sales report' },
  { value: 'orders', label: 'Order report' },
  { value: 'products', label: 'Product report' },
  { value: 'customers', label: 'Customer report' },
  { value: 'inventory', label: 'Inventory report' },
];

const columns: Record<ReportType, string[]> = {
  sales: ['date', 'orders', 'revenue', 'discounts', 'tax', 'shipping'],
  orders: ['orderNumber', 'status', 'paymentStatus', 'fulfillmentStatus', 'email', 'grandTotal', 'createdAt'],
  products: ['productNameSnapshot', 'productId', 'quantity', 'revenue'],
  customers: ['name', 'email', 'orders', 'lifetimeValue', 'createdAt'],
  inventory: ['product', 'variant', 'sku', 'warehouse', 'quantityAvailable', 'quantityReserved'],
};

function normalizeRow(type: ReportType, row: ReportRow) {
  if (type === 'products') {
    const sum = row._sum as { quantity?: number; lineTotal?: string | number } | undefined;
    return { ...row, quantity: sum?.quantity ?? 0, revenue: sum?.lineTotal ?? 0 };
  }
  if (type === 'inventory') {
    const variant = row.variant as { sku?: string; name?: string; product?: { name?: string } } | undefined;
    const warehouse = row.warehouse as { name?: string } | undefined;
    return { ...row, product: variant?.product?.name ?? '', variant: variant?.name ?? '', sku: variant?.sku ?? '', warehouse: warehouse?.name ?? '' };
  }
  return row;
}

function display(value: unknown) {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  return String(value);
}

export default function ReportsPage() {
  const [type, setType] = useState<ReportType>('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const response = await api.get<ReportRow[]>(`/admin/reports?${params.toString()}`);
      setRows(response.map((row) => normalizeRow(type, row)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to generate report.');
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const activeColumns = columns[type];
    const csv = [activeColumns, ...rows.map((row) => activeColumns.map((column) => display(row[column])))]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `nova-${type}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Reporting</p>
          <h1 className="text-3xl font-bold">Business reports</h1>
          <p className="mt-2 text-muted-foreground">Generate operational reports with date filters and CSV exports.</p>
        </div>
        <button onClick={exportCsv} disabled={!rows.length} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">Export CSV</button>
      </div>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-[240px_180px_180px_auto]">
        <select value={type} onChange={(event) => setType(event.target.value as ReportType)} className="rounded-md border bg-background px-3 py-2">
          {reportTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-md border bg-background px-3 py-2" />
        <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-md border bg-background px-3 py-2" />
        <button onClick={load} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Generate report</button>
      </section>

      {error && <p role="alert" className="rounded border border-red-300 p-3 text-red-600">{error}</p>}
      {loading ? <p className="rounded-md border p-6 text-muted-foreground">Generating report...</p> : null}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted">
              <tr>{columns[type].map((column) => <th className="p-3" key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr className="border-t" key={index}>
                  {columns[type].map((column) => <td className="p-3" key={column}>{display(row[column])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="p-8 text-center text-muted-foreground">Choose a report and generate it to view results.</p>}
        </div>
      )}
    </main>
  );
}

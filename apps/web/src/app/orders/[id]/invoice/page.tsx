'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ordersApi } from '@/lib/api/orders.api';
export default function InvoicePage() { const params = useParams<{ id: string }>(); const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null); const [error, setError] = useState(''); useEffect(() => { ordersApi.invoice(params.id).then(setInvoice).catch((e) => setError(e instanceof Error ? e.message : 'Unable to load invoice.')); }, [params.id]); return <main className="mx-auto max-w-3xl space-y-5 p-6"><Link href={`/orders/${params.id}`} className="text-sm underline">← Back to order</Link><h1 className="text-3xl font-bold">Invoice</h1>{error && <p role="alert" className="rounded border border-red-400 p-3 text-red-500">{error}</p>}<pre className="overflow-auto rounded-lg border bg-muted p-5 text-sm">{invoice ? JSON.stringify(invoice, null, 2) : 'Loading invoice…'}</pre><button onClick={() => window.print()} className="rounded border px-4 py-2">Print invoice</button></main>; }

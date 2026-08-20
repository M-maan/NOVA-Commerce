'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { checkoutApi } from '@/lib/api/checkout.api';
import { shippingApi, type ShippingMethod } from '@/lib/api/shipping.api';

function ShippingContent() {
  const params = useSearchParams();
  const sessionId = params.get('session') ?? '';
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [selected, setSelected] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    shippingApi.list().then(setMethods).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!sessionId) return setError('Checkout session is missing.');
    if (!selected) return setError('Select a shipping method.');
    setSaving(true);
    setError('');
    try {
      await checkoutApi.shipping({ sessionId, shippingMethodId: selected });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Shipping</h1>
      {error && <p className="my-4 text-red-500">{error}</p>}
      {loading ? <p className="my-8">Loading shipping methods…</p> : (
        <div className="my-8 space-y-3">
          {methods.map((method) => (
            <label className="flex cursor-pointer justify-between rounded border p-4" key={method.id}>
              <span><input type="radio" name="shipping" checked={selected === method.id} onChange={() => { setSelected(method.id); setSaved(false); }} /> <b className="ml-2">{method.name}</b><small className="ml-2 text-muted-foreground">{method.estimatedDays} days</small></span>
              <span>{Number(method.price).toFixed(2)} USD</span>
            </label>
          ))}
        </div>
      )}
      <button disabled={loading || saving} onClick={save} className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">{saving ? 'Saving…' : saved ? 'Saved' : 'Save shipping'}</button>
      {saved && <Link className="ml-4 underline" href={`/checkout/payment?session=${sessionId}`}>Continue to payment</Link>}
    </main>
  );
}

export default function ShippingPage() { return <Suspense fallback={<main className="p-8">Loading shipping…</main>}><ShippingContent /></Suspense>; }

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Clock3, PackageCheck, Truck } from 'lucide-react';
import { checkoutApi, type CheckoutSession } from '@/lib/api/checkout.api';
import { shippingApi, type ShippingMethod } from '@/lib/api/shipping.api';
import { CheckoutShell, MoneySummary } from '@/components/checkout/checkout-shell';

function ShippingContent() {
  const router = useRouter();
  const sessionId = useSearchParams().get('session') ?? '';
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([shippingApi.list(), checkoutApi.get(sessionId)])
      .then(([nextMethods, nextSession]) => { setMethods(nextMethods); setSession(nextSession); setSelected(nextSession.shippingMethodId ?? ''); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Shipping methods could not be loaded.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  async function save() {
    if (!selected) return setError('Select a delivery method.');
    setSaving(true);
    setError('');
    try {
      await checkoutApi.shipping({ sessionId, shippingMethodId: selected });
      router.push(`/checkout/review?session=${sessionId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Delivery method could not be saved.');
      setSaving(false);
    }
  }

  const summary = session ? <MoneySummary subtotal={Number(session.subtotal)} discount={Number(session.discountTotal)} shipping={Number(session.shippingTotal)} tax={Number(session.taxTotal)} total={Number(session.grandTotal)} currency={session.currency} /> : null;
  return <CheckoutShell step={2} title="Choose your delivery." eyebrow="SHIPPING METHOD" aside={summary}>
    {loading && sessionId ? <div className="checkout-loading"><span />Finding delivery options…</div> : null}
    {!sessionId || error ? <div role="alert" className="checkout-error">{!sessionId ? 'Checkout session is missing.' : error}</div> : null}
    {!loading ? <><div className="checkout-card-heading"><div><p>Step 2 of 4</p><h2>Delivery options</h2></div><Truck size={22} /></div>
      {methods.length ? <div className="shipping-choice-grid">{methods.map((method) => <label key={method.id} className={selected === method.id ? 'selected' : ''}><input type="radio" name="shipping" checked={selected === method.id} onChange={() => setSelected(method.id)} /><span className="shipping-icon">{method.estimatedDays <= 2 ? <PackageCheck size={19} /> : <Truck size={19} />}</span><span className="shipping-copy"><strong>{method.name}</strong><small>{method.description ?? 'Tracked delivery to your selected address.'}</small><small><Clock3 size={13} /> Estimated {method.estimatedDays} business days</small></span><b>{Number(method.price) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: session?.currency ?? 'USD' }).format(Number(method.price)) : 'Free'}</b></label>)}</div> : <div className="checkout-empty compact"><h2>No delivery methods available.</h2><p>Store delivery configuration needs attention before checkout can continue.</p></div>}
      <button type="button" className="checkout-primary" disabled={!selected || saving} onClick={() => void save()}>{saving ? 'Saving delivery…' : <>Review your order <ArrowRight size={16} /></>}</button>
    </> : null}
  </CheckoutShell>;
}

export default function ShippingPage() { return <Suspense fallback={<main className="checkout-page"><div className="checkout-loading"><span />Loading shipping…</div></main>}><ShippingContent /></Suspense>; }

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, BadgeCheck, Tag } from 'lucide-react';
import { checkoutApi, type CheckoutSession } from '@/lib/api/checkout.api';
import { CheckoutShell, MoneySummary } from '@/components/checkout/checkout-shell';

function ReviewContent() {
  const router = useRouter();
  const sessionId = useSearchParams().get('session') ?? '';
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    checkoutApi.get(sessionId).then(setSession).catch((cause) => setError(cause instanceof Error ? cause.message : 'Checkout could not be loaded.'));
  }, [sessionId]);

  async function applyCoupon() {
    setSaving(true);
    setError('');
    try { setSession(await checkoutApi.coupon({ sessionId, code })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Coupon could not be applied.'); }
    finally { setSaving(false); }
  }

  const summary = session ? <MoneySummary subtotal={Number(session.subtotal)} discount={Number(session.discountTotal)} shipping={Number(session.shippingTotal)} tax={Number(session.taxTotal)} total={Number(session.grandTotal)} currency={session.currency} /> : null;
  return <CheckoutShell step={3} title="One final look." eyebrow="ORDER REVIEW" aside={summary}>
    {!session && !error ? <div className="checkout-loading"><span />Calculating final totals…</div> : null}
    {!sessionId || error ? <div role="alert" className="checkout-error">{!sessionId ? 'Checkout session is missing.' : error}{error ? <button type="button" onClick={() => setError('')}>Dismiss</button> : null}</div> : null}
    {session ? <><div className="checkout-card-heading"><div><p>Step 3 of 4</p><h2>Review and confirm</h2></div><BadgeCheck size={22} /></div>
      <div className="review-delivery"><span>Delivering via</span><strong>{session.shippingMethod?.name ?? 'Selected delivery'}</strong><small>{session.shippingMethod?.estimatedDays ? `${session.shippingMethod.estimatedDays} business days` : 'Tracked service'}</small></div>
      <div className="coupon-panel"><label htmlFor="coupon"><Tag size={16} /> Promotion code</label><div><input id="coupon" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Enter code" /><button type="button" disabled={!code.trim() || saving} onClick={() => void applyCoupon()}>{saving ? 'Applying…' : 'Apply'}</button></div></div>
      <div className="payment-assurance"><span>✓ Final amount locked server-side</span><span>✓ Inventory reserved for 30 minutes</span><span>✓ Secure Stripe payment next</span></div>
      <button type="button" className="checkout-primary" onClick={() => router.push(`/checkout/payment?session=${session.id}`)}>Continue to secure payment <ArrowRight size={16} /></button>
    </> : null}
  </CheckoutShell>;
}

export default function ReviewPage() { return <Suspense fallback={<main className="checkout-page"><div className="checkout-loading"><span />Loading review…</div></main>}><ReviewContent /></Suspense>; }

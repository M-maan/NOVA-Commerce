'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { ArrowRight, CreditCard, LockKeyhole } from 'lucide-react';
import { checkoutApi, type CheckoutSession } from '@/lib/api/checkout.api';
import { paymentsApi, type PaymentIntentResponse } from '@/lib/api/payments.api';
import { CheckoutShell, MoneySummary } from '@/components/checkout/checkout-shell';

function PaymentForm({ sessionId, paymentId }: { sessionId: string; paymentId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError('');
    const returnUrl = `${window.location.origin}/checkout/success?session=${encodeURIComponent(sessionId)}&payment=${encodeURIComponent(paymentId)}`;
    const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl }, redirect: 'if_required' });
    if (result.error) {
      setError(result.error.message ?? 'Your payment could not be completed. Check the details and try again.');
      setBusy(false);
      return;
    }
    router.push(`/checkout/success?session=${encodeURIComponent(sessionId)}&payment=${encodeURIComponent(paymentId)}`);
  }

  return <form onSubmit={submit} className="stripe-payment-form"><PaymentElement options={{ layout: 'tabs' }} /><button type="submit" className="checkout-primary" disabled={busy || !stripe || !elements}>{busy ? 'Confirming securely…' : <>Pay securely <LockKeyhole size={16} /></>}</button>{error ? <div role="alert" className="checkout-error">{error}</div> : null}<p className="stripe-legal">Payments are encrypted and processed by Stripe. NOVA never stores your card number.</p></form>;
}

function PaymentContent() {
  const sessionId = useSearchParams().get('session') ?? '';
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const publishableKey = intent?.publishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
  const stripePromise = useMemo(() => publishableKey ? loadStripe(publishableKey) : null, [publishableKey]);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([checkoutApi.get(sessionId), paymentsApi.createIntent(sessionId)])
      .then(([nextSession, nextIntent]) => { setSession(nextSession); setIntent(nextIntent); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Secure payment could not be prepared.'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const summary = session ? <MoneySummary subtotal={Number(session.subtotal)} discount={Number(session.discountTotal)} shipping={Number(session.shippingTotal)} tax={Number(session.taxTotal)} total={Number(session.grandTotal)} currency={session.currency} /> : null;
  return <CheckoutShell step={4} title="Complete your order." eyebrow="SECURE PAYMENT" aside={summary}>
    {loading && sessionId ? <div className="checkout-loading"><span />Opening Stripe’s secure payment form…</div> : null}
    {!sessionId || error ? <div role="alert" className="checkout-error">{!sessionId ? 'Checkout session is missing.' : error}<button type="button" onClick={() => location.reload()}>Try again</button></div> : null}
    {!loading && intent?.clientSecret && stripePromise ? <><div className="checkout-card-heading"><div><p>Step 4 of 4</p><h2>Payment details</h2></div><CreditCard size={22} /></div><Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#171b1a', colorText: '#171b1a', colorBackground: '#f7f5ef', borderRadius: '2px', fontFamily: 'Arial, sans-serif' } } }}><PaymentForm sessionId={sessionId} paymentId={intent.payment.id} /></Elements></> : null}
    {!loading && !error && (!intent?.clientSecret || !stripePromise) ? <div className="checkout-empty compact"><h2>Stripe configuration is incomplete.</h2><p>Add matching secret and publishable keys, then retry.</p><button type="button" onClick={() => location.reload()}>Retry setup <ArrowRight size={15} /></button></div> : null}
  </CheckoutShell>;
}

export default function PaymentPage() { return <Suspense fallback={<main className="checkout-page"><div className="checkout-loading"><span />Loading secure payment…</div></main>}><PaymentContent /></Suspense>; }

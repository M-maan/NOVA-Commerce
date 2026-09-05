'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Clock3, PackageCheck, ShieldCheck } from 'lucide-react';
import { paymentsApi, type Payment } from '@/lib/api/payments.api';

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get('session') ?? '';
  const paymentId = params.get('payment') ?? '';
  const [payment, setPayment] = useState<Payment | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  const verify = useCallback(async () => {
    if (!paymentId && !sessionId) { setError('Payment reference is missing.'); setChecking(false); return; }
    setChecking(true);
    setError('');
    try { setPayment(paymentId ? await paymentsApi.status(paymentId) : await paymentsApi.checkoutStatus(sessionId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Payment status could not be verified.'); }
    finally { setChecking(false); }
  }, [paymentId, sessionId]);

  useEffect(() => { const timer = window.setTimeout(() => void verify(), 0); return () => window.clearTimeout(timer); }, [verify]);
  useEffect(() => {
    if (!payment || !['PENDING', 'PROCESSING', 'REQUIRES_ACTION'].includes(payment.status)) return;
    const timer = window.setTimeout(() => void verify(), 2500);
    return () => window.clearTimeout(timer);
  }, [payment, verify]);

  const succeeded = payment?.status === 'SUCCEEDED';
  const failed = payment && ['FAILED', 'CANCELLED'].includes(payment.status);
  return <main className="payment-result-page"><section className={`payment-result-card ${succeeded ? 'success' : failed ? 'failed' : 'pending'}`}>
    <div className="result-mark">{succeeded ? <Check size={34} /> : failed ? <span>!</span> : <Clock3 size={32} />}</div>
    <p className="overline"><span />{succeeded ? 'PAYMENT VERIFIED' : failed ? 'PAYMENT NEEDS ATTENTION' : 'VERIFYING WITH STRIPE'}</p>
    <h1>{succeeded ? <>Your order is<br /><em>confirmed.</em></> : failed ? <>Payment was not<br /><em>completed.</em></> : <>Almost there.<br /><em>Verifying payment.</em></>}</h1>
    <p className="result-copy">{succeeded ? `Thank you. ${payment.order?.orderNumber ? `Order ${payment.order.orderNumber} is confirmed` : 'Your order is confirmed'} and ready for fulfilment.` : failed ? payment.failureReason ?? 'Your bag is safe. Return to payment and try another method.' : 'Stripe is confirming the payment securely. This usually takes only a few seconds.'}</p>
    {error ? <div role="alert" className="checkout-error">{error}</div> : null}
    {succeeded ? <div className="result-details"><div><PackageCheck size={18} /><span><strong>Order created</strong>{payment.order?.orderNumber ?? 'Confirmation recorded'}</span></div><div><ShieldCheck size={18} /><span><strong>Payment protected</strong>Verified server-side</span></div></div> : null}
    <div className="result-actions">{succeeded && payment.order?.id ? <Link className="checkout-primary" href={`/orders/${payment.order.id}`}>View your order <ArrowRight size={16} /></Link> : failed ? <Link className="checkout-primary" href={`/checkout/payment?session=${sessionId}`}>Try payment again <ArrowRight size={16} /></Link> : <button type="button" className="checkout-primary" disabled={checking} onClick={() => void verify()}>{checking ? 'Checking…' : 'Check status again'} <ArrowRight size={16} /></button>}<Link href="/products">Continue shopping</Link></div>
  </section></main>;
}

export default function SuccessPage() { return <Suspense fallback={<main className="payment-result-page"><div className="checkout-loading"><span />Verifying payment…</div></main>}><SuccessContent /></Suspense>; }

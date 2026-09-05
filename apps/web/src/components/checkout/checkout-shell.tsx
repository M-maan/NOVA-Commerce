import Link from 'next/link';
import { Check, LockKeyhole } from 'lucide-react';

const steps = ['Address', 'Shipping', 'Review', 'Payment'];

export function CheckoutShell({ step, title, eyebrow, children, aside }: { step: number; title: string; eyebrow?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <main className="checkout-page">
      <header className="checkout-heading">
        <div><p className="overline"><span />{eyebrow ?? 'SECURE CHECKOUT'}</p><h1>{title}</h1></div>
        <div className="checkout-security"><LockKeyhole size={16} /><span><strong>Protected by Stripe</strong>Card data never touches NOVA servers</span></div>
      </header>
      <nav className="checkout-progress" aria-label="Checkout progress">
        {steps.map((label, index) => {
          const number = index + 1;
          return <div key={label} className={number === step ? 'active' : number < step ? 'complete' : ''}><span>{number < step ? <Check size={13} /> : number}</span><p>{label}</p></div>;
        })}
      </nav>
      <div className={`checkout-layout ${aside ? '' : 'checkout-layout-single'}`}><section className="checkout-card">{children}</section>{aside ? <aside className="checkout-summary">{aside}</aside> : null}</div>
      <Link href="/cart" className="checkout-back-link">← Return to bag</Link>
    </main>
  );
}

export function MoneySummary({ subtotal, discount, shipping, tax, total, currency }: { subtotal: number; discount?: number; shipping?: number; tax?: number; total: number; currency: string }) {
  const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  return <><p className="overline"><span />ORDER SUMMARY</p><dl><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>{discount ? <div className="summary-discount"><dt>Discount</dt><dd>−{money(discount)}</dd></div> : null}<div><dt>Delivery</dt><dd>{shipping ? money(shipping) : 'Select next'}</dd></div>{tax !== undefined ? <div><dt>Tax</dt><dd>{money(tax)}</dd></div> : null}<div className="summary-total"><dt>Total</dt><dd>{money(total)}</dd></div></dl><p className="summary-note">Final totals are calculated server-side before payment.</p></>;
}

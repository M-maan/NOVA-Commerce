import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FailedPage() {
  return <main className="payment-result-page"><section className="payment-result-card failed"><div className="result-mark"><span>!</span></div><p className="overline"><span />PAYMENT NEEDS ATTENTION</p><h1>Nothing was charged.<br /><em>Your bag is safe.</em></h1><p className="result-copy">Review the payment details or use a different method. Your items remain in the bag until the reservation expires.</p><div className="result-actions"><Link className="checkout-primary" href="/checkout">Return to checkout <ArrowRight size={16} /></Link><Link href="/cart">View bag</Link></div></section></main>;
}

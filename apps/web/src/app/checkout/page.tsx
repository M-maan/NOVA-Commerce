'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, MapPin } from 'lucide-react';
import { cartApi } from '@/lib/api/cart.api';
import { checkoutApi } from '@/lib/api/checkout.api';
import { userApi } from '@/lib/api/user.api';
import { CheckoutShell, MoneySummary } from '@/components/checkout/checkout-shell';
import type { Address } from '@/types/auth';

type Cart = { id: string; currency: string; subtotal: number; estimatedTotal: number; items: Array<{ id: string; quantity: number; lineTotal: number; product: { name: string } }> };

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([cartApi.get() as Promise<Cart>, userApi.addresses()])
      .then(([nextCart, nextAddresses]) => {
        setCart(nextCart);
        setAddresses(nextAddresses);
        setSelected(nextAddresses.find((item) => item.isDefault)?.id ?? nextAddresses[0]?.id ?? '');
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Checkout could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  async function continueCheckout() {
    if (!cart?.id || !selected) return setError('Choose a delivery address before continuing.');
    setSaving(true);
    setError('');
    try {
      const session = await checkoutApi.create({ cartId: cart.id, shippingAddressId: selected });
      window.location.assign(`/checkout/shipping?session=${session.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Checkout session could not be created.');
      setSaving(false);
    }
  }

  const summary = cart ? <MoneySummary subtotal={Number(cart.subtotal)} total={Number(cart.estimatedTotal)} currency={cart.currency} /> : null;
  return <CheckoutShell step={1} title="Where should it arrive?" eyebrow="DELIVERY DETAILS" aside={summary}>
    {loading ? <div className="checkout-loading"><span />Loading your saved details…</div> : null}
    {error ? <div role="alert" className="checkout-error">{error}<button type="button" onClick={() => location.reload()}>Try again</button></div> : null}
    {!loading && !cart?.items.length ? <div className="checkout-empty"><h2>Your bag is empty.</h2><p>Add a considered piece before starting checkout.</p><Link href="/products">Browse the edit <ArrowRight size={15} /></Link></div> : null}
    {!loading && cart?.items.length ? <>
      <div className="checkout-card-heading"><div><p>Step 1 of 4</p><h2>Choose an address</h2></div><MapPin size={22} /></div>
      {addresses.length ? <div className="address-choice-grid">{addresses.map((address) => <label key={address.id} className={selected === address.id ? 'selected' : ''}><input type="radio" name="address" checked={selected === address.id} onChange={() => setSelected(address.id)} /><span><strong>{address.title || 'Delivery address'}</strong><small>{address.fullName}</small><small>{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}</small><small>{address.city}, {address.province} · {address.country}</small></span></label>)}</div> : <div className="checkout-empty compact"><h2>No delivery address yet.</h2><p>Add a complete address to your profile, then return here.</p><Link href="/profile/addresses">Add an address <ArrowRight size={15} /></Link></div>}
      <button type="button" className="checkout-primary" disabled={!selected || saving} onClick={() => void continueCheckout()}>{saving ? 'Preparing checkout…' : <>Continue to shipping <ArrowRight size={16} /></>}</button>
    </> : null}
  </CheckoutShell>;
}

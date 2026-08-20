'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cartApi } from '@/lib/api/cart.api';
import { checkoutApi, type CheckoutSession } from '@/lib/api/checkout.api';
import { userApi } from '@/lib/api/user.api';

export default function CheckoutPage() {
  const [cart, setCart] = useState<any>(null); const [addresses, setAddresses] = useState<any[]>([]); const [session, setSession] = useState<CheckoutSession | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([cartApi.get(), userApi.addresses()]).then(([c, a]) => { setCart(c); setAddresses(a); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  async function start() { if (!cart?.id || !addresses[0]) return setError('Add a delivery address before checkout.'); try { setSession(await checkoutApi.create({ cartId: cart.id, shippingAddressId: addresses[0].id })); } catch (e) { setError((e as Error).message); } }
  if (loading) return <main className="mx-auto max-w-3xl p-8"><p>Loading checkout…</p></main>;
  return <main className="mx-auto max-w-3xl p-8"><div className="mb-8 flex justify-between"><h1 className="text-3xl font-bold">Checkout</h1><span className="text-sm text-muted-foreground">1 Cart · 2 Address · 3 Shipping · 4 Payment</span></div>{error && <p className="mb-4 rounded border border-red-400 p-3 text-red-500">{error}</p>}{!cart?.items?.length ? <p>Your cart is empty. <Link className="underline" href="/products">Browse products</Link></p> : session ? <div className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Checkout session ready</h2><p>Status: {session.status}</p><p>Subtotal: {Number(session.subtotal).toFixed(2)} {session.currency}</p><p>Tax: {Number(session.taxTotal).toFixed(2)} {session.currency}</p><p className="font-bold">Total: {Number(session.grandTotal).toFixed(2)} {session.currency}</p><Link className="inline-block rounded bg-primary px-4 py-2 text-primary-foreground" href={`/checkout/shipping?session=${session.id}`}>Continue to shipping</Link></div> : <div className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-semibold">Review your cart</h2>{cart.items.map((item: any) => <div className="flex justify-between" key={item.id}><span>{item.product.name} × {item.quantity}</span><span>{Number(item.lineTotal).toFixed(2)} {cart.currency}</span></div>)}<p className="border-t pt-4 text-right font-bold">Subtotal: {Number(cart.subtotal).toFixed(2)} {cart.currency}</p><button onClick={start} className="w-full rounded bg-primary px-4 py-3 text-primary-foreground">Create checkout session</button></div>}</main>;
}

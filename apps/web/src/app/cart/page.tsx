'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, ImageIcon, LockKeyhole, PackageOpen, Trash2, Truck } from 'lucide-react';
import { cartApi } from '@/lib/api/cart.api';
import { QuantitySelector } from '@/components/cart/quantity-selector';

type CartItem = {
  id: string;
  quantity: number;
  lineTotal: number;
  product: { name: string; images?: Array<{ imageUrl: string; altText?: string | null; isPrimary?: boolean }> };
  variant?: { name?: string; title?: string; images?: Array<{ imageUrl: string; altText?: string | null; isPrimary?: boolean }> } | null;
};
type Cart = { items: CartItem[]; currency: string; subtotal: number; discount: number; estimatedTotal: number; totalItems: number };

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState('');
  const [busyItem, setBusyItem] = useState<string | null>(null);

  async function loadCart() {
    setError('');
    try { setCart(await cartApi.get() as Cart); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not load your bag.'); }
  }

  useEffect(() => {
    let active = true;
    cartApi.get()
      .then((result) => { if (active) setCart(result as Cart); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'We could not load your bag.'); });
    return () => { active = false; };
  }, []);

  async function updateQuantity(itemId: string, quantity: number) {
    setBusyItem(itemId);
    setError('');
    try { setCart(await cartApi.update(itemId, quantity) as Cart); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Quantity could not be updated.'); }
    finally { setBusyItem(null); }
  }

  async function removeItem(itemId: string) {
    setBusyItem(itemId);
    setError('');
    try { setCart(await cartApi.remove(itemId) as Cart); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Item could not be removed.'); }
    finally { setBusyItem(null); }
  }

  const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: cart?.currency ?? 'USD' }).format(amount);

  return (
    <main className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="mb-10 border-b pb-9">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-muted-foreground">Your selection</p>
        <div className="flex flex-wrap items-end justify-between gap-4"><h1>Shopping bag.</h1>{cart?.totalItems ? <p className="text-sm text-muted-foreground">{cart.totalItems} {cart.totalItems === 1 ? 'piece' : 'pieces'}</p> : null}</div>
      </div>

      {error ? <div role="alert" className="mb-6 flex items-center justify-between gap-4 border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><span>{error}</span><button type="button" className="font-bold underline" onClick={() => void loadCart()}>Try again</button></div> : null}

      {!cart ? <div className="grid min-h-64 place-items-center"><div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" aria-label="Loading your bag" /></div>
      : !cart.items.length ? (
        <section className="cart-empty-state">
          <div className="cart-empty-copy">
            <span className="cart-empty-icon"><PackageOpen aria-hidden="true" size={22} strokeWidth={1.5} /></span>
            <p className="overline">Nothing here—yet</p>
            <h2>Your next favourite<br /><em>starts here.</em></h2>
            <p>Considered objects, small-batch releases and everyday essentials—edited down to only the pieces worth keeping.</p>
            <Link href="/products" className="empty-bag-action">Explore the latest edit <ArrowRight aria-hidden="true" size={16} /></Link>
          </div>
          <Link href="/products?sort=newest" className="cart-empty-visual cart-empty-art" aria-label="Browse the newest arrivals">
            <span className="cart-art-letter" aria-hidden="true">N</span>
            <span><small>Live catalog</small>Discover what is new <ArrowRight aria-hidden="true" size={15} /></span>
          </Link>
        </section>
      ) : (
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          <section aria-label="Bag items" className="divide-y border-y">
            {cart.items.map((item) => {
              const images = item.variant?.images?.length ? item.variant.images : item.product.images ?? [];
              const image = images.find((entry) => entry.isPrimary) ?? images[0];
              return (
              <article key={item.id} className={`grid grid-cols-[96px_1fr] gap-5 py-6 sm:grid-cols-[130px_1fr_auto] ${busyItem === item.id ? 'opacity-50' : ''}`}>
                <div className="relative aspect-square overflow-hidden bg-muted">{image ? <Image src={image.imageUrl} alt={image.altText ?? item.product.name} fill sizes="130px" unoptimized className="object-cover" /> : <span className="product-no-image"><ImageIcon size={19} aria-hidden="true" /> Media pending</span>}</div>
                <div className="min-w-0 self-center"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">NOVA edit</p><h2 className="mt-2 font-semibold">{item.product.name}</h2>{item.variant?.title ? <p className="mt-1 text-xs text-muted-foreground">{item.variant.title}</p> : null}<div className="mt-5 flex flex-wrap items-center gap-3"><QuantitySelector value={item.quantity} disabled={busyItem === item.id} onChange={(quantity) => void updateQuantity(item.id, quantity)} /><button type="button" disabled={busyItem === item.id} onClick={() => void removeItem(item.id)} className="inline-flex items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-destructive"><Trash2 size={14} /> Remove</button></div></div>
                <strong className="col-start-2 self-center text-sm tabular-nums sm:col-auto">{money(item.lineTotal)}</strong>
              </article>
              );
            })}
          </section>
          <aside className="h-fit border bg-card p-6 sm:p-8">
            <h2 className="font-[Georgia] text-3xl">Order summary</h2>
            <dl className="mt-7 space-y-4 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{money(cart.subtotal)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>Calculated next</dd></div>{cart.discount > 0 ? <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>−{money(cart.discount)}</dd></div> : null}<div className="flex justify-between border-t pt-5 text-base font-bold"><dt>Estimated total</dt><dd>{money(cart.estimatedTotal)}</dd></div></dl>
            <Link href="/checkout" className="mt-7 flex min-h-12 items-center justify-between bg-foreground px-5 text-xs font-bold uppercase tracking-wider text-white">Checkout securely <ArrowRight size={16} /></Link>
            <div className="mt-6 grid gap-3 text-xs text-muted-foreground"><p className="flex items-center gap-2"><LockKeyhole size={15} /> Protected, encrypted checkout</p><p className="flex items-center gap-2"><Truck size={15} /> Complimentary delivery over $120</p></div>
          </aside>
        </div>
      )}
    </main>
  );
}

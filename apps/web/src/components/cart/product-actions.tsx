'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Heart, LoaderCircle, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types/catalog';
import { cartApi } from '@/lib/api/cart.api';
import { wishlistApi } from '@/lib/api/wishlist.api';

export function ProductActions({ product, variantId }: { product: Product; variantId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'cart' | 'wishlist' | null>(null);
  const [added, setAdded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const selectionRequired = product.variants.length > 0 && !variantId;

  async function addToCart() {
    setBusy('cart');
    setMessage('');
    try {
      await cartApi.add({ productId: product.id, variantId, quantity: 1 });
      setAdded(true);
      setMessage(`${product.name} was added to your bag.`);
      window.dispatchEvent(new Event('nova:cart-updated'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'This item could not be added. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  async function addToWishlist() {
    setBusy('wishlist');
    setMessage('');
    try {
      await wishlistApi.add({ productId: product.id, variantId });
      setSaved(true);
      setMessage(`${product.name} was saved to your wishlist.`);
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'Sign in to save this piece.';
      if (/auth|token|unauthor/i.test(nextMessage)) router.push(`/login?next=${encodeURIComponent(`/products/${product.slug}`)}`);
      else setMessage(nextMessage);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="product-actions">
      <button type="button" disabled={Boolean(busy) || selectionRequired} onClick={() => void addToCart()} className={`product-add-action ${added ? 'is-added' : ''}`}>
        {busy === 'cart' ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : added ? <Check aria-hidden="true" size={17} /> : <ShoppingBag aria-hidden="true" size={17} />}
        <span>{busy === 'cart' ? 'Adding…' : added ? 'Added to bag' : selectionRequired ? 'Choose an option' : 'Add to bag'}</span>
        <ArrowRight aria-hidden="true" size={16} />
      </button>
      <button type="button" disabled={Boolean(busy)} onClick={() => void addToWishlist()} className={`product-save-action ${saved ? 'is-saved' : ''}`} aria-pressed={saved}>
        {busy === 'wishlist' ? <LoaderCircle aria-hidden="true" className="animate-spin" size={17} /> : <Heart aria-hidden="true" size={17} fill={saved ? 'currentColor' : 'none'} />}
        {saved ? 'Saved' : 'Save for later'}
      </button>
      {message ? <div className="product-action-feedback" role="status" aria-live="polite"><span>{message}</span>{added ? <Link href="/cart">View bag <ArrowRight aria-hidden="true" size={13} /></Link> : null}</div> : null}
    </div>
  );
}

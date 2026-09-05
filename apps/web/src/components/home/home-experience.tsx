'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, Heart, ImageIcon, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { cartApi } from '@/lib/api/cart.api';
import { wishlistApi } from '@/lib/api/wishlist.api';
import type { Category, Product } from '@/types/catalog';

const collectionTones = ['lime', 'sand', 'clay'];

function getProductImage(product: Product) {
  const images = product.images.length ? product.images : product.variants.flatMap((variant) => variant.images ?? []);
  return images.find((item) => item.isPrimary) ?? images[0];
}

function formatPrice(product: Product) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(Number(product.basePrice));
}

export function HomeExperience({ products, categories, catalogAvailable }: { products: Product[]; categories: Category[]; catalogAvailable: boolean }) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [saved, setSaved] = useState<string[]>([]);
  const [bag, setBag] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const filters = useMemo(() => ['All', ...Array.from(new Set(products.flatMap((product) => product.categories.map(({ category }) => category.name))))], [products]);
  const visibleProducts = useMemo(() => activeCategory === 'All' ? products : products.filter((product) => product.categories.some(({ category }) => category.name === activeCategory)), [activeCategory, products]);
  const heroProduct = products.find((product) => product.featured && getProductImage(product)) ?? products.find((product) => getProductImage(product));
  const heroImage = heroProduct ? getProductImage(heroProduct) : undefined;

  async function addToBag(product: Product) {
    setBusy(`bag:${product.slug}`);
    setFeedback('');
    try {
      const variant = product.variants.find((item) => item.isDefault) ?? product.variants[0];
      await cartApi.add({ productId: product.id, variantId: variant?.id, quantity: 1 });
      setBag((current) => current.includes(product.slug) ? current : [...current, product.slug]);
      setFeedback(`${product.name} added to your bag.`);
      window.dispatchEvent(new Event('nova:cart-updated'));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'This item could not be added.');
    } finally {
      setBusy(null);
    }
  }

  async function saveProduct(product: Product) {
    setBusy(`save:${product.slug}`);
    setFeedback('');
    try {
      const variant = product.variants.find((item) => item.isDefault) ?? product.variants[0];
      await wishlistApi.add({ productId: product.id, variantId: variant?.id });
      setSaved((current) => current.includes(product.slug) ? current : [...current, product.slug]);
      setFeedback(`${product.name} saved to your wishlist.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in to save this piece.';
      if (/auth|token|unauthor/i.test(message)) router.push('/login');
      else setFeedback(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main id="main-content" className="home-shell">
      <section className="editorial-hero page-container" aria-labelledby="hero-title">
        <div className="hero-copy reveal-up">
          <p className="overline"><span />THE NOVA EDIT</p>
          <h1 id="hero-title">Less, but<br /><em>remarkable.</em></h1>
          <p className="hero-intro">Objects with presence. Wardrobe foundations with purpose. A considered collection for the way you actually live.</p>
          <div className="hero-cta-row"><Link href="/products" className="primary-cta">Explore the edit <ArrowUpRight size={17} /></Link><Link href="#philosophy" className="quiet-link">Our point of view <ArrowDown size={15} /></Link></div>
          <div className="hero-social-proof"><div><strong>Cloudinary</strong><span>Managed product media</span></div><div><strong>Live catalog</strong><span>Inventory-backed shopping</span></div></div>
        </div>
        <div className={`hero-image-wrap reveal-scale ${heroImage ? '' : 'catalog-no-media'}`}>
          {heroImage ? <Image src={heroImage.imageUrl} alt={heroImage.altText ?? heroProduct?.name ?? 'Featured NOVA product'} fill priority sizes="(max-width: 780px) 100vw, 55vw" unoptimized className="hero-image" /> : <div className="no-media-art" aria-label="NOVA catalog awaiting its first product"><span>N</span><p>THE NEXT OBJECT<br />STARTS HERE</p></div>}
          {heroImage ? <><div className="hero-image-shade" /><div className="image-index"><span>01</span><span>FORM / FUNCTION</span></div><div className="image-caption"><Sparkles size={14} /> {heroProduct?.name}<span>LIVE EDIT</span></div></> : null}
        </div>
      </section>

      <section className="service-strip" aria-label="Shopping benefits"><div className="page-container service-grid"><div><Truck size={19} /><span><strong>Tracked delivery</strong>Clear status from dispatch</span></div><div><PackageCheck size={19} /><span><strong>Easy returns</strong>Managed from your account</span></div><div><ShieldCheck size={19} /><span><strong>Secure checkout</strong>Protected end to end</span></div></div></section>

      <section className="page-container story-section" id="philosophy">
        <div className="section-heading-row"><div><p className="overline"><span />SHOP BY INTENTION</p><h2>Built for life.<br /><em>Chosen for longer.</em></h2></div><p>We edit down the noise to useful, beautiful things that keep earning their place.</p></div>
        {categories.length ? <div className="collection-grid">{categories.slice(0, 3).map((category, index) => <Link href={`/categories/${category.slug}`} className={`collection-card collection-${collectionTones[index % collectionTones.length]}`} key={category.id}><span className="collection-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{category.name}</h3><p>{category.description ?? 'Explore this considered collection.'}</p></div><ArrowUpRight size={22} /></Link>)}</div> : <div className="catalog-empty-panel"><span><ImageIcon size={20} /></span><div><h3>Collections are being composed.</h3><p>Once real categories are published, they will appear here automatically.</p></div></div>}
      </section>

      <section className="page-container products-section">
        <div className="section-heading-row compact-heading"><div><p className="overline"><span />THE LATEST EDIT</p><h2>New essentials,<br /><em>quietly iconic.</em></h2></div><Link href="/products" className="quiet-link">View all products <ArrowRight size={16} /></Link></div>
        {filters.length > 1 ? <div className="product-filter" aria-label="Filter featured products">{filters.map((category) => <button key={category} type="button" className={activeCategory === category ? 'selected' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}</div> : null}
        {visibleProducts.length ? <div className="editorial-product-grid">{visibleProducts.map((product, index) => {
          const image = getProductImage(product);
          const category = product.categories[0]?.category.name ?? product.brand?.name ?? 'NOVA edit';
          return <article className="editorial-product-card" key={product.id} style={{ '--delay': `${index * 55}ms` } as React.CSSProperties}>
            <div className={`editorial-product-media ${image ? '' : 'catalog-no-media'}`}><Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>{image ? <Image src={image.imageUrl} alt={image.altText ?? product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized className="product-photo" /> : <span className="product-no-image"><ImageIcon size={22} /> Media pending</span>}</Link><span className="editorial-badge">{product.featured ? 'Featured' : 'New'}</span><button type="button" disabled={busy === `save:${product.slug}`} className={`save-product ${saved.includes(product.slug) ? 'saved' : ''}`} onClick={() => void saveProduct(product)} aria-label={saved.includes(product.slug) ? `${product.name} is saved` : `Save ${product.name}`}><Heart size={18} fill={saved.includes(product.slug) ? 'currentColor' : 'none'} /></button><Link href={`/products/${product.slug}`} className="quick-link">View piece <ArrowUpRight size={14} /></Link></div>
            <div className="editorial-product-info"><div><p>{category}</p><h3><Link href={`/products/${product.slug}`}>{product.name}</Link></h3></div><strong>{formatPrice(product)}</strong></div>
            <div className="product-detail-line"><span>{product.brand?.name ?? 'Independent design'}</span><span>{product.variants.length ? `${product.variants.length} ${product.variants.length === 1 ? 'option' : 'options'}` : 'Single edition'}</span></div>
            <button type="button" disabled={busy === `bag:${product.slug}`} className={`add-to-bag ${bag.includes(product.slug) ? 'added' : ''}`} onClick={() => void addToBag(product)}>{busy === `bag:${product.slug}` ? 'Adding…' : bag.includes(product.slug) ? <><Check size={15} /> Added to bag</> : <>Add to bag <ArrowRight size={15} /></>}</button>
          </article>;
        })}</div> : <div className="catalog-empty-panel catalog-empty-products"><span><ImageIcon size={20} /></span><div><h3>{catalogAvailable ? 'The first real product is coming soon.' : 'The catalog is temporarily unavailable.'}</h3><p>{catalogAvailable ? 'Publish products with Cloudinary media and they will appear here automatically.' : 'Please try the catalog again in a moment.'}</p></div><Link href="/products">Open catalog <ArrowRight size={15} /></Link></div>}
        <p className="sr-only" role="status" aria-live="polite">{feedback}</p>
      </section>

      <section className="page-container membership-banner"><div><p className="overline light"><span />NOVA CIRCLE</p><h2>Good things<br /><em>come around.</em></h2><p>Save favorites, access small-batch drops first, and keep every order in one beautiful place.</p><Link href="/register" className="accent-cta">Join the circle <ArrowUpRight size={17} /></Link></div><div className="membership-seal" aria-hidden="true"><span>N</span><p>EARLY ACCESS · MEMBER NOTES · PRIVATE EDITS ·</p></div></section>
      <footer className="page-container site-footer"><div><Link href="/" className="brand-mark"><span className="brand-orbit">N</span><span>NOVA</span></Link><p>Everyday objects, considered.</p></div><nav aria-label="Footer navigation"><Link href="/products">Shop all</Link><Link href="/categories">Collections</Link><Link href="/brands">Designers</Link><Link href="/profile">Account</Link></nav><p>© 2026 NOVA COMMERCE</p></footer>
    </main>
  );
}

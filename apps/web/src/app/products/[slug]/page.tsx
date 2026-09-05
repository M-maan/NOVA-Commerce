import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { productsApi } from '@/lib/api/products.api';
import { ProductImageGallery } from '@/components/catalog/product-image-gallery';
import { ProductVariantSelector } from '@/components/catalog/product-variant-selector';
import { ProductPrice } from '@/components/catalog/product-price';
import { ProductGrid } from '@/components/catalog/product-grid';
import { RecentlyViewed } from '@/components/discovery/recently-viewed';
import { ProductActions } from '@/components/cart/product-actions';
import { ReviewSection } from '@/components/reviews/review-section';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await productsApi.bySlug((await params).slug);
  const image = product.images.find((item) => item.isPrimary) ?? product.images[0];
  return { title: product.name, description: product.shortDescription ?? product.description ?? undefined, alternates: { canonical: `/products/${product.slug}` }, openGraph: { title: product.name, description: product.shortDescription ?? product.description ?? undefined, images: image ? [image.imageUrl] : undefined, type: 'website' } };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await productsApi.bySlug(slug);
  const related = await productsApi.related(product.id);
  return (
    <main className="product-detail-page">
      <div className="product-breadcrumb"><Link href="/products"><ArrowLeft aria-hidden="true" size={14} /> Back to the edit</Link><span>{product.categories[0]?.category.name ?? 'NOVA collection'} / {product.name}</span></div>
      <div className="product-detail-layout">
        <ProductImageGallery product={product} />
        <section className="product-detail-copy">
          <div className="product-title-block">
            <p className="overline"><span />{product.brand ? <Link href={`/brands/${product.brand.slug}`}>{product.brand.name}</Link> : 'NOVA EDIT'}</p>
            <h1>{product.name}</h1>
            {product.shortDescription ? <p>{product.shortDescription}</p> : null}
          </div>
          {product.variants.length || product.options.length ? <ProductVariantSelector product={product} /> : <><ProductPrice product={product} /><ProductActions product={product} /></>}
          <div className="product-assurance-grid">
            <p><Truck aria-hidden="true" size={18} /><span><strong>Complimentary delivery</strong>Over $120</span></p>
            <p><PackageCheck aria-hidden="true" size={18} /><span><strong>30-day returns</strong>Simple and considered</span></p>
            <p><ShieldCheck aria-hidden="true" size={18} /><span><strong>Secure checkout</strong>Protected end to end</span></p>
          </div>
          <section className="product-description">
            <div><p className="overline">DETAILS / CARE</p><h2>Made to earn<br />its place.</h2></div>
            <p>{product.description ?? 'A considered piece selected for everyday function and a longer life.'}</p>
            <div className="product-category-links">{product.categories.map(({ category }) => <Link key={category.id} href={`/categories/${category.slug}`}>{category.name}</Link>)}</div>
          </section>
        </section>
      </div>
      {related.length ? <section className="product-related"><div><p className="overline"><span />KEEP EXPLORING</p><h2>More considered pieces.</h2></div><ProductGrid products={related} /></section> : null}
      <RecentlyViewed product={product} />
      <ReviewSection productId={product.id} />
    </main>
  );
}

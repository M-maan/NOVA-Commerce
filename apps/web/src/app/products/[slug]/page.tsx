import Link from 'next/link';
import type { Metadata } from 'next';
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
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 text-sm text-muted-foreground"><Link href="/products" className="hover:text-primary">Products</Link> / {product.name}</div>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductImageGallery product={product} />
        <section className="space-y-6">
          <div>
            {product.brand ? <Link href={`/brands/${product.brand.slug}`} className="text-sm font-medium text-primary">{product.brand.name}</Link> : null}
            <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>
            {product.shortDescription ? <p className="mt-3 text-muted-foreground">{product.shortDescription}</p> : null}
          </div>
          {product.variants.length || product.options.length ? <ProductVariantSelector product={product} /> : <><ProductPrice product={product} /><ProductActions product={product} /></>}
          <div className="flex flex-wrap gap-2">
            {product.categories.map(({ category }) => <Link key={category.id} href={`/categories/${category.slug}`} className="rounded-full border px-3 py-1 text-sm">{category.name}</Link>)}
          </div>
          <section className="prose prose-sm max-w-none dark:prose-invert">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="whitespace-pre-line text-muted-foreground">{product.description ?? 'No detailed description available.'}</p>
          </section>
        </section>
      </div>
      {related.length ? <section className="mt-12"><h2 className="mb-5 text-2xl font-semibold">Related products</h2><ProductGrid products={related} /></section> : null}
      <RecentlyViewed product={product} />
      <ReviewSection productId={product.id} />
    </main>
  );
}

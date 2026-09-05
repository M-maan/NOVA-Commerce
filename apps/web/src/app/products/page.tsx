import Link from 'next/link';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { productsApi } from '@/lib/api/products.api';
import { categoriesApi } from '@/lib/api/categories.api';
import { brandsApi } from '@/lib/api/brands.api';
import { ProductGrid } from '@/components/catalog/product-grid';
import { Pagination } from '@/components/catalog/pagination';

export const dynamic = 'force-dynamic';
type PageProps = { searchParams?: Promise<Record<string, string | undefined>> };

export default async function ProductsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const page = Number(params.page ?? 1);
  const [products, categories, brands] = await Promise.all([
    productsApi.list({ page, limit: 12, q: params.q, category: params.category, brand: params.brand, featured: params.featured === 'true' ? true : undefined, sort: params.sort as never }),
    categoriesApi.list({ limit: 20 }),
    brandsApi.list({ limit: 20 }),
  ]);
  const filtered = Boolean(params.q || params.category || params.brand || params.featured);

  return (
    <main className="catalog-page">
      <section className="catalog-hero">
        <div><p className="overline"><span />THE COMPLETE EDIT</p><h1>Objects worth<br /><em>keeping.</em></h1></div>
        <div className="catalog-hero-note"><span>CURATED / 2026</span><p>Useful, beautiful pieces selected for material, function, and a longer life.</p><Link href="/categories">Explore collections <ArrowRight size={15} /></Link></div>
      </section>
      <form className="catalog-toolbar">
        <div className="catalog-search"><Search size={17} /><label className="sr-only" htmlFor="catalog-search">Search products</label><input id="catalog-search" name="q" defaultValue={params.q} placeholder="What are you looking for?" /></div>
        <label><span>Category</span><select name="category" defaultValue={params.category ?? ''}><option value="">All collections</option>{categories.items.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label><span>Brand</span><select name="brand" defaultValue={params.brand ?? ''}><option value="">All makers</option>{brands.items.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
        <label><span>Sort by</span><select name="sort" defaultValue={params.sort ?? 'newest'}><option value="newest">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name_asc">Name A–Z</option></select></label>
        <button type="submit"><SlidersHorizontal size={16} /> Apply</button>
      </form>
      <div className="catalog-result-bar"><p><strong>{products.total}</strong> {products.total === 1 ? 'piece' : 'pieces'} in this edit</p><div><Link href="/products?featured=true">Featured</Link>{filtered ? <Link href="/products">Clear filters</Link> : null}</div></div>
      <ProductGrid products={products.items} />
      <Pagination page={products.page} totalPages={products.totalPages} basePath="/products" />
    </main>
  );
}

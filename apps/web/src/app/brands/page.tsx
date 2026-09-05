import { brandsApi } from '@/lib/api/brands.api';
import { BrandCard } from '@/components/catalog/brand-card';
import { EmptyState } from '@/components/catalog/states';

export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const brands = await brandsApi.list({ limit: 50 });
  return (
    <main className="directory-page">
      <header className="directory-hero"><div><p className="overline"><span />THE DESIGN DIRECTORY</p><h1>Independent<br /><em>voices.</em></h1></div><p>Meet the makers and studios behind our considered collection—chosen for process, material and a point of view.</p></header>
      <div className="directory-divider"><span>{brands.total} selected {brands.total === 1 ? 'studio' : 'studios'}</span><span>NOVA / DIRECTORY</span></div>
      <div className="brand-directory-grid">
        {brands.items.map((brand) => <BrandCard key={brand.id} brand={brand} />)}
      </div>
      {!brands.items.length ? <EmptyState title="No brands yet" /> : null}
    </main>
  );
}

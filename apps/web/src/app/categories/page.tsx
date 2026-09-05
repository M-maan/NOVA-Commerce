import { categoriesApi } from '@/lib/api/categories.api';
import { CategoryCard } from '@/components/catalog/category-card';
import { EmptyState } from '@/components/catalog/states';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await categoriesApi.list({ limit: 50 });
  return (
    <main className="directory-page">
      <header className="directory-hero"><div><p className="overline"><span />SHOP BY INTENTION</p><h1>Considered<br /><em>collections.</em></h1></div><p>Purposeful edits for every part of the day, assembled around how you live rather than passing trends.</p></header>
      <div className="directory-divider"><span>{categories.total} curated {categories.total === 1 ? 'collection' : 'collections'}</span><span>NOVA / EDITS</span></div>
      <div className="category-directory-grid">
        {categories.items.map((category) => <CategoryCard key={category.id} category={category} />)}
      </div>
      {!categories.items.length ? <EmptyState title="No categories yet" /> : null}
    </main>
  );
}

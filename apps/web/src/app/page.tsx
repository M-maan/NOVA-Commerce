import { productsApi } from '@/lib/api/products.api';
import { categoriesApi } from '@/lib/api/categories.api';
import { HomeExperience } from '@/components/home/home-experience';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [productsResult, categoriesResult] = await Promise.allSettled([
    productsApi.list({ limit: 6, sort: 'newest' }),
    categoriesApi.list({ limit: 6 }),
  ]);

  return <HomeExperience
    products={productsResult.status === 'fulfilled' ? productsResult.value.items : []}
    categories={categoriesResult.status === 'fulfilled' ? categoriesResult.value.items : []}
    catalogAvailable={productsResult.status === 'fulfilled'}
  />;
}

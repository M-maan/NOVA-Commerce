import { Product } from '@/types/catalog';

export function ProductBadge({ product }: { product: Product }) {
  if (product.featured) return <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">Featured</span>;
  if (product.variants.length > 1) return <span className="rounded-full bg-muted px-2 py-1 text-xs">Variants</span>;
  return <span className="rounded-full bg-muted px-2 py-1 text-xs">New</span>;
}

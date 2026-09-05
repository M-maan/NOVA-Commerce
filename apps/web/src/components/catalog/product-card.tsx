import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types/catalog';
import { ProductBadge } from './product-badge';
import { ProductPrice } from './product-price';
import { ImageIcon } from 'lucide-react';

export function ProductCard({ product }: { product: Product }) {
  const images = product.images.length ? product.images : product.variants.flatMap((variant) => variant.images ?? []);
  const image = images.find((item) => item.isPrimary) ?? images[0];
  return (
    <Link href={`/products/${product.slug}`} className="catalog-product-card group block border-b pb-5 transition duration-300 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? <Image src={image.imageUrl} alt={image.altText ?? product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized className="object-cover transition duration-700 group-hover:scale-[1.035]" /> : <span className="product-no-image"><ImageIcon size={22} aria-hidden="true" /> Media pending</span>}
        <span className="absolute bottom-3 right-3 translate-y-2 bg-foreground px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">View piece</span>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="line-clamp-1 font-semibold">{product.name}</p>
          <ProductBadge product={product} />
        </div>
        {product.brand ? <p className="text-sm text-muted-foreground">{product.brand.name}</p> : null}
        <ProductPrice product={product} />
      </div>
    </Link>
  );
}

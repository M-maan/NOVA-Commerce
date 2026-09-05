import { Product } from '@/types/catalog';

export function ProductImageGallery({ product }: { product: Product }) {
  // Catalog images may be attached to a variant (for example, a colour-specific photo).
  // Include those images when the product-level collection is empty so every uploaded
  // image remains visible on the storefront.
  const source = product.images.length ? product.images : product.variants.flatMap((variant) => variant.images ?? []);
  const images = source.length ? source : [{ id: 'placeholder', imageUrl: '', altText: product.name, productId: product.id, sortOrder: 0, isPrimary: true }];
  const primary = images.find((image) => image.isPrimary) ?? images[0];
  return (
    <div className="product-gallery">
      <div className="product-gallery-primary">
        {primary.imageUrl ? <Image src={primary.imageUrl} alt={primary.altText ?? product.name} width={1000} height={1000} priority unoptimized={primary.imageUrl.startsWith('http')} className="h-full w-full object-cover" /> : <div className="product-image-unavailable">Product image unavailable</div>}
      </div>
      <div className="product-gallery-thumbs">
        {images.filter((image) => image.imageUrl).map((image) => (
          <div key={image.id}>
            <Image src={image.imageUrl} alt={image.altText ?? product.name} width={160} height={160} unoptimized={image.imageUrl.startsWith('http')} className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
import Image from 'next/image';

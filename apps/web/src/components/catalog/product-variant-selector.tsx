'use client';

import { useEffect } from 'react';
import { Product } from '@/types/catalog';
import { useCatalogStore } from '@/stores/catalog.store';
import { ProductPrice } from './product-price';
import { ProductActions } from '@/components/cart/product-actions';

export function ProductVariantSelector({ product }: { product: Product }) {
  const { selectedVariantId, selectedOptions, setSelectedVariant, setSelectedOption, resetSelection } = useCatalogStore();
  const selectedVariant = product.variants.find((variant) => variant.id === selectedVariantId) ?? product.variants.find((variant) => variant.isDefault) ?? product.variants[0];

  useEffect(() => {
    resetSelection();
    if (selectedVariant) setSelectedVariant(selectedVariant.id);
  }, [product.id, resetSelection, selectedVariant, setSelectedVariant]);

  return (
    <div className="product-purchase-panel">
      <ProductPrice product={product} variant={selectedVariant} />
      {product.options.map((option) => (
        <div key={option.id} className="product-option-group">
          <p>{option.name}</p>
          <div>
            {option.values.map((value) => (
              <button
                type="button"
                key={value.id}
                onClick={() => setSelectedOption(option.id, value.id)}
                className={selectedOptions[option.id] === value.id ? 'selected' : ''}
              >
                {value.value}
              </button>
            ))}
          </div>
        </div>
      ))}
      {product.variants.length ? (
        <label className="product-variant-select">
          <span>Choose variant</span>
          <select value={selectedVariant?.id ?? ''} onChange={(event) => setSelectedVariant(event.target.value)}>
            {product.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.sku ? ` · ${variant.sku}` : ''}</option>)}
          </select>
        </label>
      ) : null}
      {selectedVariant?.sku ? <p className="product-sku">SKU / {selectedVariant.sku}</p> : null}
      <ProductActions product={product} variantId={selectedVariant?.id} />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';

type Product = {
  id: string;
  name: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  basePrice: string | number;
  currency: string;
  featured: boolean;
  brand?: { name: string } | null;
  categories?: Array<{ category: { name: string } }>;
  variants?: Array<{ id: string; sku?: string | null; status: string }>;
  images?: Array<{ imageUrl: string; altText?: string | null }>;
};

type ProductResponse = { items?: Product[]; data?: Product[]; total?: number };

const statuses = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState('');

  const params = useMemo(() => {
    const next = new URLSearchParams({ limit: '50' });
    if (query.trim()) next.set('q', query.trim());
    if (status) next.set('status', status);
    return next.toString();
  }, [query, status]);

  async function load(showLoading = true) {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await api.get<ProductResponse | Product[]>(`/admin/products?${params}`);
      setProducts(Array.isArray(response) ? response : response.items ?? response.data ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.get<ProductResponse | Product[]>(`/admin/products?${params}`)
      .then((response) => {
        if (active) setProducts(Array.isArray(response) ? response : response.items ?? response.data ?? []);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load products.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params]);

  async function updateStatus(product: Product, nextStatus: Product['status']) {
    setError('');
    try {
      const updated = await api.patch<Product>(`/admin/products/${product.id}/status`, { status: nextStatus });
      setProducts((current) => current.map((item) => (item.id === product.id ? updated : item)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update product status.');
    }
  }

  async function uploadMedia(product: Product, file?: File) {
    if (!file) return;
    setUploading(product.id);
    setError('');
    setMediaMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('altText', product.name);
      await api.upload(`/admin/products/${product.id}/images/upload`, form);
      setMediaMessage(`${product.name} media uploaded to Cloudinary.`);
      await load(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Media upload failed.');
    } finally {
      setUploading(null);
    }
  }

  function exportCsv() {
    const rows = products.map((product) => [
      product.name,
      product.slug,
      product.status,
      product.brand?.name ?? '',
      product.currency,
      product.basePrice,
      product.variants?.length ?? 0,
    ]);
    const csv = [['name', 'slug', 'status', 'brand', 'currency', 'price', 'variants'], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nova-products.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Admin CMS</p>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="mt-2 text-muted-foreground">Manage product status, SEO readiness, media coverage, and merchandising signals.</p>
        </div>
        <button onClick={exportCsv} disabled={!products.length} className="rounded-md border px-4 py-2 text-sm disabled:opacity-50">
          Export CSV
        </button>
      </div>

      <section className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_220px_auto]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or slugs" className="rounded-md border bg-background px-3 py-2" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-md border bg-background px-3 py-2">
          <option value="">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button onClick={() => void load()} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Refresh</button>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-300 p-3 text-red-600">{error}</p>}
      {mediaMessage && <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-green-800">{mediaMessage}</p>}
      {loading ? <p className="rounded-md border p-6 text-muted-foreground">Loading products...</p> : null}

      {!loading && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Status</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Price</th>
                <th className="p-3">Catalog</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t align-top">
                  <td className="p-3">
                    <Link href={`/products/${product.slug}`} className="font-medium underline">{product.name}</Link>
                    <p className="text-muted-foreground">{product.slug}</p>
                  </td>
                  <td className="p-3">
                    <select value={product.status} onChange={(event) => updateStatus(product, event.target.value as Product['status'])} className="rounded-md border bg-background px-2 py-1">
                      {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </td>
                  <td className="p-3">{product.brand?.name ?? 'No brand'}</td>
                  <td className="p-3">{Number(product.basePrice).toFixed(2)} {product.currency}</td>
                  <td className="p-3">
                    <p>{product.variants?.length ?? 0} variants</p>
                    <p>{product.images?.length ?? 0} media assets</p>
                    <p className="text-muted-foreground">{product.categories?.map((item) => item.category.name).join(', ') || 'No category'}</p>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/products/${product.slug}`} className="text-primary underline">Preview</Link>
                      <label className="cursor-pointer rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted">
                        {uploading === product.id ? 'Uploading…' : 'Upload media'}
                        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading === product.id} onChange={(event) => { const file = event.currentTarget.files?.[0]; void uploadMedia(product, file); event.currentTarget.value = ''; }} />
                      </label>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && <p className="p-8 text-center text-muted-foreground">No products match the current filters.</p>}
        </div>
      )}
    </main>
  );
}

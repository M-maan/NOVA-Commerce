import Link from 'next/link';
import { Brand } from '@/types/catalog';

export function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link href={`/brands/${brand.slug}`} className="group border bg-card p-5 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="brand-monogram">
        <span>{brand.name.charAt(0)}</span><small>EST. / NOVA SELECTED</small>
      </div>
      <p className="mt-4 flex items-center justify-between font-semibold">{brand.name}<span aria-hidden="true">↗</span></p>
    </Link>
  );
}

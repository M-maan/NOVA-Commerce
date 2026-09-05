import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/types/catalog';
import { ArrowUpRight } from 'lucide-react';

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link href={`/categories/${category.slug}`} className="group block transition duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {category.image ? <Image src={category.image} alt={category.name} fill sizes="(max-width: 640px) 100vw, 50vw" unoptimized className="object-cover transition duration-700 group-hover:scale-105" /> : <div className="category-no-image" aria-hidden="true"><span>{category.name.slice(0, 1)}</span><ArrowUpRight size={24} /></div>}
        {category.image ? <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /> : null}
        <h3 className={`absolute bottom-5 left-5 font-[Georgia] text-3xl font-medium ${category.image ? 'text-white' : 'text-foreground'}`}>{category.name}</h3>
      </div>
      {category.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{category.description}</p> : null}
    </Link>
  );
}

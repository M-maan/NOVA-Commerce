'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Bell, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { cartApi } from '@/lib/api/cart.api';

const links = [
  { href: '/products?sort=newest', label: 'New in' },
  { href: '/products', label: 'Shop all' },
  { href: '/categories', label: 'Collections' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refreshCart = () => {
      void cartApi.get()
        .then((cart) => { if (active) setCartCount(Number((cart as { totalItems?: number }).totalItems ?? 0)); })
        .catch(() => { if (active) setCartCount(0); });
    };
    refreshCart();
    window.addEventListener('nova:cart-updated', refreshCart);
    return () => { active = false; window.removeEventListener('nova:cart-updated', refreshCart); };
  }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q')?.toString().trim();
    if (query) router.push(`/products?q=${encodeURIComponent(query)}`);
  }

  return (
    <>
      <div className="global-announcement">
        <span className="announcement-dot" aria-hidden="true" />
        Complimentary express delivery over $120
        <span aria-hidden="true">·</span>
        30-day returns
      </div>
      <header className="site-header">
        <nav className="site-nav" aria-label="Primary navigation">
          <button type="button" className="nav-icon mobile-only" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link className="brand-mark" href="/" aria-label="NOVA Commerce home" onClick={() => setMenuOpen(false)}>
            <span className="brand-orbit">N</span>
            <span>NOVA</span>
            <small>COMMERCE</small>
          </Link>
          <div className={`nav-links ${menuOpen ? 'nav-links-open' : ''}`}>
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className={pathname === '/products' && link.label === 'Shop all' ? 'active' : ''}>{link.label}</Link>
            ))}
          </div>
          <div className="nav-actions">
            <button type="button" className="nav-icon" onClick={() => setSearchOpen((open) => !open)} aria-label={searchOpen ? 'Close search' : 'Search'} aria-expanded={searchOpen}>
              {searchOpen ? <X size={19} /> : <Search size={19} />}
            </button>
            <Link className="nav-icon desktop-action" href="/notifications" aria-label="Notifications"><Bell size={19} /></Link>
            <Link className="nav-icon desktop-action" href="/profile" aria-label="Your account"><UserRound size={19} /></Link>
            <Link className="cart-link" href="/cart" aria-label={`Open shopping bag${cartCount ? `, ${cartCount} items` : ''}`}><ShoppingBag size={18} /><span>Bag</span>{cartCount ? <b className="cart-count" aria-hidden="true">{cartCount > 99 ? '99+' : cartCount}</b> : null}</Link>
          </div>
        </nav>
        <form className={`global-search ${searchOpen ? 'global-search-open' : ''}`} onSubmit={submitSearch} role="search">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="global-search-input">Search NOVA</label>
          <input id="global-search-input" name="q" autoComplete="off" placeholder="Search products, collections and designers" />
          <button type="submit">Search</button>
        </form>
      </header>
    </>
  );
}

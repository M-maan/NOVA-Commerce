'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Heart,
  Menu,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  UserRound,
  X,
  Zap,
} from 'lucide-react';

type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  color: string;
  art: string;
  accent: string;
  badge?: string;
  rating: string;
  reviews: string;
};

const products: Product[] = [
  { id: '01', name: 'Arc Knit Runner', category: 'Footwear', price: '$148', color: 'Cloud / Ink', art: 'runner', accent: '#d8ef64', badge: 'New', rating: '4.9', reviews: '128' },
  { id: '02', name: 'Forma Utility Tote', category: 'Carry', price: '$96', color: 'Cinder', art: 'tote', accent: '#ff765e', badge: 'Best seller', rating: '4.8', reviews: '84' },
  { id: '03', name: 'Signal Shell Jacket', category: 'Outerwear', price: '$210', color: 'Moss', art: 'jacket', accent: '#81a8ff', rating: '4.7', reviews: '61' },
  { id: '04', name: 'Studio Field Watch', category: 'Objects', price: '$175', color: 'Steel / Onyx', art: 'watch', accent: '#f1b56b', rating: '4.9', reviews: '203' },
  { id: '05', name: 'Trace Optical Frame', category: 'Accessories', price: '$72', color: 'Smoke', art: 'frame', accent: '#d9a6ff', rating: '4.6', reviews: '47' },
  { id: '06', name: 'Daily Form Hoodie', category: 'Essentials', price: '$118', color: 'Stone', art: 'hoodie', accent: '#ff9d8e', rating: '4.8', reviews: '96' },
];

const categories = [
  { name: 'New arrivals', count: '42 pieces', className: 'category-lime', number: '01' },
  { name: 'Everyday carry', count: '18 pieces', className: 'category-coral', number: '02' },
  { name: 'Weekend uniform', count: '26 pieces', className: 'category-blue', number: '03' },
  { name: 'Objects & more', count: '31 pieces', className: 'category-violet', number: '04' },
];

const tabs = ['For you', 'Trending', 'Essentials'];

function ProductArt({ product }: { product: Product }) {
  return (
    <div className={`product-art art-${product.art}`} style={{ '--art-accent': product.accent } as React.CSSProperties} aria-hidden="true">
      <div className="art-grid" />
      <div className="art-orb" />
      <div className="art-object"><span /></div>
      <div className="art-label">NOVA / {product.id}</div>
    </div>
  );
}

function Stat({ icon: Icon, value, label, change }: { icon: LucideIcon; value: string; label: string; change: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon"><Icon size={17} strokeWidth={1.8} /></div>
      <div><p className="stat-value">{value}</p><p className="stat-label">{label}</p></div>
      <span className="stat-change">{change}</span>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('For you');
  const [activeCategory, setActiveCategory] = useState('All pieces');
  const [saved, setSaved] = useState<string[]>([]);
  const [bag, setBag] = useState<string[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visibleProducts = useMemo(() => {
    const filtered = activeCategory === 'All pieces' ? products : products.filter((product) => product.category === activeCategory);
    return showAll ? filtered : filtered.slice(0, 4);
  }, [activeCategory, showAll]);

  const toggleSaved = (id: string) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleBag = (id: string) => setBag((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <main className="nova-shell">
      <div className="announce-bar"><span className="announce-pulse" />Free express delivery on orders over $120 <span className="announce-dot">·</span> Easy 30-day returns <button type="button" aria-label="Dismiss announcement"><X size={14} /></button></div>

      <header className="nova-header">
        <div className="nav-wrap">
          <button className="mobile-menu" type="button" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle navigation"><Menu size={21} /></button>
          <Link href="/" className="nova-logo"><span className="logo-mark">N</span><span>NOVA</span><small>COMMERCE / 01</small></Link>
          <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`}>
            <Link className="active" href="/">Discover</Link><Link href="/products">Shop all</Link><Link href="/categories">Collections</Link><Link href="/brands">Brands</Link>
          </nav>
          <div className="nav-actions">
            <button type="button" className="icon-btn search-trigger" onClick={() => setSearchOpen((value) => !value)} aria-label="Search"><Search size={19} /></button>
            <Link href="/profile" className="icon-btn profile-trigger" aria-label="Profile"><UserRound size={19} /></Link>
            <Link href="/cart" className="bag-btn" aria-label={`Bag with ${bag.length} items`}><ShoppingBag size={19} /><span>Bag</span><b>{String(bag.length).padStart(2, '0')}</b></Link>
          </div>
        </div>
        <div className={`search-panel ${searchOpen ? 'is-open' : ''}`}>
          <Search size={18} /><input autoFocus={searchOpen} placeholder="Search products, collections, brands..." /><span>ESC</span>
        </div>
      </header>

      <div className="page-wrap">
        <section className="hero-grid">
          <div className="hero-copy reveal-up">
            <div className="eyebrow"><span className="eyebrow-line" />THE NOVA EDIT / 08.26</div>
            <h1>Make room<br /><em>for better.</em></h1>
            <p className="hero-lede">Considered goods for the way you move through the world. Less noise, more keepers.</p>
            <div className="hero-actions"><Link href="/products" className="button button-dark">Shop the edit <ArrowUpRight size={16} /></Link><button className="text-link" type="button" onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}>How NOVA works <ArrowRight size={15} /></button></div>
            <div className="hero-proof"><div className="avatar-stack"><span>JA</span><span>ML</span><span>SK</span><span>+2k</span></div><div><div className="stars"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></div><p>Loved by 2,400+ detail-obsessed people</p></div></div>
          </div>
          <div className="hero-visual reveal-scale">
            <div className="hero-note note-top"><Sparkles size={14} /> CURATED WEEKLY <b>↗</b></div>
            <div className="hero-art"><div className="hero-sun" /><div className="hero-ring ring-one" /><div className="hero-ring ring-two" /><div className="hero-product product-main"><span className="product-seam" /><span className="product-lace lace-one" /><span className="product-lace lace-two" /></div><div className="hero-product product-small" /><span className="hero-stamp">01<br /><small>FORM / FUNCTION</small></span></div>
            <div className="hero-note note-bottom"><span><i /> 04 / 12</span><span>SCROLL TO EXPLORE <ArrowDownIcon /></span></div>
          </div>
        </section>

        <section className="stats-row" aria-label="NOVA at a glance"><Stat icon={Zap} value="48h" label="New drops, every week" change="+12%" /><Stat icon={PackageCheck} value="4.9/5" label="Average community rating" change="+0.2" /><Stat icon={Truck} value="30 day" label="No-stress returns" change="100%" /><Stat icon={Clock3} value="2.4k" label="NOVA members" change="growing" /></section>

        <section className="section-block" id="how-it-works">
          <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />BUILT FOR THE EVERYDAY</p><h2>Useful looks good<br /><span>on you.</span></h2></div><p className="section-intro">A tighter edit, selected with intent. Explore essentials that earn their place in your rotation.</p></div>
          <div className="category-grid">{categories.map((category) => <Link key={category.name} href="/products" className={`category-card ${category.className}`}><span className="category-number">{category.number}</span><div><h3>{category.name}</h3><p>{category.count}</p></div><ArrowUpRight size={20} /></Link>)}</div>
        </section>

        <section className="section-block edit-section">
          <div className="section-heading compact"><div><p className="eyebrow"><span className="eyebrow-line" />THE WEEKLY EDIT</p><h2>Small batch.<br /><span>Big rotation.</span></h2></div><Link className="view-all-link" href="/products">View all products <ArrowRight size={15} /></Link></div>
          <div className="edit-toolbar"><div className="tab-list" role="tablist">{tabs.map((tab) => <button type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'selected' : ''} key={tab} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div><div className="filter-list">{['All pieces', 'Footwear', 'Carry', 'Outerwear', 'Objects'].map((category) => <button type="button" className={activeCategory === category ? 'selected' : ''} onClick={() => { setActiveCategory(category); setShowAll(false); }} key={category}>{category}</button>)}</div></div>
          {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <article className="product-tile" key={product.id}><div className="product-media"><ProductArt product={product} /><span className="product-badge">{product.badge ?? 'NOVA pick'}</span><button className={`save-btn ${saved.includes(product.id) ? 'saved' : ''}`} type="button" onClick={() => toggleSaved(product.id)} aria-label={saved.includes(product.id) ? `Remove ${product.name} from saved items` : `Save ${product.name}`}><Heart size={17} fill={saved.includes(product.id) ? 'currentColor' : 'none'} /></button><Link href={`/products/${product.id}`} className="quick-view">Quick view <ArrowUpRight size={14} /></Link></div><div className="product-meta"><div><p className="product-category">{product.category}</p><h3>{product.name}</h3></div><strong>{product.price}</strong></div><div className="product-submeta"><span>{product.color}</span><span className="product-rating"><Star size={12} fill="currentColor" /> {product.rating} <i>({product.reviews})</i></span></div><button type="button" className={`add-btn ${bag.includes(product.id) ? 'in-bag' : ''}`} onClick={() => toggleBag(product.id)}>{bag.includes(product.id) ? <><Check size={15} /> Added to bag</> : <>Add to bag <ArrowRight size={15} /> </>}</button></article>)}</div> : <div className="empty-state">No pieces in this edit yet. <button type="button" onClick={() => setActiveCategory('All pieces')}>View all</button></div>}
          {activeCategory === 'All pieces' && <button className="load-more" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? 'Show less' : 'Load more pieces'} <ChevronRight size={15} className={showAll ? 'rotate-90' : ''} /></button>}
        </section>

        <section className="member-banner"><div className="member-copy"><p className="eyebrow"><span className="eyebrow-line" />NOVA / MEMBERSHIP</p><h2>Good things<br /><em>come around.</em></h2><p>Save your favorites, get early access to weekly drops, and keep every order in one place.</p><Link href="/register" className="button button-light">Join the circle <ArrowUpRight size={16} /></Link></div><div className="member-orbit"><div className="orbit orbit-a" /><div className="orbit orbit-b" /><div className="orbit-core"><Bookmark size={29} /></div><span className="orbit-tag tag-a">EARLY ACCESS</span><span className="orbit-tag tag-b">MEMBER PRICING</span><span className="orbit-tag tag-c">01 / 03</span></div></section>

        <footer className="nova-footer"><div className="footer-brand"><Link href="/" className="nova-logo"><span className="logo-mark">N</span><span>NOVA</span><small>COMMERCE / 01</small></Link><p>Everyday objects, made considered.</p></div><div className="footer-links"><div><p>Explore</p><Link href="/products">Shop all</Link><Link href="/categories">Collections</Link><Link href="/brands">Brands</Link></div><div><p>Help</p><Link href="/profile">Your account</Link><Link href="/cart">Shipping & returns</Link><button type="button"><CircleHelp size={14} /> Contact us</button></div></div><div className="footer-bottom"><span>© 2026 NOVA COMMERCE</span><span>DESIGNED WITH INTENT <i /></span><span>IG&nbsp;&nbsp; / &nbsp;&nbsp;TK&nbsp;&nbsp; / &nbsp;&nbsp;PN</span></div></footer>
      </div>
    </main>
  );
}

function ArrowDownIcon() { return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1v9m0 0 3-3m-3 3L3 7" stroke="currentColor" strokeWidth="1.2" /></svg>; }

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import { ShoppingCart, Star, MagnifyingGlass, SortAscending, Package, Fire } from '@phosphor-icons/react';

/* ─── Skeleton card ─── */
const SkeletonCard = () => (
  <div className="fit-card overflow-hidden">
    <div className="aspect-square shimmer-bg" />
    <div className="p-5 space-y-3">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-5 w-40 rounded" />
      <div className="skeleton h-3 w-full rounded" />
      <div className="skeleton h-3 w-3/4 rounded" />
      <div className="flex justify-between items-center pt-1">
        <div className="skeleton h-4 w-16 rounded" />
        <div className="skeleton h-6 w-16 rounded" />
      </div>
    </div>
  </div>
);

/* ─── Category config ─── */
const CATEGORY_ICONS  = { protein: '🥛', creatine: '⚡', 'pre-workout': '🔥', bcaa: '💧', vitamins: '🌿', 'fat-burner': '🔥' };
const CATEGORY_COLORS = { protein: '#FF3B30', creatine: '#007AFF', 'pre-workout': '#FF6B00', bcaa: '#34C759', vitamins: '#FFCC00', 'fat-burner': '#FF3B30' };

const CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🏋️' },
  { id: 'protein', name: 'Protein', icon: '🥛' },
  { id: 'creatine', name: 'Creatine', icon: '⚡' },
  { id: 'pre-workout', name: 'Pre-Workout', icon: '🔥' },
  { id: 'bcaa', name: 'BCAA', icon: '💧' },
  { id: 'vitamins', name: 'Vitamins', icon: '🌿' },
  { id: 'fat-burner', name: 'Fat Burners', icon: '⚖️' },
];

const GOALS = [
  { id: 'all',             name: 'All Goals' },
  { id: 'muscle_gain',     name: 'Muscle Gain' },
  { id: 'weight_loss',     name: 'Weight Loss' },
  { id: 'strength',        name: 'Strength' },
  { id: 'endurance',       name: 'Endurance' },
  { id: 'general_fitness', name: 'General Fitness' },
];

const SORT_OPTIONS = [
  { id: 'default',   label: 'Featured' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc',label: 'Price: High to Low' },
  { id: 'rating',    label: 'Top Rated' },
  { id: 'reviews',   label: 'Most Reviewed' },
];

/* ─── Product Card ─── */
const ProductCard = ({ product }) => {
  const isBestseller = product.rating >= 4.7;
  const isLowStock = product.stock < 150;
  const catColor = CATEGORY_COLORS[product.category] || '#FF3B30';

  return (
    <Link
      to={`/product/${product.id}`}
      className="fit-card group overflow-hidden block"
      data-testid={`product-card-${product.id}`}
    >
      {/* Image */}
      <div className="aspect-square bg-gradient-to-b from-[#1C1C1E] to-[#141414] overflow-hidden relative">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1593095948071-474c5cc2c129?w=500&q=80'; }}
        />
        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isBestseller && (
            <span className="flex items-center gap-1 bg-[#FFCC00] text-black text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
              <Fire size={10} weight="fill" /> Bestseller
            </span>
          )}
          {isLowStock && (
            <span className="bg-[#FF3B30]/90 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">
              Low Stock
            </span>
          )}
        </div>
        {/* Category badge top right */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-base"
          style={{ background: `${catColor}25`, border: `1px solid ${catColor}40` }}>
          {CATEGORY_ICONS[product.category] || '💊'}
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: catColor }}>
          {product.category}
        </div>
        <h3 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight mb-2 leading-tight">
          {product.name}
        </h3>
        <p className="text-xs text-[#A1A1AA] mb-3 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Goal tags */}
        {product.goals?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.goals.slice(0, 2).map(g => (
              <span key={g} className="badge-zinc text-[9px]">{g.replace('_', ' ')}</span>
            ))}
          </div>
        )}

        {/* Rating + Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star size={14} weight="fill" className="text-[#FFCC00]" />
            <span className="text-sm font-bold">{product.rating}</span>
            <span className="text-xs text-[#A1A1AA]">({product.reviews_count})</span>
          </div>
          <div className="font-['Barlow_Condensed'] font-black text-2xl text-[#FF3B30]">
            ${product.price.toFixed(2)}
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ─── Shop Page ─── */
const ShopPage = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [goal, setGoal] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('default');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/products`;
      const params = [];
      if (category !== 'all') params.push(`category=${category}`);
      if (goal !== 'all')     params.push(`goal=${goal}`);
      if (params.length > 0)  url += '?' + params.join('&');
      const res = await fetch(url);
      if (res.ok) setProducts(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [category, goal]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /* Client-side search + sort */
  const displayed = products
    .filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.category.includes(q);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':  return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'rating':     return b.rating - a.rating;
        case 'reviews':    return b.reviews_count - a.reviews_count;
        default:           return 0;
      }
    });

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="section-label">Supplements</div>
          <h1 className="section-title text-4xl sm:text-5xl mb-2" data-testid="shop-title">
            Supplement Store
          </h1>
          <p className="text-[#A1A1AA]">Premium supplements filtered for your fitness goal</p>
        </div>

        {/* Search + Sort Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Search protein, creatine, BCAA..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="fit-input pl-10 w-full"
            />
          </div>
          <div className="relative">
            <SortAscending size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="fit-input pl-10 pr-10 appearance-none cursor-pointer min-w-[200px]">
              {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none" data-testid="category-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-bold tracking-wide uppercase text-xs whitespace-nowrap transition-all flex-shrink-0 border ${
                category === cat.id
                  ? 'bg-[#FF3B30] border-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/20'
                  : 'bg-[#141414] text-[#A1A1AA] border-white/10 hover:border-[#FF3B30]/40 hover:text-white'
              }`}
              data-testid={`category-${cat.id}`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Goal Filter */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2" data-testid="goal-filters">
          <span className="text-xs text-[#A1A1AA] flex-shrink-0 font-medium">Goal:</span>
          {GOALS.map(g => (
            <button
              key={g.id}
              onClick={() => setGoal(g.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide uppercase whitespace-nowrap transition-all flex-shrink-0 border ${
                goal === g.id
                  ? 'bg-[#007AFF] border-[#007AFF] text-white'
                  : 'bg-[#1C1C1E] text-[#A1A1AA] border-white/10 hover:border-[#007AFF]/40'
              }`}
              data-testid={`goal-filter-${g.id}`}
            >
              {g.name}
            </button>
          ))}
        </div>

        {/* Result count */}
        {!loading && (
          <div className="text-sm text-[#A1A1AA] mb-5">
            Showing <span className="text-white font-bold">{displayed.length}</span> products
            {search && <span> for "<span className="text-[#FF3B30]">{search}</span>"</span>}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="shop-loading">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="fit-card p-16 text-center" data-testid="no-products">
            <Package size={64} className="mx-auto mb-4 text-[#A1A1AA] opacity-40" />
            <h2 className="section-title text-2xl mb-2">No Products Found</h2>
            <p className="text-[#A1A1AA] mb-6">Try adjusting your filters or clear your search</p>
            <button onClick={() => { setCategory('all'); setGoal('all'); setSearch(''); }} className="btn-primary px-5 py-2.5 rounded-md text-sm">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger" data-testid="products-grid">
            {displayed.map(product => (
              <div key={product.id} className="animate-fade-up">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopPage;

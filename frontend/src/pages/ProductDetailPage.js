import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import {
  ShoppingCart, Star, Package, ArrowLeft, Plus, Minus, Truck, ShieldCheck,
  ArrowCounterClockwise, Fire, Lightning, CheckCircle
} from '@phosphor-icons/react';

/* ─── Trust badges ─── */
const TRUST = [
  { icon: ShieldCheck, label: 'Lab Tested', sub: 'Third-party verified', color: '#34C759' },
  { icon: Truck,       label: 'Free Shipping', sub: 'Orders over $50',    color: '#007AFF' },
  { icon: ArrowCounterClockwise, label: '30-Day Returns', sub: 'No questions asked', color: '#FFCC00' },
];

/* ─── Category nutrition info ─── */
const NUTRITION_INFO = {
  protein:      { serving: '1 Scoop (30–35g)', calories: 120, protein: '25g', carbs: '3g', fat: '2g' },
  creatine:     { serving: '1 Scoop (5g)',      calories: 0,   protein: '0g',  carbs: '0g', fat: '0g', note: 'Creatine Monohydrate 5000mg' },
  'pre-workout':{ serving: '1 Scoop (10–15g)',  calories: 20,  protein: '0g',  carbs: '4g', fat: '0g', note: 'Caffeine 200–350mg, Citrulline 4–8g' },
  bcaa:         { serving: '1 Scoop (8–10g)',   calories: 15,  protein: '5g',  carbs: '2g', fat: '0g', note: 'BCAA 2:1:1 (Leu/Ile/Val)' },
  vitamins:     { serving: '1–2 Capsules',      calories: 5,   protein: '0g',  carbs: '1g', fat: '0g', note: 'Essential vitamins & minerals' },
  'fat-burner': { serving: '1–2 Capsules',      calories: 10,  protein: '0g',  carbs: '2g', fat: '0g', note: 'Thermogenic blend' },
};

/* ─── Rating Distribution ─── */
const RatingBar = ({ star, count, total }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className="text-[#A1A1AA] w-4 text-right">{star}</span>
    <Star size={11} weight="fill" className="text-[#FFCC00] flex-shrink-0" />
    <div className="flex-1 h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
      <div className="h-full bg-[#FFCC00] rounded-full transition-all duration-700"
           style={{ width: total ? `${(count / total) * 100}%` : '0%' }} />
    </div>
    <span className="text-[#A1A1AA] w-6">{count}</span>
  </div>
);

/* ─── Product Detail Page ─── */
const ProductDetailPage = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  const fetchProductDetails = useCallback(async () => {
    try {
      const [productRes, reviewsRes] = await Promise.all([
        fetch(`${API}/products/${id}`),
        fetch(`${API}/reviews/${id}`),
      ]);
      if (productRes.ok) setProduct(await productRes.json());
      if (reviewsRes.ok) setReviews(await reviewsRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchProductDetails(); }, [fetchProductDetails]);

  const addToCart = async () => {
    if (!token) { navigate('/login'); return; }
    setAddingToCart(true);
    try {
      const res = await fetch(`${API}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product_id: id, quantity }),
      });
      if (res.ok) {
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 3000);
      }
    } catch {}
    setAddingToCart(false);
  };

  /* Loading skeleton */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="skeleton aspect-square rounded-xl" />
            <div className="space-y-4">
              <div className="skeleton h-4 w-24 rounded" />
              <div className="skeleton h-10 w-3/4 rounded" />
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-8 w-28 rounded" />
              <div className="skeleton h-20 w-full rounded" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <Package size={64} className="mx-auto mb-4 text-[#A1A1AA] opacity-40" />
          <h2 className="section-title text-3xl mb-2">Product Not Found</h2>
          <Link to="/shop" className="btn-primary px-5 py-2.5 rounded-md text-sm mt-4 inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const nutrition = NUTRITION_INFO[product.category] || NUTRITION_INFO.vitamins;

  /* Simulated rating distribution */
  const distribution = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: s === 5 ? Math.floor(product.reviews_count * 0.62) :
           s === 4 ? Math.floor(product.reviews_count * 0.22) :
           s === 3 ? Math.floor(product.reviews_count * 0.10) :
           s === 2 ? Math.floor(product.reviews_count * 0.04) :
                     Math.floor(product.reviews_count * 0.02),
  }));

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#A1A1AA] mb-6">
          <Link to="/shop" className="hover:text-white transition-colors flex items-center gap-1">
            <ArrowLeft size={14} /> Shop
          </Link>
          <span>/</span>
          <span className="capitalize">{product.category}</span>
          <span>/</span>
          <span className="text-white truncate max-w-[200px]">{product.name}</span>
        </div>

        {/* ─── Product Main Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">

          {/* Image */}
          <div className="relative bg-gradient-to-b from-[#1C1C1E] to-[#111] border border-white/10 rounded-2xl overflow-hidden aspect-square group" data-testid="product-image">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1593095948071-474c5cc2c129?w=800&q=80'; }}
            />
            {/* Category badge */}
            <div className="absolute top-4 left-4 bg-[#FF3B30] text-white text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg">
              {product.category}
            </div>
            {product.rating >= 4.7 && (
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-[#FFCC00] text-black text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
                <Fire size={10} weight="fill" /> Bestseller
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col" data-testid="product-info">

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={18} weight={i < Math.floor(product.rating) ? 'fill' : 'regular'} className="text-[#FFCC00]" />
                ))}
              </div>
              <span className="font-bold">{product.rating}</span>
              <span className="text-[#A1A1AA] text-sm">({product.reviews_count} reviews)</span>
            </div>

            <h1 className="font-['Barlow_Condensed'] font-black text-4xl sm:text-5xl uppercase tracking-tight mb-4 leading-tight" data-testid="product-name">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-end gap-3 mb-5">
              <div className="font-['Barlow_Condensed'] font-black text-5xl text-[#FF3B30]" data-testid="product-price">
                ${product.price.toFixed(2)}
              </div>
            </div>

            <p className="text-[#A1A1AA] mb-6 leading-relaxed" data-testid="product-description">
              {product.description}
            </p>

            {/* Goals */}
            {product.goals?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.goals.map(g => <span key={g} className="badge-blue">{g.replace('_', ' ')}</span>)}
              </div>
            )}

            {/* Qty + Add to Cart */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center border border-white/15 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-12 flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-all">
                  <Minus size={18} />
                </button>
                <div className="w-12 h-12 flex items-center justify-center font-black text-lg select-none">{quantity}</div>
                <button onClick={() => setQuantity(q => Math.min(product.stock, q + 1))} className="w-12 h-12 flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-all">
                  <Plus size={18} />
                </button>
              </div>
              <button
                onClick={addToCart}
                disabled={addingToCart}
                className="flex-1 btn-primary py-3.5 rounded-xl text-sm flex items-center justify-center gap-2"
                data-testid="add-to-cart-button"
              >
                {cartSuccess ? (
                  <><CheckCircle size={18} weight="fill" /> Added to Cart!</>
                ) : addingToCart ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                ) : (
                  <><ShoppingCart size={18} weight="fill" /> Add to Cart</>
                )}
              </button>
            </div>

            {/* Stock indicator */}
            <div className="flex items-center gap-2 text-sm text-[#34C759] mb-6">
              <Package size={16} weight="fill" />
              <span className="font-medium">{product.stock} in stock</span>
              <span className="text-[#A1A1AA]">· Ships within 2 business days</span>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-5 border-t border-white/10">
              {TRUST.map(t => (
                <div key={t.label} className="flex flex-col items-center text-center gap-1.5 p-3 rounded-xl bg-white/3">
                  <t.icon size={22} weight="fill" style={{ color: t.color }} />
                  <div className="text-xs font-bold">{t.label}</div>
                  <div className="text-[9px] text-[#A1A1AA]">{t.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Nutrition + Reviews Row ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Nutrition Facts */}
          <div className="fit-card p-6">
            <h2 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight mb-4 flex items-center gap-2">
              <Lightning size={20} weight="fill" className="text-[#FFCC00]" /> Nutrition Facts
            </h2>
            <div className="text-xs text-[#A1A1AA] mb-3 pb-3 border-b border-white/10">
              Serving Size: {nutrition.serving}
            </div>
            {[
              { label: 'Calories', val: nutrition.calories, unit: 'kcal', color: '#FF3B30' },
              { label: 'Protein',  val: nutrition.protein,  unit: '',     color: '#34C759' },
              { label: 'Carbs',    val: nutrition.carbs,    unit: '',     color: '#007AFF' },
              { label: 'Fat',      val: nutrition.fat,      unit: '',     color: '#FFCC00' },
            ].map(n => (
              <div key={n.label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 text-sm">
                <span className="text-[#A1A1AA]">{n.label}</span>
                <span className="font-black" style={{ color: n.color }}>{n.val}{n.unit}</span>
              </div>
            ))}
            {nutrition.note && (
              <div className="mt-3 p-2.5 bg-white/5 rounded-lg text-[10px] text-[#A1A1AA]">
                📌 {nutrition.note}
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="lg:col-span-2 fit-card p-6" data-testid="reviews-section">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight">Customer Reviews</h2>
                <p className="text-[#A1A1AA] text-sm">{product.reviews_count} verified reviews</p>
              </div>
              <div className="text-center">
                <div className="font-['Barlow_Condensed'] font-black text-4xl text-[#FFCC00]">{product.rating}</div>
                <div className="flex items-center gap-0.5 justify-center">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} weight="fill" className="text-[#FFCC00]" />)}
                </div>
              </div>
            </div>

            {/* Rating bars */}
            <div className="space-y-1.5 mb-5 pb-5 border-b border-white/10">
              {distribution.map(d => <RatingBar key={d.star} star={d.star} count={d.count} total={product.reviews_count} />)}
            </div>

            {/* Review list */}
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {reviews.map((review, i) => (
                <div key={review.id} className="bg-white/3 rounded-xl p-4 border border-white/5" data-testid={`review-${i}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#FF3B30]/15 border border-[#FF3B30]/20 flex items-center justify-center text-[#FF3B30] font-black text-sm">
                        {review.user_name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{review.user_name}</div>
                        <div className="text-[10px] text-[#A1A1AA]">{new Date(review.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => <Star key={i} size={13} weight={i < review.rating ? 'fill' : 'regular'} className="text-[#FFCC00]" />)}
                    </div>
                  </div>
                  <p className="text-sm text-[#A1A1AA] leading-relaxed">{review.comment}</p>
                </div>
              ))}
              {reviews.length === 0 && (
                <div className="text-center py-8 text-[#A1A1AA]">
                  <Star size={40} className="mx-auto mb-3 opacity-25" />
                  <p className="text-sm">No reviews yet. Be the first to review this product!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Back to Shop ─── */}
        <div className="text-center pb-8">
          <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white transition-colors">
            <ArrowLeft size={16} /> Continue Shopping
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ProductDetailPage;

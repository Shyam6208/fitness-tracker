import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import { ShoppingCart, Trash, Plus, Minus } from '@phosphor-icons/react';

const CartPage = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch(`${API}/cart`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCartItems(data);
      }
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (productId, newQuantity) => {
    try {
      const response = await fetch(`${API}/cart/${productId}?quantity=${newQuantity}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const removeItem = async (productId) => {
    try {
      const response = await fetch(`${API}/cart/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error('Failed to remove item:', error);
    }
  };

  const checkout = async () => {
    setCheckingOut(true);
    try {
      const originUrl = window.location.origin;
      const response = await fetch(`${API}/checkout/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ origin_url: originUrl })
      });

      const data = await response.json();
      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert('Checkout failed. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Network error. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const total = cartItems.reduce((sum, item) => {
    return sum + (item.product ? item.product.price * item.quantity : 0);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center text-[#A1A1AA]">Loading cart...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-['Barlow_Condensed'] font-black text-4xl uppercase tracking-tight mb-2" data-testid="cart-title">
            Shopping Cart
          </h1>
          <p className="text-[#A1A1AA]">{cartItems.length} items in your cart</p>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-[#141414] border border-white/10 rounded-sm p-12 text-center" data-testid="empty-cart">
            <ShoppingCart size={64} className="mx-auto mb-4 text-[#A1A1AA]" />
            <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-2">
              Your cart is empty
            </h2>
            <p className="text-[#A1A1AA] mb-6">Add some supplements to get started</p>
            <button
              onClick={() => navigate('/shop')}
              className="bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95"
              data-testid="shop-now-button"
            >
              Shop Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4" data-testid="cart-items">
              {cartItems.map((item, index) => (
                item.product && (
                  <div key={item.product_id} className="bg-[#141414] border border-white/10 rounded-sm p-6 flex gap-6" data-testid={`cart-item-${index}`}>
                    <div className="w-24 h-24 bg-[#1C1C1E] rounded-sm overflow-hidden flex-shrink-0">
                      <img 
                        src={item.product.image_url} 
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1593095948071-474c5cc2c129?w=200&q=80';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight mb-1">
                        {item.product.name}
                      </h3>
                      <div className="text-[#A1A1AA] text-sm mb-3">{item.product.category}</div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="bg-[#1C1C1E] border border-white/10 p-2 rounded-sm hover:border-white/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid={`decrease-quantity-${index}`}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="font-bold w-8 text-center" data-testid={`item-quantity-${index}`}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="bg-[#1C1C1E] border border-white/10 p-2 rounded-sm hover:border-white/30 transition-colors"
                          data-testid={`increase-quantity-${index}`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#FF3B30] mb-3">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="text-[#A1A1AA] hover:text-[#FF3B30] transition-colors"
                        data-testid={`remove-item-${index}`}
                      >
                        <Trash size={20} />
                      </button>
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-[#141414] border border-white/10 rounded-sm p-6 sticky top-24" data-testid="order-summary">
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-6">
                  Order Summary
                </h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Subtotal</span>
                    <span data-testid="subtotal">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Shipping</span>
                    <span className="text-[#34C759]">FREE</span>
                  </div>
                  <div className="border-t border-white/10 pt-3 flex justify-between text-2xl font-black">
                    <span>Total</span>
                    <span className="text-[#FF3B30]" data-testid="total">${total.toFixed(2)}</span>
                  </div>
                </div>
                <button
                  onClick={checkout}
                  disabled={checkingOut}
                  className="w-full bg-[#FF3B30] text-white px-6 py-4 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="checkout-button"
                >
                  {checkingOut ? 'Processing...' : 'Proceed to Checkout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartPage;

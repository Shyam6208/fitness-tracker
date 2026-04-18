import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import { Package, CheckCircle } from '@phosphor-icons/react';

const OrdersPage = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-['Barlow_Condensed'] font-black text-4xl uppercase tracking-tight mb-2" data-testid="orders-title">
            My Orders
          </h1>
          <p className="text-[#A1A1AA]">View your order history</p>
        </div>

        {(() => {
          if (loading) {
            return <div className="text-center py-20 text-[#A1A1AA]">Loading orders...</div>;
          }
          if (orders.length === 0) {
            return (
              <div className="bg-[#141414] border border-white/10 rounded-sm p-12 text-center" data-testid="no-orders">
                <Package size={64} className="mx-auto mb-4 text-[#A1A1AA]" />
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-2">
                  No Orders Yet
                </h2>
                <p className="text-[#A1A1AA]">Your order history will appear here</p>
              </div>
            );
          }
          return (
            <div className="space-y-6" data-testid="orders-list">
              {orders.map((order, index) => (
              <div key={order.id} className="bg-[#141414] border border-white/10 rounded-sm p-6" data-testid={`order-${index}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight mb-1">
                      Order #{order.id.slice(0, 8)}
                    </div>
                    <div className="text-sm text-[#A1A1AA]">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#FF3B30]">${order.total.toFixed(2)}</div>
                    <div className="flex items-center gap-2 text-[#34C759] text-sm font-bold mt-1">
                      <CheckCircle size={16} weight="fill" />
                      {order.status}
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="font-medium mb-3">Items:</div>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={`${order.id}-${item.name}`} className="flex justify-between text-sm" data-testid={`order-item-${order.id}-${item.name}`}>
                        <span className="text-[#A1A1AA]">{item.name} x {item.quantity}</span>
                        <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          );
        })()}
      </main>
    </div>
  );
};

export default OrdersPage;

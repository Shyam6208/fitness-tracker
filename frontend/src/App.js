import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getRedirectResult, onAuthStateChanged, signOut } from 'firebase/auth';
import '@/App.css';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import Dashboard from '@/pages/Dashboard';
import TrainingPage from '@/pages/TrainingPage';
import ChatPage from '@/pages/ChatPage';
import ShopPage from '@/pages/ShopPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import CheckoutSuccessPage from '@/pages/CheckoutSuccessPage';
import OrdersPage from '@/pages/OrdersPage';
import ProfilePage from '@/pages/ProfilePage';
import { auth } from '@/lib/firebase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
export const API = `${BACKEND_URL}/api`;

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// API helper for protected endpoints.
export const authFetch = async (url, options = {}, token) => {
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  return fetch(url, { ...options, headers });
};

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const fetchUserProfile = useCallback(async (idToken) => {
    try {
      const response = await fetch(`${API}/profile`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      if (response.ok) {
        const profileData = await response.json();
        setUser(profileData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setToken(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        await fetchUserProfile(idToken);
      } catch (error) {
        console.error('Failed to read Firebase auth state:', error);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);

  useEffect(() => {
    let active = true;

    const hydrateRedirectAuth = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!active || !result?.user) {
          return;
        }

        const idToken = await result.user.getIdToken();
        if (!active) {
          return;
        }
        setToken(idToken);
        await fetchUserProfile(idToken);
      } catch (error) {
        console.error('Google redirect sign-in failed:', error);
      }
    };

    hydrateRedirectAuth();

    return () => {
      active = false;
    };
  }, [fetchUserProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
          <div className="text-[#A1A1AA] text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, logout, setUser }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!token ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/training" element={token ? <TrainingPage /> : <Navigate to="/login" />} />
          <Route path="/chat" element={token ? <ChatPage /> : <Navigate to="/login" />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={token ? <CartPage /> : <Navigate to="/login" />} />
          <Route path="/checkout/success" element={token ? <CheckoutSuccessPage /> : <Navigate to="/login" />} />
          <Route path="/orders" element={token ? <OrdersPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={token ? <ProfilePage /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;

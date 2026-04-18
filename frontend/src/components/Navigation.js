import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, API } from '@/App';
import {
  ShoppingCart, User, Barbell, Lightning, ChartLine,
  Package, SignOut, List, X, Fire, Gear, CaretDown
} from '@phosphor-icons/react';

/* ─── Nav link with active state ─── */
const NavLink = ({ to, icon: Icon, label, testId, onClick }) => {
  const { pathname } = useLocation();
  const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-1.5 text-sm font-medium transition-all px-2 py-1 rounded-md
        ${isActive
          ? 'text-[#FF3B30]'
          : 'text-[#A1A1AA] hover:text-white'}`}
      data-testid={testId}
    >
      <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
      <span>{label}</span>
    </Link>
  );
};

/* ─── Cart badge ─── */
const CartBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white text-[10px] font-black
                     w-4 h-4 rounded-full flex items-center justify-center leading-none animate-pulse-red">
      {count > 9 ? '9+' : count}
    </span>
  );
};

/* ─── Authenticated nav ─── */
const AuthenticatedNav = ({ user, onLogout, cartCount, onMobileClick, dropdownOpen, setDropdownOpen }) => (
  <>
    <div className="flex items-center gap-1 sm:gap-4">
      <NavLink to="/dashboard" icon={ChartLine} label="Dashboard" testId="nav-dashboard-link" onClick={onMobileClick} />
      <NavLink to="/training"  icon={Barbell}   label="Training"  testId="nav-training-link"  onClick={onMobileClick} />
      <NavLink to="/shop"      icon={Package}   label="Shop"      testId="nav-shop-link"       onClick={onMobileClick} />

      {/* Cart with badge */}
      <Link to="/cart" onClick={onMobileClick} className="relative flex items-center gap-1.5 text-sm font-medium text-[#A1A1AA] hover:text-white px-2 py-1 rounded-md transition-all" data-testid="nav-cart-link">
        <ShoppingCart size={18} />
        <span className="hidden lg:inline">Cart</span>
        <CartBadge count={cartCount} />
      </Link>
    </div>

    {/* User Profile Dropdown (Desktop) */}
    <div className="relative hidden md:block">
      <button 
        onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
        className="flex items-center gap-2 pl-3 py-1.5 pr-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
      >
        <div className="w-6 h-6 rounded-full bg-[#FF3B30] flex items-center justify-center text-white text-[10px] font-black">
          {user?.name?.[0] || 'U'}
        </div>
        <span className="text-sm font-medium text-white truncate max-w-[100px]">
          {user?.name?.split(' ')[0] || 'User'}
        </span>
        <CaretDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#141414] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in animate-slide-down">
          <div className="px-4 py-2 border-b border-white/5 mb-1">
            <p className="text-xs text-[#A1A1AA] font-medium truncate">{user?.email}</p>
          </div>
          <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-colors">
            <User size={16} /> Profile
          </Link>
          <Link to="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[#A1A1AA] hover:text-white hover:bg-white/5 transition-colors">
            <Gear size={16} /> Settings
          </Link>
          <div className="h-px bg-white/5 my-1" />
          <button 
            onClick={() => { onLogout(); setDropdownOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors"
          >
            <SignOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>

    {/* Mobile Specific Links (Handled by parent for drawer) */}
    <div className="md:hidden flex flex-col gap-3 w-full border-t border-white/5 pt-3 mt-3">
        <NavLink to="/profile" icon={User} label="Profile" onClick={onMobileClick} />
        <button onClick={onLogout} className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-[#FF3B30]">
           <SignOut size={18} /> Logout
        </button>
    </div>
  </>
);

/* ─── Unauthenticated nav ─── */
const UnauthenticatedNav = ({ onMobileClick }) => (
  <>
    <NavLink to="/shop" icon={Package} label="Shop" testId="nav-shop-link" onClick={onMobileClick} />
    <Link
      to="/login"
      onClick={onMobileClick}
      className="text-sm font-medium text-[#A1A1AA] hover:text-white px-2 py-1 transition-all"
      data-testid="nav-login-link"
    >
      Login
    </Link>
    <Link
      to="/register"
      onClick={onMobileClick}
      className="bg-[#FF3B30] text-white px-4 py-2 rounded-md font-bold tracking-wide uppercase text-sm hover:bg-[#FF6B63] transition-all active:scale-95"
      data-testid="nav-register-link"
    >
      Get Started
    </Link>
  </>
);

/* ─── Main Navigation ─── */
const Navigation = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  /* Fetch cart count for badge */
  const fetchCartCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/cart`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCartCount(data.reduce((s, i) => s + i.quantity, 0));
      }
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    fetchCartCount();
    /* Refresh every 30s */
    const id = setInterval(fetchCartCount, 30000);
    return () => clearInterval(id);
  }, [fetchCartCount]);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* Close dropdown on click outside */
  useEffect(() => {
    const handleOutside = () => setDropdownOpen(false);
    if (dropdownOpen) window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [dropdownOpen]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/');
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [logout, navigate]);

  return (
    <header className="sticky top-0 z-50 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0" data-testid="logo-link">
          <div className="w-8 h-8 rounded-lg bg-[#FF3B30] flex items-center justify-center">
            <Lightning size={20} weight="fill" className="text-white" />
          </div>
          <span className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight">
            FitPro <span className="text-[#FF3B30]">Market</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-4">
          {token ? (
            <AuthenticatedNav 
              user={user} 
              onLogout={handleLogout} 
              cartCount={cartCount} 
              onMobileClick={null}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
            />
          ) : (
            <UnauthenticatedNav onMobileClick={null} />
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-[#A1A1AA] hover:text-white transition-colors"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <List size={24} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0A0A0A] border-t border-white/10 px-4 py-4 flex flex-col gap-3 animate-fade-in">
          {token ? (
            <AuthenticatedNav user={user} onLogout={handleLogout} cartCount={cartCount} onMobileClick={() => setMobileOpen(false)} />
          ) : (
            <UnauthenticatedNav onMobileClick={() => setMobileOpen(false)} />
          )}
        </div>
      )}
    </header>
  );
};

export default Navigation;

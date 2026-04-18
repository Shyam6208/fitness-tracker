import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lightning, Barbell, ShoppingCart, Brain, ChartLine,
  ArrowRight, Star, CheckCircle, Fire, Gauge, Heartbeat
} from '@phosphor-icons/react';

/* ─── Stat counter component ─── */
const StatCounter = ({ stat, active }) => {
  const count = useCounter(
    stat.isDecimal ? Math.round(stat.value * 10) : stat.value,
    1800,
    active
  );
  const display = stat.isDecimal ? (count / 10).toFixed(1) : count.toLocaleString();
  return (
    <div className="text-center animate-fade-up">
      <div className="font-['Barlow_Condensed'] font-black text-4xl sm:text-5xl text-white mb-1">
        {display}{stat.suffix}
      </div>
      <div className="text-[#A1A1AA] text-sm">{stat.label}</div>
    </div>
  );
};


const useCounter = (target, duration = 1500, start = false) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setVal(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return val;
};

const STATS = [
  { value: 12000, label: 'Active Athletes', suffix: '+' },
  { value: 90,    label: 'Premium Products', suffix: '+' },
  { value: 4.9,   label: 'Average Rating', suffix: '★', isDecimal: true },
  { value: 24,    label: 'AI Coach Support', suffix: '/7' },
];

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Plans',
    desc: 'Personalized workout routines built by Claude AI — adjusted to your goals, experience, and schedule.',
    color: 'text-[#FF3B30]',
    bg: 'bg-[#FF3B30]/10 border-[#FF3B30]/20',
  },
  {
    icon: Gauge,
    title: 'Smart Progress Tracking',
    desc: 'Log every session, track your weight trend, and visualize your streak to stay accountable.',
    color: 'text-[#007AFF]',
    bg: 'bg-[#007AFF]/10 border-[#007AFF]/20',
  },
  {
    icon: ShoppingCart,
    title: 'Premium Supplement Store',
    desc: 'Protein, creatine, pre-workout, BCAAs, vitamins — all filtered by YOUR fitness goal.',
    color: 'text-[#34C759]',
    bg: 'bg-[#34C759]/10 border-[#34C759]/20',
  },
  {
    icon: Heartbeat,
    title: 'BMI & Macro Calculator',
    desc: 'Know your numbers. Get real-time TDEE, BMI, and macro splits based on your body stats.',
    color: 'text-[#FFCC00]',
    bg: 'bg-[#FFCC00]/10 border-[#FFCC00]/20',
  },
];

const STEPS = [
  { num: '01', title: 'Create Your Profile', desc: 'Set your goal, weight, height, and experience level.' },
  { num: '02', title: 'Generate Your Plan', desc: 'AI builds a personalized weekly workout + diet plan instantly.' },
  { num: '03', title: 'Train & Track', desc: 'Log sessions, monitor progress, and reorder supplements you love.' },
];

const TESTIMONIALS = [
  { name: 'Marcus T.', goal: 'Muscle Gain', text: 'The AI plan had me adding 15lbs to my bench in 6 weeks. The supplement recommendations are on point.', stars: 5 },
  { name: 'Priya S.', goal: 'Weight Loss', text: 'Finally a platform that connects my training, diet and supplements in one place. Lost 12kg in 4 months!', stars: 5 },
  { name: 'Jake R.', goal: 'Strength', text: 'The macro calculator alone is worth signing up. Paired with the creatine stack suggestion — game changer.', stars: 5 },
];

const LandingPage = () => {
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] overflow-x-hidden">
      {/* ─── Header ─────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/10">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-8 h-8 rounded-lg bg-[#FF3B30] flex items-center justify-center">
              <Lightning size={18} weight="fill" className="text-white" />
            </div>
            <span className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight">
              FitPro <span className="text-[#FF3B30]">Market</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/shop" className="text-sm text-[#A1A1AA] hover:text-white transition-colors hidden sm:block" data-testid="header-shop-link">
              Shop
            </Link>
            <Link to="/login" className="text-sm text-white hover:text-[#A1A1AA] transition-colors" data-testid="header-login-link">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#FF3B30] text-white px-4 py-2 rounded-md font-bold tracking-wide uppercase text-sm hover:bg-[#FF6B63] transition-all active:scale-95"
              data-testid="header-register-button"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* ─── Hero ──────────────────────────────── */}
      <section className="relative pt-28 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1600&q=80"
            alt="Gym background"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/60 via-[#0A0A0A]/40 to-[#0A0A0A]" />
        </div>

        {/* Red ambient glow */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-[#FF3B30]/10 blur-3xl z-0 pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-64 h-64 rounded-full bg-[#007AFF]/10 blur-3xl z-0 pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 animate-fade-up">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-[#FF3B30]/10 border border-[#FF3B30]/30 px-3 py-1 rounded-full mb-6" data-testid="hero-label">
              <Fire size={14} weight="fill" className="text-[#FF3B30]" />
              <span className="text-[#FF3B30] text-xs tracking-[0.15em] uppercase font-bold">AI-Powered Fitness Platform</span>
            </div>
            <h1
              className="font-['Barlow_Condensed'] font-black text-6xl sm:text-7xl md:text-8xl uppercase tracking-tight leading-[0.9] mb-6"
              data-testid="hero-title"
            >
              Train Smarter.<br />
              <span className="text-[#FF3B30]">Fuel Better.</span>
            </h1>
            <p className="text-lg sm:text-xl text-[#A1A1AA] mb-8 max-w-2xl leading-relaxed" data-testid="hero-description">
              AI-personalized workout plans, macro tracking, and premium supplements — all in one platform built for serious gym rats.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="bg-[#FF3B30] text-white px-8 py-4 rounded-md font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 flex items-center gap-2 text-sm"
                data-testid="hero-cta-button"
              >
                <span>Start Free Today</span>
                <ArrowRight size={18} weight="bold" />
              </Link>
              <Link
                to="/shop"
                className="bg-white/5 text-white border border-white/20 hover:border-white/40 hover:bg-white/10 px-8 py-4 rounded-md font-bold tracking-wide uppercase transition-all active:scale-95 text-sm"
                data-testid="hero-shop-button"
              >
                Browse Supplements
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center gap-6 mt-10">
              {['No credit card', 'Cancel anytime', 'Free AI plans'].map(t => (
                <div key={t} className="flex items-center gap-2 text-sm text-[#A1A1AA]">
                  <CheckCircle size={16} weight="fill" className="text-[#34C759]" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────── */}
      <section ref={statsRef} className="py-16 px-4 sm:px-6 bg-[#141414] border-y border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 stagger">
          {STATS.map((stat) => (
            <StatCounter key={stat.label} stat={stat} active={statsVisible} />
          ))}
        </div>
      </section>


      {/* ─── Features ──────────────────────────── */}
      <section className="py-20 px-4 sm:px-6" data-testid="features-section">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label">Platform Features</div>
            <h2 className="section-title text-4xl sm:text-5xl mb-4">Everything You Need To Win</h2>
            <p className="text-[#A1A1AA] max-w-xl mx-auto">Built for athletes, by athletes. Stop juggling 5 apps — FitPro Market handles it all.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {FEATURES.map((f) => (
              <div key={f.title} className={`fit-card p-6 border ${f.bg} animate-fade-up`}>
                <div className={`w-12 h-12 rounded-xl border ${f.bg} flex items-center justify-center mb-5`}>
                  <f.icon size={28} weight="fill" className={f.color} />
                </div>
                <h3 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight mb-2">{f.title}</h3>
                <p className="text-[#A1A1AA] text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-[#141414] border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label">How It Works</div>
            <h2 className="section-title text-4xl sm:text-5xl">3 Steps To Peak Performance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative flex flex-col items-center text-center animate-fade-up">
                <div className="font-['Barlow_Condensed'] font-black text-7xl text-[#FF3B30]/20 leading-none mb-3">{step.num}</div>
                <div className="w-12 h-12 rounded-full bg-[#FF3B30] flex items-center justify-center text-white font-black text-lg mb-4">
                  {i + 1}
                </div>
                <h3 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-3">{step.title}</h3>
                <p className="text-[#A1A1AA]">{step.desc}</p>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+80px)] w-full h-0.5 bg-gradient-to-r from-[#FF3B30]/40 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ──────────────────────── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <div className="section-label">What Athletes Say</div>
            <h2 className="section-title text-4xl sm:text-5xl">Real Results, Real People</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="fit-card p-6 animate-fade-up">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} weight="fill" className="text-[#FFCC00]" />
                  ))}
                </div>
                <p className="text-[#A1A1AA] mb-5 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF3B30]/20 border border-[#FF3B30]/30 flex items-center justify-center font-bold text-[#FF3B30]">
                    {t.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{t.name}</div>
                    <div className="text-xs text-[#A1A1AA]">{t.goal}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ────────────────────────── */}
      <section className="py-20 px-4 sm:px-6 bg-gradient-to-r from-[#FF3B30]/10 via-[#141414] to-[#007AFF]/10 border-y border-white/10" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="section-title text-5xl sm:text-6xl mb-4">Ready To Transform?</h2>
          <p className="text-xl text-[#A1A1AA] mb-8">Join 12,000+ athletes using AI to reach peak performance. Free to start.</p>
          <Link
            to="/register"
            className="inline-flex bg-[#FF3B30] text-white px-10 py-5 rounded-md font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 items-center gap-2"
            data-testid="cta-button"
          >
            <span>Create Free Account</span>
            <ArrowRight size={20} weight="bold" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────── */}
      <footer className="bg-[#0A0A0A] border-t border-white/10 py-10 px-4 sm:px-6" data-testid="footer">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[#A1A1AA] text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#FF3B30] flex items-center justify-center">
              <Lightning size={14} weight="fill" className="text-white" />
            </div>
            <span className="font-['Barlow_Condensed'] font-black uppercase text-white tracking-tight">FitPro Market</span>
          </div>
          <p>© 2026 FitPro Market. Built for gym rats, by gym rats.</p>
          <div className="flex items-center gap-4">
            <Link to="/shop" className="hover:text-white transition-colors">Shop</Link>
            <Link to="/login" className="hover:text-white transition-colors">Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

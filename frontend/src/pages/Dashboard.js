import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import {
  Barbell, ShoppingCart, Package, Brain, ChartLine, ChatText,
  Fire, TrendUp, Lightning, ArrowRight, CheckCircle, CalendarCheck,
  Scales, Target, Clock
} from '@phosphor-icons/react';

/* ─── Greeting by time of day ─── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* ─── BMI calculation ─── */
const calcBMI = (weight, height) => {
  if (!weight || !height) return null;
  const bmi = weight / ((height / 100) ** 2);
  return {
    value: bmi.toFixed(1),
    label: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese',
    color: bmi < 18.5 ? '#007AFF' : bmi < 25 ? '#34C759' : bmi < 30 ? '#FFCC00' : '#FF3B30',
  };
};

/* ─── Weekly Heatmap ─── */
const WeekHeatmap = ({ progress }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();
  const weekData = days.map((d, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - ((today.getDay() || 7) - 1) + i);
    const dateStr = date.toISOString().split('T')[0];
    const entry = progress.find(p => p.date === dateStr);
    return { day: d, date: dateStr, entry, isToday: dateStr === today.toISOString().split('T')[0] };
  });

  return (
    <div className="grid grid-cols-7 gap-2">
      {weekData.map(({ day, entry, isToday }) => (
        <div key={day} className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-[#A1A1AA] uppercase">{day}</span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all
            ${isToday ? 'border-[#FF3B30]' : 'border-transparent'}
            ${entry?.workout_completed
              ? 'bg-[#34C759]/20 border-[#34C759]/50'
              : entry
                ? 'bg-white/5'
                : 'bg-[#1C1C1E]'}`}
          >
            {entry?.workout_completed
              ? <Fire size={16} weight="fill" className="text-[#34C759]" />
              : isToday
                ? <div className="w-2 h-2 rounded-full bg-[#FF3B30] animate-pulse" />
                : null}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Streak counter ─── */
const calcStreak = (progress) => {
  if (!progress?.length) return 0;
  const sorted = [...progress].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  for (const entry of sorted) {
    const d = new Date(entry.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((checkDate - d) / 86400000);
    if (diff === 0 && entry.workout_completed) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else if (diff === 1 && entry.workout_completed) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }
  return streak;
};

/* ─── Stat Card ─── */
const StatCard = ({ icon: Icon, value, label, sub, color = '#FF3B30', link, testId }) => {
  const card = (
    <div className={`stat-card hover:border-[color:var(--accent-color)]/40 transition-all`}
         style={{ '--accent-color': color }} data-testid={testId}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
          <Icon size={22} weight="fill" style={{ color }} />
        </div>
        {link && <ArrowRight size={16} className="text-[#A1A1AA] mt-1" />}
      </div>
      <div>
        <div className="text-3xl font-black" style={{ color }}>{value}</div>
        <div className="font-medium text-sm text-white">{label}</div>
        {sub && <div className="text-xs text-[#A1A1AA] mt-0.5">{sub}</div>}
      </div>
    </div>
  );
  return link ? <Link to={link}>{card}</Link> : card;
};

/* ─── Quick Log Today ─── */
const QuickLogButton = ({ token, onLogged }) => {
  const [logging, setLogging] = useState(false);
  const [done, setDone] = useState(false);

  const handleLog = async () => {
    setLogging(true);
    try {
      const res = await fetch(`${API}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          workout_completed: true,
          notes: 'Quick-logged from dashboard',
        }),
      });
      if (res.ok) { setDone(true); onLogged?.(); }
    } catch {}
    setLogging(false);
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-[#34C759] font-bold text-sm">
        <CheckCircle size={20} weight="fill" /> Today's workout logged! 🔥
      </div>
    );
  }
  return (
    <button
      onClick={handleLog}
      disabled={logging}
      className="flex items-center gap-2 bg-[#FF3B30] text-white px-5 py-2.5 rounded-md font-bold uppercase text-sm tracking-wide hover:bg-[#FF6B63] active:scale-95 transition-all disabled:opacity-60"
    >
      <CalendarCheck size={18} weight="fill" />
      {logging ? 'Logging...' : "Log Today's Workout"}
    </button>
  );
};

/* ─── Dashboard ─── */
const Dashboard = () => {
  const { token, user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [anaRes, ordersRes, profileRes] = await Promise.all([
        fetch(`${API}/analytics/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/orders`,            { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/profile`,           { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (anaRes.ok)     setAnalytics(await anaRes.json());
      if (ordersRes.ok)  setRecentOrders((await ordersRes.json()).slice(0, 3));
      if (profileRes.ok) setProfile(await profileRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const streak = calcStreak(analytics?.recent_progress || []);
  const bmi    = calcBMI(profile?.weight, profile?.height);
  const progress = analytics?.recent_progress || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          <div className="skeleton h-12 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-lg" />)}
          </div>
          <div className="skeleton h-40 rounded-lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-up">

        {/* ─── Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[#A1A1AA] text-sm font-medium mb-1">{getGreeting()},</p>
            <h1 className="font-['Barlow_Condensed'] font-black text-4xl sm:text-5xl uppercase tracking-tight" data-testid="dashboard-title">
              {user?.name || 'Athlete'} <span className="text-[#FF3B30]">💪</span>
            </h1>
            {profile?.fitness_goal && (
              <div className="flex items-center gap-2 mt-2">
                <Target size={14} className="text-[#FF3B30]" />
                <span className="text-[#A1A1AA] text-sm capitalize">Goal: {profile.fitness_goal.replace('_', ' ')}</span>
              </div>
            )}
          </div>
          <QuickLogButton token={token} onLogged={fetchAll} />
        </div>

        {/* ─── Stat Grid ─── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
          <StatCard
            icon={Fire}
            value={streak}
            label="Day Streak"
            sub={streak >= 3 ? '🔥 Keep it up!' : 'Start today'}
            color="#FF3B30"
            testId="stat-streak"
          />
          <StatCard
            icon={Barbell}
            value={analytics?.total_workouts || 0}
            label="Total Workouts"
            sub="Sessions logged"
            color="#FF3B30"
            testId="stat-workouts"
          />
          <StatCard
            icon={Package}
            value={analytics?.total_orders || 0}
            label="Orders Placed"
            sub="Supplements ordered"
            color="#007AFF"
            link="/orders"
            testId="stat-orders"
          />
          <StatCard
            icon={ChatText}
            value={analytics?.total_chats || 0}
            label="AI Chats"
            sub="with your AI coach"
            color="#34C759"
            link="/chat"
            testId="stat-chats"
          />
        </div>

        {/* ─── Mid Row: Heatmap + BMI ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Weekly Heatmap */}
          <div className="lg:col-span-2 fit-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label" style={{ marginBottom: 0 }}>This Week</div>
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight">Workout Heatmap</h2>
              </div>
              <Link to="/training" className="text-xs text-[#FF3B30] hover:text-[#FF6B63] font-bold uppercase tracking-wider">
                Track Progress →
              </Link>
            </div>
            <WeekHeatmap progress={progress} />
            <div className="flex items-center gap-4 mt-4 text-xs text-[#A1A1AA]">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#34C759]/20 border border-[#34C759]/40" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-[#1C1C1E]" />
                <span>Rest / Not logged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded border-2 border-[#FF3B30]" />
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* BMI Card */}
          <div className="fit-card p-6">
            <div className="section-label" style={{ marginBottom: 0 }}>Body Stats</div>
            <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-5">BMI Overview</h2>
            {bmi ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="font-['Barlow_Condensed'] font-black text-6xl" style={{ color: bmi.color }}>
                    {bmi.value}
                  </div>
                  <div className="font-bold text-sm mt-1" style={{ color: bmi.color }}>{bmi.label}</div>
                </div>
                {/* BMI ruler */}
                <div className="h-3 rounded-full bg-gradient-to-r from-[#007AFF] via-[#34C759] via-[#FFCC00] to-[#FF3B30] relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg shadow-white/50 rounded-full transition-all"
                    style={{ left: `${Math.min(((parseFloat(bmi.value) - 15) / (40 - 15)) * 100, 96)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#A1A1AA]">
                  <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-[#A1A1AA] text-xs mb-1">Weight</div>
                    <div className="font-bold">{profile.weight} kg</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-[#A1A1AA] text-xs mb-1">Height</div>
                    <div className="font-bold">{profile.height} cm</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Scales size={40} className="mx-auto mb-3 text-[#A1A1AA] opacity-50" />
                <p className="text-[#A1A1AA] text-sm mb-4">Add weight & height to see your BMI</p>
                <Link to="/profile" className="btn-primary px-4 py-2 text-xs rounded-md">Update Profile</Link>
              </div>
            )}
          </div>
        </div>

        {/* ─── Quick Action Cards ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            to="/training"
            className="fit-card p-8 hover:border-[#FF3B30]/40 group block"
            data-testid="quick-action-training"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-center justify-center">
                <Barbell size={32} weight="fill" className="text-[#FF3B30]" />
              </div>
              <ArrowRight size={20} className="text-[#A1A1AA] group-hover:text-[#FF3B30] group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-2">Training Hub</h3>
            <p className="text-[#A1A1AA] text-sm">Generate AI workout plans, track progress, log sessions & calculate your macros</p>
            <div className="flex gap-2 mt-4">
              <span className="badge-red">AI Plans</span>
              <span className="badge-zinc">Progress Log</span>
              <span className="badge-blue">BMI Calc</span>
            </div>
          </Link>

          <Link
            to="/shop"
            className="fit-card p-8 hover:border-[#34C759]/40 group block"
            data-testid="quick-action-shop"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-[#34C759]/10 border border-[#34C759]/20 flex items-center justify-center">
                <ShoppingCart size={32} weight="fill" className="text-[#34C759]" />
              </div>
              <ArrowRight size={20} className="text-[#A1A1AA] group-hover:text-[#34C759] group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-2">Shop Supplements</h3>
            <p className="text-[#A1A1AA] text-sm">90+ premium products: protein, creatine, pre-workout, BCAAs — filtered to your goal</p>
            <div className="flex gap-2 mt-4">
              <span className="badge-green">Protein</span>
              <span className="badge-zinc">Creatine</span>
              <span className="badge-zinc">Pre-Workout</span>
            </div>
          </Link>
        </div>

        {/* ─── Recent Progress ─── */}
        {progress.length > 0 && (
          <div className="fit-card p-6" data-testid="recent-progress-section">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label" style={{ marginBottom: 0 }}>Activity</div>
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight">Recent Progress</h2>
              </div>
              <Link to="/training" className="text-xs text-[#FF3B30] hover:text-[#FF6B63] font-bold uppercase tracking-wider" data-testid="view-all-progress">
                View All →
              </Link>
            </div>
            <div className="space-y-2">
              {progress.slice(0, 5).map((entry) => (
                <div key={entry.id || entry.date} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0" data-testid={`progress-entry-${entry.id || entry.date}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.workout_completed ? 'bg-[#34C759]/15' : 'bg-white/5'}`}>
                      {entry.workout_completed
                        ? <Fire size={16} weight="fill" className="text-[#34C759]" />
                        : <Clock size={16} className="text-[#A1A1AA]" />}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{entry.date}</div>
                      {entry.notes && <div className="text-xs text-[#A1A1AA] truncate max-w-[200px]">{entry.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.weight && <span className="text-sm text-[#A1A1AA]">{entry.weight} kg</span>}
                    <span className={entry.workout_completed ? 'badge-green' : 'badge-zinc'}>
                      {entry.workout_completed ? 'Done ✓' : 'Rest'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Recent Orders ─── */}
        {recentOrders.length > 0 && (
          <div className="fit-card p-6" data-testid="recent-orders-section">
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="section-label" style={{ marginBottom: 0 }}>Supplements</div>
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight">Recent Orders</h2>
              </div>
              <Link to="/orders" className="text-xs text-[#FF3B30] hover:text-[#FF6B63] font-bold uppercase tracking-wider" data-testid="view-all-orders">
                View All →
              </Link>
            </div>
            <div className="space-y-2">
              {recentOrders.map((order, index) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0" data-testid={`order-entry-${index}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#007AFF]/15 flex items-center justify-center">
                      <Package size={16} weight="fill" className="text-[#007AFF]" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Order #{order.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-[#A1A1AA]">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#FF3B30]">${order.total.toFixed(2)}</div>
                    <span className="badge-green">{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default Dashboard;

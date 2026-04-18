import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import {
  Barbell, Calendar, TrendUp, Brain, Fire, CheckCircle,
  Scales, Lightning, ArrowRight, Plus, Minus, Target, User
} from '@phosphor-icons/react';

/* ─── Parse workout plan text into structured day objects ─── */
const parsePlan = (text) => {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const days = [];
  let current = null;
  for (const line of lines) {
    const dayMatch = line.match(/^(?:#+\s*|\*+\s*)?Day\s+(\d+)\s*[:\-\u2013\u2014]\s*(.+)/i);
    if (dayMatch) {
      if (current) days.push(current);
      current = { day: parseInt(dayMatch[1]), title: dayMatch[2], exercises: [], meta: [] };
    } else if (current && (line.startsWith('-') || line.startsWith('*') || line.match(/^\d+\./))) {
      current.exercises.push(line.replace(/^[*\-\d\.]+\s*/, ''));
    } else if (!current && line) {
      if (days.length === 0 && !current) {
        if (!days._meta) days._meta = [];
        // store meta info
      }
    }
  }
  if (current) days.push(current);
  return days;
};

/* ─── Parse single exercise string ─── */
const parseExercise = (str) => {
  // Try various common formats: "3 sets x 10 reps", "3 sets of 10", "10 reps, 3 sets"
  const setsMatch = str.match(/(\d+)\s*sets?/i);
  const repsMatch = str.match(/(\d+)\s*(?:reps?|repetitions|sec)/i);
  const rangeMatch = str.match(/(\d+[\-]\d+)\s*(?:reps?|repetitions)/i);
  const restMatch = str.match(/rest\s*([^,\.;]+)/i);
  
  const namePart = str.split(/[:\-\(]/)[0].trim();
  
  return {
    name: namePart,
    sets: setsMatch ? setsMatch[1] : null,
    reps: repsMatch ? repsMatch[1] : (rangeMatch ? rangeMatch[1] : null),
    rest: restMatch ? restMatch[1].trim() : null,
  };
};

/* ─── Workout Plan Card ─── */
const WorkoutDayCard = ({ day, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 w-24 rounded-xl border-2 p-3 text-center transition-all ${
      isActive
        ? 'bg-[#FF3B30] border-[#FF3B30] text-white'
        : 'bg-[#141414] border-white/10 text-[#A1A1AA] hover:border-[#FF3B30]/40'
    }`}
  >
    <div className="font-['Barlow_Condensed'] font-black text-2xl">{day.day}</div>
    <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5 line-clamp-2 leading-tight">
      {day.title}
    </div>
  </button>
);

/* ─── BMI & Macros Calculator ─── */
const MacroCalc = () => {
  const [form, setForm] = useState({ weight: '', height: '', age: '', gender: 'male', activity: '1.375', goal: 'maintain' });
  const [result, setResult] = useState(null);

  const ACTIVITY = [
    { val: '1.2',   label: 'Sedentary (desk job, no gym)' },
    { val: '1.375', label: 'Light (1–3 days/week)' },
    { val: '1.55',  label: 'Moderate (3–5 days/week)' },
    { val: '1.725', label: 'Active (6–7 days/week)' },
    { val: '1.9',   label: 'Very Active (2x/day training)' },
  ];

  const calculate = (e) => {
    e.preventDefault();
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height);
    const a = parseInt(form.age);
    const act = parseFloat(form.activity);

    // Mifflin-St Jeor BMR
    const bmr = form.gender === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

    const tdee = bmr * act;
    const goalCals = form.goal === 'bulk' ? tdee + 300 : form.goal === 'cut' ? tdee - 400 : tdee;

    const bmi = w / ((h / 100) ** 2);
    const bmiLabel = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';
    const bmiColor = bmi < 18.5 ? '#007AFF' : bmi < 25 ? '#34C759' : bmi < 30 ? '#FFCC00' : '#FF3B30';

    // Macros
    const protein = Math.round(w * (form.goal === 'cut' ? 2.4 : 2.0));
    const fat = Math.round((goalCals * 0.25) / 9);
    const carbs = Math.round((goalCals - protein * 4 - fat * 9) / 4);

    setResult({ bmr: Math.round(bmr), tdee: Math.round(tdee), goalCals: Math.round(goalCals), protein, fat, carbs, bmi: bmi.toFixed(1), bmiLabel, bmiColor });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="fit-card p-6" data-testid="macro-calc">
        <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-5 flex items-center gap-2">
          <Scales size={26} weight="fill" className="text-[#FF3B30]" />
          BMI & Macro Calculator
        </h2>
        <form onSubmit={calculate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Weight (kg)</label>
              <input type="number" step="0.1" required value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} className="fit-input" placeholder="75" />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Height (cm)</label>
              <input type="number" step="0.1" required value={form.height} onChange={e => setForm({...form, height: e.target.value})} className="fit-input" placeholder="180" />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Age</label>
              <input type="number" required value={form.age} onChange={e => setForm({...form, age: e.target.value})} className="fit-input" placeholder="25" />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Gender</label>
              <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className="fit-input">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Activity Level</label>
            <select value={form.activity} onChange={e => setForm({...form, activity: e.target.value})} className="fit-input">
              {ACTIVITY.map(a => <option key={a.val} value={a.val}>{a.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Goal</label>
            <div className="grid grid-cols-3 gap-2">
              {[['cut','Cut (Fat Loss)'], ['maintain','Maintain'], ['bulk','Bulk (Muscle)']].map(([val, lbl]) => (
                <button key={val} type="button" onClick={() => setForm({...form, goal: val})}
                  className={`py-2.5 rounded-md text-xs font-bold uppercase tracking-wide border transition-all ${
                    form.goal === val ? 'bg-[#FF3B30] border-[#FF3B30] text-white' : 'bg-[#0A0A0A] border-white/10 text-[#A1A1AA] hover:border-[#FF3B30]/40'
                  }`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full btn-primary px-4 py-3 rounded-md text-sm">
            Calculate My Numbers
          </button>
        </form>
      </div>

      {result ? (
        <div className="space-y-4 animate-fade-up">
          {/* BMI */}
          <div className="fit-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#A1A1AA] text-xs font-medium mb-1">Body Mass Index</div>
                <div className="font-['Barlow_Condensed'] font-black text-4xl" style={{ color: result.bmiColor }}>{result.bmi}</div>
                <div className="font-bold text-sm mt-0.5" style={{ color: result.bmiColor }}>{result.bmiLabel}</div>
              </div>
              <div className="text-right space-y-2">
                <div><span className="text-[#A1A1AA] text-xs">BMR: </span><span className="font-bold text-sm">{result.bmr} kcal</span></div>
                <div><span className="text-[#A1A1AA] text-xs">TDEE: </span><span className="font-bold text-sm">{result.tdee} kcal</span></div>
                <div><span className="text-[#A1A1AA] text-xs">Target: </span><span className="font-black text-[#FF3B30]">{result.goalCals} kcal</span></div>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="fit-card p-5">
            <h3 className="font-['Barlow_Condensed'] font-black text-xl uppercase tracking-tight mb-4">Daily Macro Targets</h3>
            <div className="space-y-3">
              {[
                { name: 'Protein', val: result.protein, unit: 'g', color: '#FF3B30', cal: result.protein * 4, pct: Math.round((result.protein * 4 / result.goalCals) * 100) },
                { name: 'Carbohydrates', val: result.carbs, unit: 'g', color: '#007AFF', cal: result.carbs * 4, pct: Math.round((result.carbs * 4 / result.goalCals) * 100) },
                { name: 'Fats', val: result.fat, unit: 'g', color: '#FFCC00', cal: result.fat * 9, pct: Math.round((result.fat * 9 / result.goalCals) * 100) },
              ].map(m => (
                <div key={m.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="font-medium">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[#A1A1AA] text-xs">{m.cal} kcal</span>
                      <span className="font-black" style={{ color: m.color }}>{m.val}{m.unit}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.pct}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-white/5 rounded-lg text-sm text-[#A1A1AA]">
              💡 <strong className="text-white">Pro Tip:</strong> Hit your protein target first. Carbs and fats can flex based on training day vs rest day.
            </div>
          </div>
        </div>
      ) : (
        <div className="fit-card p-6 flex flex-col items-center justify-center text-center py-16 text-[#A1A1AA]">
          <Scales size={56} className="mb-4 opacity-30" />
          <p className="text-sm">Fill in your details and hit calculate to see your personalized BMI, TDEE, and macro targets.</p>
        </div>
      )}
    </div>
  );
};

/* ─── Main Training Page ─── */
const TrainingPage = () => {
  const { token, user } = useAuth();
  const [view, setView] = useState('generate');
  const [mode, setMode] = useState('pro'); // 'pro' or 'custom'
  const [goal, setGoal] = useState('muscle_gain');
  const [experienceLevel, setExperienceLevel] = useState('intermediate');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [profileAnalysis, setProfileAnalysis] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [planRaw, setPlanRaw] = useState('');
  const [planError, setPlanError] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [progress, setProgress] = useState([]);
  const [newProgress, setNewProgress] = useState({
    date: new Date().toISOString().split('T')[0],
    workout_completed: true,
    notes: '',
    weight: ''
  });
  const [logSuccess, setLogSuccess] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`${API}/progress`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProgress(await res.json());
    } catch {}
  }, [token]);

  const fetchAnalysis = useCallback(async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API}/ai/analyze-profile`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProfileAnalysis(data.analysis);
      }
    } catch {} finally {
      setAnalyzing(false);
    }
  }, [token]);

  useEffect(() => {
    if (view === 'progress') fetchProgress();
    if (view === 'generate') fetchAnalysis();
  }, [view, fetchProgress, fetchAnalysis]);

  const generateWorkout = async (e, forcedMode) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    setPlanError('');
    setGeneratedPlan(null);
    setAnalysis('');
    setActiveDay(0);
    
    const activeMode = forcedMode || mode;
    const payload = activeMode === 'pro' 
      ? { use_profile: true }
      : { goal, experience_level: experienceLevel, days_per_week: daysPerWeek, use_profile: false };

    try {
      const res = await fetch(`${API}/ai/generate-workout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const parsed = parsePlan(data.plan);
        setGeneratedPlan(parsed.length > 0 ? parsed : null);
        setPlanRaw(data.plan);
        setAnalysis(data.analysis || '');
      } else {
        // Handle FastAPI validation error objects safely
        let errorMsg = 'Unable to generate a plan right now.';
        if (typeof data.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMsg = data.detail.map(err => {
            const path = err.loc ? err.loc.join('.') : 'input';
            return `${path}: ${err.msg}`;
          }).join(' | ');
        }
        setPlanError(errorMsg);
      }
    } catch (err) {
      setPlanError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const logProgress = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newProgress, weight: newProgress.weight ? parseFloat(newProgress.weight) : null }),
      });
      if (res.ok) {
        setLogSuccess(true);
        setTimeout(() => setLogSuccess(false), 3000);
        setNewProgress({ date: new Date().toISOString().split('T')[0], workout_completed: true, notes: '', weight: '' });
        fetchProgress();
      }
    } catch {}
  };

  const TABS = [
    { id: 'generate', label: 'AI Generator', icon: Brain },
    { id: 'progress', label: 'Track Progress', icon: TrendUp },
    { id: 'calc',     label: 'BMI & Macros', icon: Scales },
  ];

  const isProfileComplete = Boolean(
    user?.age && 
    user?.weight && 
    user?.height && 
    user?.experience_level && 
    user?.fitness_goal
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-up">

        {/* Header */}
        <div className="mb-8">
          <div className="section-label">Training</div>
          <h1 className="section-title text-4xl sm:text-5xl mb-2" data-testid="training-title">Training Hub</h1>
          <p className="text-[#A1A1AA]">AI workout generator · progress tracker · BMI & macro calculator</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#141414] border border-white/10 p-1 rounded-xl w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold tracking-wide uppercase text-sm transition-all ${
                view === id
                  ? 'bg-[#FF3B30] text-white shadow-lg shadow-[#FF3B30]/25'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
              data-testid={`tab-${id}`}
            >
              <Icon size={17} weight={view === id ? 'fill' : 'regular'} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Generate Plan ── */}
        {view === 'generate' && !isProfileComplete && (
          <div className="fit-card p-12 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-[#FF3B30]/10 border border-[#FF3B30]/30 flex items-center justify-center mx-auto mb-6">
              <User size={40} weight="fill" className="text-[#FF3B30]" />
            </div>
            <h2 className="font-['Barlow_Condensed'] font-black text-3xl uppercase mb-4">Profile Data Required</h2>
            <div className="max-w-md mx-auto mb-8">
              <p className="text-[#A1A1AA] mb-4">
                Our AI coach needs your metrics to generate a safe and effective plan. Please fill in the following:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {!user?.age && <span className="badge-red px-3 py-1">Missing Age</span>}
                {!user?.weight && <span className="badge-red px-3 py-1">Missing Weight</span>}
                {!user?.height && <span className="badge-red px-3 py-1">Missing Height</span>}
                {!user?.fitness_goal && <span className="badge-red px-3 py-1">Missing Goal</span>}
                {!user?.experience_level && <span className="badge-red px-3 py-1">Missing Experience</span>}
              </div>
            </div>
            <Link to="/profile" className="btn-primary px-8 py-4 rounded-md text-sm font-bold uppercase tracking-widest">
              GOTO PROFILE SETTINGS
            </Link>
          </div>
        )}

        {view === 'generate' && isProfileComplete && (
          <div className="space-y-6">
            {/* Elite Coach's Corner: Permanent Profile Assessment */}
            <div className="fit-card p-6 bg-gradient-to-br from-[#FF3B30]/10 to-[#FF3B30]/5 border-[#FF3B30]/20 animate-fade-in mb-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Lightning size={120} weight="fill" className="text-[#FF3B30]" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#FF3B30] flex items-center justify-center text-white shadow-lg shadow-[#FF3B30]/20 animate-pulse-red">
                    <Brain size={28} weight="fill" />
                  </div>
                  <div>
                    <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tighter leading-none">Coach's Technical Corner</h2>
                    <p className="text-[10px] text-[#FF3B30] font-black uppercase tracking-widest mt-1">Live Bio-Metric Assessment</p>
                  </div>
                </div>
                <div className="min-h-[40px]">
                  {analyzing ? (
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-[#FF3B30] animate-bounce" />
                       <div className="w-2 h-2 rounded-full bg-[#FF3B30] animate-bounce [animation-delay:-0.3s]" />
                       <div className="w-2 h-2 rounded-full bg-[#FF3B30] animate-bounce [animation-delay:-0.5s]" />
                       <span className="text-xs text-[#A1A1AA] uppercase font-bold tracking-widest ml-1">Analyzing physical metrics...</span>
                    </div>
                  ) : (
                    <p className="text-white text-sm leading-relaxed italic max-w-2xl px-2 border-l-2 border-[#FF3B30]/30">
                      "{profileAnalysis || 'Complete your bio-metrics in settings to unlock deep technical analysis of your physical state.'}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Pro Recommendation Module */}
              <div className="fit-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Lightning size={120} weight="fill" className="text-[#34C759]" />
                </div>
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-5 flex items-center gap-2">
                  <Lightning size={26} weight="fill" className="text-[#34C759]" />
                  Pro Recommendation
                </h2>
                <div className="space-y-4">
                  <div className="bg-[#0A0A0A] border border-white/5 rounded-lg p-4">
                    <div className="text-[10px] text-[#A1A1AA] uppercase font-bold mb-2">Automated Parameters</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge-zinc">Goal: {user.fitness_goal?.replace('_', ' ')}</span>
                      <span className="badge-zinc">Level: {user.experience_level}</span>
                      <span className="badge-zinc">Smart Frequency</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    Use this for a scientifically optimized plan based strictly on your current bio-metrics and experience level.
                  </p>
                  <button
                    onClick={() => { setMode('pro'); generateWorkout(null, 'pro'); }} 
                    disabled={loading}
                    className="w-full btn-primary bg-[#34C759] hover:bg-[#34C759]/80 py-3.5 rounded-md text-sm flex items-center justify-center gap-2"
                  >
                    {loading && mode === 'pro' ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Best Plan...</>
                    ) : (
                      <><Brain size={18} weight="fill" /> Generate Recommended Plan</>
                    )}
                  </button>
                </div>
              </div>

              {/* Custom Direct Builder Module */}
              <div className="fit-card p-6">
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-5 flex items-center gap-2">
                  <ArrowRight size={26} weight="bold" className="text-[#FF3B30]" />
                  Direct Plan Builder
                </h2>
                <form onSubmit={(e) => { setMode('custom'); generateWorkout(e, 'custom'); }} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text text-[10px] text-[#A1A1AA] font-bold uppercase mb-1.5">Goal</label>
                      <select value={goal} onChange={e => setGoal(e.target.value)} className="fit-input text-xs h-10 py-0">
                        <option value="muscle_gain">Muscle Gain</option>
                        <option value="weight_loss">Weight Loss</option>
                        <option value="strength">Strength</option>
                        <option value="endurance">Endurance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#A1A1AA] font-bold uppercase mb-1.5">Difficulty</label>
                      <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)} className="fit-input text-xs h-10 py-0">
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-[10px] text-[#A1A1AA] font-bold uppercase">Days/Week</label>
                      <span className="text-[#FF3B30] font-black">{daysPerWeek}</span>
                    </div>
                    <input
                      type="range" min="3" max="6" value={daysPerWeek}
                      onChange={e => setDaysPerWeek(parseInt(e.target.value))}
                      className="w-full h-1.5"
                    />
                  </div>
                  <button
                    type="submit" disabled={loading}
                    className="w-full btn-primary py-3 rounded-md text-xs flex items-center justify-center gap-2"
                  >
                    {loading && mode === 'custom' ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                    ) : (
                      <><Lightning size={16} weight="fill" /> Generate Direct Plan</>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Plan Display */}
            <div className="fit-card p-6 min-h-[400px]" data-testid="generated-plan">
              {generatedPlan && generatedPlan.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight">Your Active Plan</h2>
                      <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest">
                        {mode === 'pro' ? 'AI Recommended Engine' : 'Direct Custom Build'}
                      </div>
                    </div>
                    <span className="badge-red">Ready to Train</span>
                  </div>
                  {/* Day selector */}
                  <div className="flex gap-3 overflow-x-auto pb-3 mb-5">
                    {generatedPlan.map((day, i) => (
                      <WorkoutDayCard key={i} day={day} isActive={activeDay === i} onClick={() => setActiveDay(i)} />
                    ))}
                  </div>
                  {/* Active day exercises */}
                  {generatedPlan[activeDay] && (
                    <div className="animate-fade-in space-y-6">
                      {/* Integrated Analysis Box in Plan View */}
                      <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-2xl p-5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Brain size={80} weight="fill" className="text-[#FF3B30]" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 text-[#FF3B30] text-[10px] font-black uppercase tracking-widest mb-2">
                             <Lightning size={14} weight="fill" /> Coach's Technical Assessment
                          </div>
                          <p className="text-sm text-white leading-relaxed italic animate-fade-in" style={{ animationDelay: '200ms' }}>
                            "{analysis || 'Our AI is finalizing your bio-metric assessment...'}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-[#FF3B30] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#FF3B30]/20">
                          {generatedPlan[activeDay].day}
                        </div>
                        <div>
                          <div className="font-black text-lg uppercase tracking-tight">{generatedPlan[activeDay].title}</div>
                          <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-widest">{generatedPlan[activeDay].exercises.length} Exercises Targeted</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {generatedPlan[activeDay].exercises.map((ex, i) => {
                          const parsed = parseExercise(ex);
                          return (
                            <div 
                              key={i} 
                              className="bg-[#141414] rounded-xl p-4 flex items-center justify-between gap-4 border border-white/5 hover:border-[#FF3B30]/40 hover:bg-white/[0.02] transition-all group animate-fade-in"
                              style={{ animationDelay: `${(i + 1) * 100}ms` }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-[#A1A1AA] group-hover:text-[#FF3B30] group-hover:border-[#FF3B30]/30 transition-all">
                                  {i + 1}
                                </div>
                                <div>
                                  <span className="text-sm font-black uppercase tracking-tight block group-hover:text-white transition-colors">{parsed.name}</span>
                                  {parsed.rest && <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-tighter">Rest: {parsed.rest}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {parsed.sets && (
                                  <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-[#A1A1AA] font-bold uppercase">Volume</span>
                                    <span className="text-sm font-black text-[#FF3B30] tracking-tighter">{parsed.sets} × {parsed.reps}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Fallback for unparseable plans */}
                  {generatedPlan.length === 0 && planRaw && (
                    <div className="bg-[#0A0A0A] p-4 rounded-lg border border-white/5 space-y-4">
                      <div className="text-xs text-[#FF3B30] font-bold uppercase tracking-widest flex items-center gap-2">
                        <Lightning size={14} weight="fill" /> Raw Plan Output
                      </div>
                      <pre className="whitespace-pre-wrap text-sm text-[#A1A1AA] font-sans leading-relaxed">{planRaw}</pre>
                    </div>
                  )}
                </>
              ) : planRaw ? (
                /* This handles cases where parsed is null but planRaw exists */
                <div className="animate-fade-in space-y-4">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight">Your Plan</h2>
                    <span className="badge-red">Custom Generation</span>
                  </div>
                  <div className="bg-[#0A0A0A] p-4 rounded-lg border border-white/5">
                    <pre className="whitespace-pre-wrap text-sm text-[#A1A1AA] font-sans leading-relaxed">{planRaw}</pre>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Barbell size={56} className="mb-4 text-[#A1A1AA] opacity-30" />
                  <p className="text-[#A1A1AA] text-sm">{planError || 'Generate a plan to see your personalized workout schedule here'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Track Progress ── */}
        {view === 'progress' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Log Form */}
            <div className="fit-card p-6" data-testid="progress-form">
              <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight mb-5 flex items-center gap-2">
                <TrendUp size={24} weight="fill" className="text-[#FF3B30]" />
                Log Session
              </h2>
              {logSuccess && (
                <div className="mb-4 p-3 bg-[#34C759]/10 border border-[#34C759]/30 rounded-lg flex items-center gap-2 text-[#34C759] text-sm font-medium">
                  <CheckCircle size={18} weight="fill" /> Session logged! Keep it up! 🔥
                </div>
              )}
              <form onSubmit={logProgress} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Date</label>
                  <input type="date" value={newProgress.date} onChange={e => setNewProgress({...newProgress, date: e.target.value})} className="fit-input" data-testid="progress-date-input" />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[[true, '✅ Workout Done'], [false, '😴 Rest Day']].map(([val, lbl]) => (
                      <button key={String(val)} type="button" onClick={() => setNewProgress({...newProgress, workout_completed: val})}
                        className={`py-3 rounded-md text-sm font-bold border transition-all ${
                          newProgress.workout_completed === val
                            ? val ? 'bg-[#34C759] border-[#34C759] text-white' : 'bg-[#A1A1AA]/20 border-[#A1A1AA]/50 text-white'
                            : 'bg-[#0A0A0A] border-white/10 text-[#A1A1AA] hover:border-white/30'
                        }`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Body Weight (kg) – optional</label>
                  <input type="number" step="0.1" value={newProgress.weight} onChange={e => setNewProgress({...newProgress, weight: e.target.value})} className="fit-input" placeholder="75.5" data-testid="progress-weight-input" />
                </div>
                <div>
                  <label className="block text-xs text-[#A1A1AA] font-medium mb-1.5">Session Notes</label>
                  <textarea value={newProgress.notes} onChange={e => setNewProgress({...newProgress, notes: e.target.value})} className="fit-input h-24 resize-none" placeholder="How was it? PRs? Energy levels? Pain?" data-testid="progress-notes-input" />
                </div>
                <button type="submit" className="w-full btn-primary py-3.5 rounded-md text-sm flex items-center justify-center gap-2" data-testid="log-progress-button">
                  <Fire size={18} weight="fill" /> Log This Session
                </button>
              </form>
            </div>

            {/* History */}
            <div className="fit-card p-6" data-testid="progress-history">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-['Barlow_Condensed'] font-black text-2xl uppercase tracking-tight">Session History</h2>
                {progress.length > 0 && (
                  <span className="badge-green">{progress.filter(p => p.workout_completed).length} workouts</span>
                )}
              </div>
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {progress.map((entry, i) => (
                  <div key={entry.id} className="bg-[#0A0A0A] rounded-lg p-4 border border-white/5 hover:border-white/10 transition-all" data-testid={`history-entry-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${entry.workout_completed ? 'bg-[#34C759]/15' : 'bg-white/5'}`}>
                          {entry.workout_completed ? <Fire size={16} weight="fill" className="text-[#34C759]" /> : <span className="text-[10px] text-[#A1A1AA]">💤</span>}
                        </div>
                        <span className="font-medium text-sm">{entry.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.weight && <span className="text-xs text-[#A1A1AA] font-medium">{entry.weight} kg</span>}
                        <span className={entry.workout_completed ? 'badge-green' : 'badge-zinc'}>
                          {entry.workout_completed ? 'Done' : 'Rest'}
                        </span>
                      </div>
                    </div>
                    {entry.notes && <p className="text-xs text-[#A1A1AA] italic">"{entry.notes}"</p>}
                  </div>
                ))}
                {progress.length === 0 && (
                  <div className="text-center py-14 text-[#A1A1AA]">
                    <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No sessions logged yet. Hit your first session!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── BMI & Macros ── */}
        {view === 'calc' && <MacroCalc />}

      </main>
    </div>
  );
};

export default TrainingPage;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Lightning, EnvelopeSimple, Lock } from '@phosphor-icons/react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      setError(err?.message || 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8" data-testid="login-logo-link">
          <Lightning size={40} weight="fill" className="text-[#FF3B30]" />
          <span className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight">FitPro Market</span>
        </Link>

        <div className="bg-[#141414] border border-white/10 rounded-sm p-8">
          <h1 className="font-['Barlow_Condensed'] font-black text-3xl uppercase tracking-tight mb-2" data-testid="login-title">
            Welcome Back
          </h1>
          <p className="text-[#A1A1AA] mb-8">Log in to continue your fitness journey</p>

          {error && (
            <div className="bg-[#FF3B30]/10 border border-[#FF3B30]/50 rounded-sm p-3 mb-6 text-[#FF3B30] text-sm" data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" htmlFor="email">Email</label>
              <div className="relative">
                <EnvelopeSimple size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-10 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  placeholder="your@email.com"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" htmlFor="password">Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-10 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  placeholder="••••••••"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-submit-button"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs uppercase tracking-wide text-[#A1A1AA]">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full border border-white/20 text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:border-white/40 hover:bg-white/5 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="login-google-button"
          >
            Continue With Google
          </button>

          <div className="mt-6 text-center text-sm text-[#A1A1AA]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#FF3B30] hover:text-[#FF6B63] font-medium" data-testid="login-register-link">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

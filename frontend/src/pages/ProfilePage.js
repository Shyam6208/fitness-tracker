import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, API } from '@/App';
import Navigation from '@/components/Navigation';
import { User, FloppyDisk } from '@phosphor-icons/react';

const ProfilePage = () => {
  const { token, user, setUser, logout } = useAuth();
  const isProfileComplete = Boolean(
    user?.age && 
    user?.weight && 
    user?.height && 
    user?.experience_level && 
    user?.fitness_goal
  );
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    fitness_goal: '',
    age: '',
    weight: '',
    height: '',
    experience_level: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile({
          name: data.name || '',
          email: data.email || '',
          fitness_goal: data.fitness_goal || '',
          age: data.age || '',
          weight: data.weight || '',
          height: data.height || '',
          experience_level: data.experience_level || ''
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(`${API}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profile.name,
          fitness_goal: profile.fitness_goal || null,
          age: profile.age ? parseInt(profile.age) : null,
          weight: profile.weight ? parseFloat(profile.weight) : null,
          height: profile.height ? parseFloat(profile.height) : null,
          experience_level: profile.experience_level || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
        }
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-6 py-20 text-center text-[#A1A1AA]">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />
      
      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="font-['Barlow_Condensed'] font-black text-4xl uppercase tracking-tight mb-2" data-testid="profile-title">
            Profile Settings
          </h1>
          <p className="text-[#A1A1AA]">Manage your account and fitness information</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-sm border ${
            message.includes('success') 
              ? 'bg-[#34C759]/10 border-[#34C759]/50 text-[#34C759]' 
              : 'bg-[#FF3B30]/10 border-[#FF3B30]/50 text-[#FF3B30]'
          }`} data-testid="profile-message">
            {message}
          </div>
        )}

        <div className="bg-[#141414] border border-white/10 rounded-sm p-8" data-testid="profile-form">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  required
                  data-testid="profile-name-input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={profile.email}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-[#A1A1AA] cursor-not-allowed outline-none"
                  disabled
                  data-testid="profile-email-input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2" htmlFor="fitness_goal">Fitness Goal</label>
                <select
                  id="fitness_goal"
                  value={profile.fitness_goal}
                  onChange={(e) => setProfile({ ...profile, fitness_goal: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  data-testid="profile-goal-select"
                >
                  <option value="">Select a goal</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="strength">Strength</option>
                  <option value="endurance">Endurance</option>
                  <option value="general_fitness">General Fitness</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="age">Age</label>
                <input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  data-testid="profile-age-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="experience_level">Experience Level</label>
                <select
                  id="experience_level"
                  value={profile.experience_level}
                  onChange={(e) => setProfile({ ...profile, experience_level: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  data-testid="profile-experience-select"
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="weight">Weight (kg)</label>
                <input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  data-testid="profile-weight-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="height">Height (cm)</label>
                <input
                  id="height"
                  type="number"
                  step="0.1"
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30] transition-all outline-none"
                  data-testid="profile-height-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#FF3B30] text-white px-6 py-3 rounded-sm font-bold tracking-wide uppercase hover:bg-[#FF6B63] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="save-profile-button"
            >
              <FloppyDisk size={20} weight="fill" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;

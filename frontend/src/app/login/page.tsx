'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, Lock, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(username, password);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Inloggen mislukt');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #67697c 100%)' }}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#d5896f' }}></div>
          <div className="font-medium" style={{ color: '#67697c' }}>Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full blur-2xl opacity-10" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Logo/Header Card */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)', boxShadow: '0 10px 25px rgba(213, 137, 111, 0.25)' }}>
            <User className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Jill Dashboard
          </h2>
          <p className="mt-3 font-medium" style={{ color: '#67697c' }}>
            Log in om je dashboard te bekijken
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 space-y-6" style={{ boxShadow: '0 25px 50px rgba(103, 105, 124, 0.15)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              {/* Username Field */}
              <div className="group">
                <label htmlFor="username" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                  Gebruikersnaam
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 transition-colors duration-200" style={{ color: '#67697c' }} />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 pl-12 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-gray-50/50 hover:bg-white/80 focus:shadow-lg"
                    style={{
                      color: '#120309'
                    }}
                    placeholder="Voer je gebruikersnaam in"
                    disabled={isSubmitting}
                    onFocus={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                      target.style.borderColor = '#d5896f';
                    }}
                    onBlur={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.style.boxShadow = '';
                      target.style.borderColor = '#d1d5db';
                    }}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                  Wachtwoord
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 transition-colors duration-200" style={{ color: '#67697c' }} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-4 py-3 pl-12 pr-12 border border-gray-200 text-gray-900 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-gray-50/50 hover:bg-white/80 focus:shadow-lg"
                    style={{ color: '#120309' }}
                    placeholder="Voer je wachtwoord in"
                    disabled={isSubmitting}
                    onFocus={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                      target.style.borderColor = '#d5896f';
                    }}
                    onBlur={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.style.boxShadow = '';
                      target.style.borderColor = '#d1d5db';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 hover:opacity-70 transition-opacity duration-200" style={{ color: '#67697c' }} />
                    ) : (
                      <Eye className="h-5 w-5 hover:opacity-70 transition-opacity duration-200" style={{ color: '#67697c' }} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/10 rounded-xl blur-sm"></div>
                <div className="relative text-red-700 text-sm text-center bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl p-4 font-medium">
                  {error}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #d5896f, #d5896f90)',
                  boxShadow: '0 10px 25px rgba(213, 137, 111, 0.25)'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    const target = e.target as HTMLButtonElement;
                    target.style.boxShadow = '0 15px 35px rgba(213, 137, 111, 0.35)';
                    target.style.background = 'linear-gradient(135deg, #c17c5e, #d5896f)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    const target = e.target as HTMLButtonElement;
                    target.style.boxShadow = '0 10px 25px rgba(213, 137, 111, 0.25)';
                    target.style.background = 'linear-gradient(135deg, #d5896f, #d5896f90)';
                  }
                }}
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-4 border border-transparent">
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <LogIn className="h-5 w-5 text-white/80 group-hover:text-white transition-colors duration-200" />
                  )}
                </span>
                {isSubmitting ? 'Bezig met inloggen...' : 'Inloggen'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm" style={{ color: '#67697c' }}>
            Hulp nodig? Neem contact op met de werkgever.
          </p>
        </div>
      </div>
    </div>
  );
}
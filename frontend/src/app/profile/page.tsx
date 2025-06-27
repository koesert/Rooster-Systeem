'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useError } from '@/contexts/ErrorContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { formatDate } from '@/utils/dateUtils';
import { User, Edit, Calendar, Shield, Clock, Home } from 'lucide-react';

export default function ProfilePage() {
  usePageTitle('Dashboard - Mijn profiel');

  const { user, isLoading, getRoleName } = useAuth();
  const { showApiError } = useError();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen message="Profiel laden" />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Mijn profiel
                      </h1>
                      <p className="text-lg mt-1" style={{ color: '#67697c' }}>
                        Bekijk en beheer je profielgegevens
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/profile/edit')}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                  >
                    <Edit className="h-5 w-5" />
                    <span>Profiel bewerken</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold mb-6" style={{ color: '#120309' }}>
                Persoonlijke informatie
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Full Name */}
                <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #e8eef240, #e8eef220)' }}>
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="h-5 w-5" style={{ color: '#d5896f' }} />
                    <p className="text-sm font-medium" style={{ color: '#67697c' }}>Volledige naam</p>
                  </div>
                  <p className="text-lg font-semibold" style={{ color: '#120309' }}>{user.fullName}</p>
                </div>

                {/* Username */}
                <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #e8eef240, #e8eef220)' }}>
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="h-5 w-5" style={{ color: '#d5896f' }} />
                    <p className="text-sm font-medium" style={{ color: '#67697c' }}>Gebruikersnaam</p>
                  </div>
                  <p className="text-lg font-semibold" style={{ color: '#120309' }}>{user.username}</p>
                </div>

                {/* Birth Date */}
                <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #e8eef240, #e8eef220)' }}>
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="h-5 w-5" style={{ color: '#d5896f' }} />
                    <p className="text-sm font-medium" style={{ color: '#67697c' }}>Geboortedatum</p>
                  </div>
                  <p className="text-lg font-semibold" style={{ color: '#120309' }}>
                    {formatDate(user.birthDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold mb-6" style={{ color: '#120309' }}>
                Snelle acties
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Edit Profile */}
                <button
                  onClick={() => router.push('/profile/edit')}
                  className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <Edit className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2 group-hover:text-opacity-80 transition-all duration-200" style={{ color: '#120309' }}>
                        Profiel bewerken
                      </h4>
                      <p className="text-sm" style={{ color: '#67697c' }}>
                        Wijzig je gegevens
                      </p>
                    </div>
                  </div>
                </button>

                {/* View schedule */}
                <button
                  onClick={() => router.push('/schedule')}
                  className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2 group-hover:text-opacity-80 transition-all duration-200" style={{ color: '#120309' }}>
                        Rooster bekijken
                      </h4>
                      <p className="text-sm" style={{ color: '#67697c' }}>
                        Bekijk het rooster
                      </p>
                    </div>
                  </div>
                </button>

                {/* Back to Dashboard */}
                <button
                  onClick={() => router.push('/home')}
                  className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <Home className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold mb-2 group-hover:text-opacity-80 transition-all duration-200" style={{ color: '#120309' }}>
                        Naar dashboard
                      </h4>
                      <p className="text-sm" style={{ color: '#67697c' }}>
                        Terug naar dashboard
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
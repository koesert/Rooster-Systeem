'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { Users, Calendar, BarChart3, Settings, Clock, TrendingUp, CheckCircle, X } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading, justLoggedIn, clearJustLoggedIn } = useAuth();
  const router = useRouter();
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(false);

  // Handle authentication
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Handle welcome notification
  useEffect(() => {
    if (justLoggedIn && user) {
      setShowWelcomeNotification(true);
      const timer = setTimeout(() => {
        setShowWelcomeNotification(false);
        clearJustLoggedIn();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn, user, clearJustLoggedIn]);

    // Set page title
  useEffect(() => {
    document.title = 'Jill Dashboard - Home';
  }, []);

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen message="Dashboard laden" />;
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  const quickActions = [
    {
      title: 'Medewerkers beheren',
      description: 'Bekijk en beheer alle medewerkers',
      icon: Users,
      onClick: () => router.push('/employees'),
      gradient: 'from-orange-400 to-orange-600'
    },
    {
      title: 'Instellingen',
      description: 'Beheer systeem instellingen',
      icon: Settings,
      onClick: () => console.log('Instellingen - nog niet geïmplementeerd'),
      gradient: 'from-gray-400 to-gray-600'
    }
  ];

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      {/* Welcome Notification */}
      {showWelcomeNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 transform transition-all duration-500 ease-out animate-slide-in" style={{ boxShadow: '0 25px 50px rgba(103, 105, 124, 0.15)' }}>
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold" style={{ color: '#120309' }}>
                  Succesvol ingelogd!
                </h4>
                <p className="text-sm mt-1" style={{ color: '#67697c' }}>
                  Welkom terug, {user.fullName}. Je dashboard is klaar voor gebruik.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWelcomeNotification(false);
                  clearJustLoggedIn();
                }}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
              >
                <X className="h-4 w-4" style={{ color: '#67697c' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Welkom in je Jill Dashboard, {user.firstName}
                </h1>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Account Information */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6 h-fit">
                <h3 className="text-xl font-semibold mb-4" style={{ color: '#120309' }}>
                  Account informatie
                </h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #e8eef240, #e8eef220)' }}>
                    <p className="text-sm font-medium mb-1" style={{ color: '#67697c' }}>Gebruikersnaam</p>
                    <p className="font-semibold" style={{ color: '#120309' }}>{user.username}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #e8eef240, #e8eef220)' }}>
                    <p className="text-sm font-medium mb-1" style={{ color: '#67697c' }}>Naam</p>
                    <p className="font-semibold" style={{ color: '#120309' }}>{user.fullName}</p>
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #e8eef240, #e8eef220)' }}>
                    <p className="text-sm font-medium mb-1" style={{ color: '#67697c' }}>Account aangemaakt</p>
                    <p className="font-semibold" style={{ color: '#120309' }}>{new Date(user.createdAt).toLocaleDateString('nl-NL')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold mb-6" style={{ color: '#120309' }}>
                  Snelle acties
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                          <action.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2 group-hover:text-opacity-80 transition-all duration-200" style={{ color: '#120309' }}>
                            {action.title}
                          </h4>
                          <p className="text-sm" style={{ color: '#67697c' }}>
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
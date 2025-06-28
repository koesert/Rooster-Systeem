'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { Users, Settings, CheckCircle, X } from 'lucide-react';

export default function HomePage() {
  usePageTitle('Dashboard - Home');

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

  // Clear justLoggedIn when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      // Clear the notification state when leaving the dashboard
      if (justLoggedIn) {
        clearJustLoggedIn();
      }
    };
  }, [justLoggedIn, clearJustLoggedIn]);

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
                  Welkom in je Dashboard, {user.firstName}!
                </h1>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

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
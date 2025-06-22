'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { Users, Calendar, BarChart3, Settings, Clock, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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

  if (!user) {
    return null; // Will redirect to login
  }

  const quickActions = [
    {
      title: 'Medewerkers beheren',
      description: 'Bekijk en beheer alle medewerkers',
      icon: Users,
      onClick: () => console.log('Navigate to employees'),
      gradient: 'from-orange-400 to-orange-600'
    },
    {
      title: 'Planning bekijken',
      description: 'Bekijk de werkplanning van deze week',
      icon: Calendar,
      onClick: () => console.log('Navigate to planning'),
      gradient: 'from-amber-400 to-amber-600'
    },
    {
      title: 'Rapporten',
      description: 'Bekijk werktijd rapporten en statistieken',
      icon: BarChart3,
      onClick: () => console.log('Navigate to reports'),
      gradient: 'from-orange-500 to-red-500'
    },
    {
      title: 'Instellingen',
      description: 'Beheer systeem instellingen',
      icon: Settings,
      onClick: () => console.log('Navigate to settings'),
      gradient: 'from-gray-400 to-gray-600'
    }
  ];

  const stats = [
    {
      title: 'Actieve Medewerkers',
      value: '24',
      icon: Users,
      change: '+2 deze maand',
      positive: true
    },
    {
      title: 'Geplande Uren',
      value: '168h',
      icon: Clock,
      change: '+12h deze week',
      positive: true
    },
    {
      title: 'Efficiency',
      value: '94%',
      icon: TrendingUp,
      change: '+3% t.o.v. vorige maand',
      positive: true
    }
  ];

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <h1 className="text-4xl font-bold mb-4" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Welkom bij Jill medewerker omgeving
                </h1>

                <div className="rounded-xl p-6 mb-6" style={{ background: 'linear-gradient(135deg, #d5896f20, #e8eef220)', border: '1px solid #d5896f40' }}>
                  <h2 className="text-2xl font-semibold mb-2" style={{ color: '#120309' }}>
                    Hallo, {user.fullName}! 👋
                  </h2>
                  <p style={{ color: '#67697c' }}>
                    Je bent succesvol ingelogd. Hieronder vind je een overzicht van je dashboard en snelle acties.
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #d5896f20, #d5896f10)' }}>
                          <stat.icon className="h-6 w-6" style={{ color: '#d5896f' }} />
                        </div>
                        <span className={`text-sm font-medium ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                          {stat.change}
                        </span>
                      </div>
                      <h3 className="text-sm font-medium mb-1" style={{ color: '#67697c' }}>{stat.title}</h3>
                      <p className="text-2xl font-bold" style={{ color: '#120309' }}>{stat.value}</p>
                    </div>
                  ))}
                </div>
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
                      className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left"
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

          {/* Recent Activity Section */}
          <div className="mt-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-semibold mb-4" style={{ color: '#120309' }}>
                Recente activiteit
              </h3>
              <div className="space-y-3">
                {[
                  { action: 'Nieuwe medewerker toegevoegd', time: '2 uur geleden', user: 'Systeem' },
                  { action: 'Planning geüpdatet voor volgende week', time: '4 uur geleden', user: user.fullName },
                  { action: 'Rapport gegenereerd', time: '1 dag geleden', user: user.fullName }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-xl hover:bg-white/40 transition-all duration-200" style={{ background: 'linear-gradient(135deg, #e8eef220, #e8eef210)' }}>
                    <div>
                      <p className="font-medium" style={{ color: '#120309' }}>{activity.action}</p>
                      <p className="text-sm" style={{ color: '#67697c' }}>Door {activity.user}</p>
                    </div>
                    <span className="text-sm" style={{ color: '#67697c' }}>{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
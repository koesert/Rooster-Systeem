'use client';

import { Users, LogOut, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      icon: Home,
      path: '/home',
      onClick: () => router.push('/home')
    },
    {
      name: 'Medewerkers beheren',
      icon: Users,
      path: '/employees',
      onClick: () => router.push('/employees')
    }
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="sticky bottom-0 text-white w-64 min-h-screen p-4 flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #120309, #090c02)' }}>
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
      <div className="absolute bottom-1/3 left-0 w-24 h-24 rounded-full blur-2xl opacity-8" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

      {/* Header */}
      <div className="mb-8 relative z-10">
        <div className="p-4 rounded-xl mb-4 cursor-pointer" 
             style={{ background: 'linear-gradient(135deg, #d5896f20, #d5896f10)', border: '1px solid rgba(213, 137, 111, 0.2)' }}
             onClick={() => router.push('/home')}>
          <h1 className="text-xl font-bold text-white">Jill Dashboard</h1>
        </div>
        {user && (
          <div className="px-4">
            <p className="text-sm" style={{ color: '#e8eef2' }}>Welkom,</p>
            <p className="font-semibold" style={{ color: '#d5896f' }}>{user.fullName}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 relative z-10">
        <ul className="space-y-3">
          {navigationItems.map((item, index) => (
            <li key={index}>
              <button 
                onClick={item.onClick}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 group hover:shadow-lg ${
                  isActive(item.path) ? 'shadow-lg' : ''
                }`}
                style={{ 
                  color: isActive(item.path) ? '#ffffff' : '#e8eef2',
                  background: isActive(item.path) ? 'linear-gradient(135deg, #d5896f40, #d5896f30)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    const target = e.target as HTMLElement;
                    target.style.background = 'linear-gradient(135deg, #d5896f30, #d5896f20)';
                    target.style.color = '#ffffff';
                    target.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    const target = e.target as HTMLElement;
                    target.style.background = 'transparent';
                    target.style.color = '#e8eef2';
                    target.style.transform = 'translateX(0px)';
                  }
                }}>
                <div className="p-2 rounded-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #d5896f40, #d5896f20)' }}>
                  <item.icon size={20} className="text-white" />
                </div>
                <span className="font-medium">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="mt-auto relative z-10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 group hover:shadow-lg cursor-pointer"
          style={{ color: '#e8eef2' }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLElement;
            target.style.background = 'linear-gradient(135deg, #dc2626, #ef4444)';
            target.style.color = '#ffffff';
            target.style.transform = 'translateX(4px)';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLElement;
            target.style.background = 'transparent';
            target.style.color = '#e8eef2';
            target.style.transform = 'translateX(0px)';
          }}
        >
          <div className="p-2 rounded-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg, #dc262640, #dc262620)' }}>
            <LogOut size={20} className="text-red-300" />
          </div>
          <span className="font-medium">Uitloggen</span>
        </button>
      </div>
    </div>
  );
}
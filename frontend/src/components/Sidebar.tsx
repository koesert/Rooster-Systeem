'use client';

import { Users, LogOut, Home, User, CalendarCheck, CalendarDays, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const { logout, user, isManager } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Handle screen size detection
  useEffect(() => {
    const checkScreenSize = () => {
      if (typeof window !== 'undefined') {
        setIsDesktop(window.innerWidth >= 1250);
      }
    };

    // Check on mount
    checkScreenSize();

    // Add event listener for resize
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);

  // Handle ESC key to close mobile menu
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  // Handle body scroll lock when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Build navigation items based on user role
  const navigationItems = [
    {
      name: 'Dashboard',
      icon: Home,
      path: '/home',
      onClick: () => {
        router.push('/home');
        setIsMobileMenuOpen(false);
      },
      allowedRoles: ['all'] // All users can access dashboard
    },
    {
      name: 'Profiel',
      icon: User,
      path: '/profile',
      onClick: () => {
        router.push('/profile');
        setIsMobileMenuOpen(false);
      },
      allowedRoles: ['all'] // All users can access their profile
    },
    {
      name: 'Rooster',
      icon: CalendarDays,
      path: '/schedule',
      onClick: () => {
        router.push('/schedule');
        setIsMobileMenuOpen(false);
      },
      allowedRoles: ['all'] // All users can view the schedule
    },
    {
      name: 'Beschikbaarheid',
      icon: CalendarCheck,
      path: '/availability',
      onClick: () => {
        router.push('/availability');
        setIsMobileMenuOpen(false);
      },
      allowedRoles: ['all'] // All users can view their availability
    }
  ];

  // Only add employee management for managers
  if (isManager()) {
    navigationItems.push({
      name: 'Medewerkers',
      icon: Users,
      path: '/employees',
      onClick: () => {
        router.push('/employees');
        setIsMobileMenuOpen(false);
      },
      allowedRoles: ['manager']
    });
  }

  const isActive = (path: string) => {
    if (path === '/employees') {
      return pathname === '/employees' || pathname.startsWith('/employees/');
    }
    return pathname === path;
  };

  const handleBackdropClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMobileLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
  };

  return (
    <>
      {/* Mobile Top Bar - Only visible on screens < 1250px */}
      <div className="mobile-header fixed top-0 left-0 right-0 z-40 h-16 px-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(90deg, #120309, #090c02)' }}>
        {/* Hamburger Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg transition-all duration-300 cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #d5896f20, #d5896f10)', border: '1px solid rgba(213, 137, 111, 0.2)' }}
        >
          <Menu className="h-6 w-6 text-white" />
        </button>

        {/* Logo */}
        <div
          className="p-2 rounded-lg cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #d5896f20, #d5896f10)', border: '1px solid rgba(213, 137, 111, 0.2)' }}
          onClick={() => router.push('/home')}
        >
          <h1 className="text-lg font-bold text-white">Jill Dashboard</h1>
        </div>

        {/* Spacer to center logo */}
        <div className="w-10"></div>
      </div>

      {/* Mobile Backdrop - Only visible when menu is open */}
      {isMobileMenuOpen && (
        <div
          className="mobile-backdrop fixed inset-0"
          style={{ background: 'rgba(0, 0, 0, 0.6)', zIndex: 45 }}
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 backdrop-blur-[4px]"></div>
        </div>
      )}

      {/* Desktop Sidebar - Always visible on desktop screens */}
      {/* Mobile Sidebar - Slides in from left when menu is open */}
      <div className={`
        sidebar-main sticky fixed top-0 h-screen text-white w-64 p-4 flex flex-col relative overflow-hidden z-50 transition-transform duration-300 ease-in-out
        ${isDesktop ? 'translate-x-0' : (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full')}
        desktop-sidebar-visible
        
      `} style={{ background: 'linear-gradient(180deg, #120309, #090c02)' }}>
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
        <div className="absolute bottom-1/3 left-0 w-24 h-24 rounded-full blur-2xl opacity-8" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

        {/* Header */}
        <div className="mb-8 relative z-10 flex-shrink-0">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-4 rounded-xl cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #d5896f20, #d5896f10)', border: '1px solid rgba(213, 137, 111, 0.2)' }}
              onClick={() => router.push('/home')}>
              <h1 className="text-xl font-bold text-white">Jill Dashboard</h1>
            </div>
            {/* Close button - only visible on mobile when menu is open */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="close-button p-1 rounded-xl hover:bg-white/10 transition-colors duration-200 cursor-pointer"
              style={{ border: '1px solid rgba(213, 137, 111, 0.2)' }}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          {user && (
            <div className="px-4">
              <p className="text-sm" style={{ color: '#e8eef2' }}>
                Ingelogd als: <span className="font-semibold" style={{ color: '#d5896f' }}>{user.firstName}</span>
              </p>
            </div>
          )}
        </div>

        {/* Navigation - Now scrollable */}
        <nav className="flex-1 relative z-10 overflow-y-0">
          <ul className="space-y-3 pb-4">
            {navigationItems.map((item, index) => (
              <li key={index}>
                <button
                  onClick={item.onClick}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 group cursor-pointer hover:shadow-lg ${isActive(item.path) ? 'shadow-lg' : ''
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
          {/* Logout Button - Always visible at bottom */}
        <div className="relative z-10 flex-shrink-0 pt-4 border-t border-gray-700/30 mb-30">
          <button
            onClick={handleMobileLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 group hover:shadow-lg cursor-pointer"
            style={{ color: '#e8eef2' }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.background = 'linear-gradient(135deg,rgb(224, 61, 61),rgb(226, 119, 119))';
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
            <div className="p-2 rounded-lg transition-all duration-300" style={{ background: 'linear-gradient(135deg,rgba(173, 33, 33, 0.25), #dc262620)' }}>
              <LogOut size={20} className="text-red-300" />
            </div>
            <span className="font-medium">Uitloggen</span>
          </button>
        </div>
        </nav>
      </div>

      <style jsx>{`
        /* Mobile view - screens less than 1250px */
        @media (max-width: 1249px) {
          .mobile-header {
            display: flex !important;
          }
          .mobile-backdrop {
            display: block;
          }
          .sidebar-main {
            position: fixed !important;
          }
          .close-button {
            display: block !important;
          }
          

        }

        /* Desktop view - screens 1250px and up */
        @media (min-width: 1250px) {
          .mobile-header {
            display: none !important;
          }
          .mobile-backdrop {
            display: none !important;
          }
          .close-button {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Set page title
  useEffect(() => {
    document.title = 'Jill Dashboard';
  }, []);

  // Redirect based on auth status
  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // User is logged in, redirect to home dashboard
        router.push('/home');
      } else {
        // User is not logged in, redirect to login
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Loading state while checking authentication
  return <LoadingScreen message="Authenticatie controleren" />;
}
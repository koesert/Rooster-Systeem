'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welkom bij Jill medewerker omgeving
            </h1>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-2">
                Hallo, {user.fullName}!
              </h2>
              <p className="text-blue-700">
                Je bent succesvol ingelogd. Gebruik het menu aan de linkerkant om door de applicatie te navigeren.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Account informatie
                </h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p><span className="font-medium">Gebruikersnaam:</span> {user.username}</p>
                  <p><span className="font-medium">Naam:</span> {user.fullName}</p>
                  <p><span className="font-medium">Account aangemaakt:</span> {new Date(user.createdAt).toLocaleDateString('nl-NL')}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Snelle acties
                </h3>
                <div className="space-y-3">
                  <button className="w-full text-left p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-200">
                    <span className="text-sm font-medium text-gray-900">Medewerkers beheren</span>
                    <p className="text-xs text-gray-500 mt-1">Bekijk en beheer alle medewerkers</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
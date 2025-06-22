'use client';

import { Users, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4 flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Jill medewerker omgeving</h1>
        {user && (
          <p className="text-gray-300 text-sm mt-2">Welkom, {user.fullName}</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        <ul className="space-y-2">
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors duration-200">
              <Users size={20} />
              <span>Medewerkers beheren</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors duration-200"
        >
          <LogOut size={20} />
          <span>Uitloggen</span>
        </button>
      </div>
    </div>
  );
}
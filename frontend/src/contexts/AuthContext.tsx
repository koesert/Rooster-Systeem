'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Employee, AuthContextType, Role } from '@/types/auth';
import * as api from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const refreshToken = api.getRefreshToken();

      if (refreshToken) {
        try {
          const success = await api.refreshAccessToken();
          if (success) {
            // Note: We would need a /me endpoint to get current user info
            // For now, we'll handle this differently by storing user data
            const userData = localStorage.getItem('userData');
            if (userData) {
              setUser(JSON.parse(userData));
            }
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error('Session check failed:', error);
        }
      }

      setIsLoading(false);
    };

    checkExistingSession();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.login({ username, password });
      setUser(response.user);
      setJustLoggedIn(true);

      // Store user data for session persistence
      localStorage.setItem('userData', JSON.stringify(response.user));

      return { success: true };
    } catch (error: any) {
      let errorMessage = 'Inloggen mislukt';

      if (error.status === 401) {
        errorMessage = 'Ongeldige gebruikersnaam of wachtwoord';
      } else if (error.status === 500) {
        errorMessage = 'Server fout, probeer het later opnieuw';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setJustLoggedIn(false);
      localStorage.removeItem('userData');
      // Redirect to login page
      window.location.href = '/login';
    }
  };

  const clearJustLoggedIn = () => {
    setJustLoggedIn(false);
  };

  // Role-based helper methods
  const isManager = (): boolean => {
    return user?.role === Role.Manager;
  };

  const isManagerOrShiftLeider = (): boolean => {
    return user?.role === Role.Manager || user?.role === Role.ShiftLeider;
  };

  const hasAccess = (requiredRole: Role): boolean => {
    if (!user) return false;
    // Only managers have access to employee management
    if (requiredRole === Role.Manager) {
      return user.role === Role.Manager;
    }
    return user.role >= requiredRole;
  };

  const getRoleName = (role: Role): string => {
    switch (role) {
      case Role.Manager:
        return 'Manager';
      case Role.ShiftLeider:
        return 'Shift Leider';
      case Role.Werknemer:
        return 'Werknemer';
      default:
        return 'Onbekend';
    }
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    justLoggedIn,
    clearJustLoggedIn,
    isManager,
    isManagerOrShiftLeider,
    hasAccess,
    getRoleName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
};
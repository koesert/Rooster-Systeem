'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Employee, AuthContextType } from '@/types/auth';
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
            // Get user info from token or make an API call
            // For now, we'll need to make a call to get current user
            // Since your backend doesn't have a /me endpoint, we'll handle this differently
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
      setJustLoggedIn(true); // Mark that user just logged in
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
      // Redirect to login page
      window.location.href = '/login';
    }
  };

  const clearJustLoggedIn = () => {
    setJustLoggedIn(false);
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    justLoggedIn,
    clearJustLoggedIn,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
};
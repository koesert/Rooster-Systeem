"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Employee, AuthContextType, Role } from "@/types/auth";
import * as api from "@/lib/api";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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
            const userData = localStorage.getItem("userData");
            if (userData) {
              setUser(JSON.parse(userData));
            }

            // Check if user just logged in (only show notification once)
            const justLoggedInFlag = localStorage.getItem("justLoggedIn");
            if (justLoggedInFlag === "true") {
              setJustLoggedIn(true);
              // Remove the flag immediately so it doesn't show again
              localStorage.removeItem("justLoggedIn");
            }

            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Session check failed:", error);
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
      localStorage.setItem("userData", JSON.stringify(response.user));
      // Store justLoggedIn state to show notification only once
      localStorage.setItem("justLoggedIn", "true");

      return { success: true };
    } catch (error: unknown) {
      let errorMessage = "Inloggen mislukt";

      if (error && typeof error === "object" && "status" in error) {
        const errorWithStatus = error as { status: number; message?: string };

        if (errorWithStatus.status === 401) {
          errorMessage = "Ongeldige gebruikersnaam of wachtwoord";
        } else if (errorWithStatus.status === 500) {
          errorMessage = "Server fout, probeer het later opnieuw";
        } else if (errorWithStatus.message) {
          errorMessage = errorWithStatus.message;
        }
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
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setJustLoggedIn(false);
      localStorage.removeItem("userData");
      localStorage.removeItem("justLoggedIn");
      // Redirect to login page
      window.location.href = "/login";
    }
  };

  // New method to refresh user data afrelater profile updates
  const refreshUserData = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const updatedUser = await api.getCurrentProfile();
      setUser(updatedUser);

      // Update stored user data
      localStorage.setItem("userData", JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      console.error("Error refreshing user data:", error);
      return false;
    }
  };

  const clearJustLoggedIn = () => {
    setJustLoggedIn(false);
    // Also clear from localStorage to prevent it from reappearing
    localStorage.removeItem("justLoggedIn");
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
        return "Manager";
      case Role.ShiftLeider:
        return "Shift leider";
      case Role.Werknemer:
        return "Werknemer";
      default:
        return "Onbekend";
    }
  };

  const value = {
    user,
    login,
    logout,
    isLoading,
    justLoggedIn,
    clearJustLoggedIn,
    refreshUserData,
    isManager,
    isManagerOrShiftLeider,
    hasAccess,
    getRoleName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

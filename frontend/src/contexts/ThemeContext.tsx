"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { DEFAULT_THEME } from "@/config/theme";

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { company } = useAuth();

  useEffect(() => {
    // Apply company colors to CSS custom properties
    if (company) {
      document.documentElement.style.setProperty(
        "--color-primary",
        company.colors.primary
      );
      document.documentElement.style.setProperty(
        "--color-secondary",
        company.colors.secondary
      );
      document.documentElement.style.setProperty(
        "--color-accent",
        company.colors.accent
      );
    } else {
      // Use default theme colors when no company is set (login page, SuperAdmin)
      document.documentElement.style.setProperty("--color-primary", DEFAULT_THEME.primary);
      document.documentElement.style.setProperty("--color-secondary", DEFAULT_THEME.secondary);
      document.documentElement.style.setProperty("--color-accent", DEFAULT_THEME.accent);
    }
  }, [company]);

  return (
    <ThemeContext.Provider value={{}}>{children}</ThemeContext.Provider>
  );
};

"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";

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
      // Use default neutral colors when no company is set (login page)
      document.documentElement.style.setProperty("--color-primary", "#3b82f6"); // blue-500
      document.documentElement.style.setProperty(
        "--color-secondary",
        "#6366f1"
      ); // indigo-500
      document.documentElement.style.setProperty("--color-accent", "#8b5cf6"); // violet-500
    }
  }, [company]);

  return (
    <ThemeContext.Provider value={{}}>{children}</ThemeContext.Provider>
  );
};

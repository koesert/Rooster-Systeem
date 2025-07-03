"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useModal } from "@/contexts/ModalContext";
import { AlertTriangle } from "lucide-react";

interface ErrorContextType {
  showApiError: (error: unknown, customMessage?: string) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error("useError must be used within an ErrorProvider");
  }
  return context;
};

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { showAlert } = useModal();

  const showApiError = (error: unknown, customMessage?: string) => {
    let errorMessage = customMessage || "Er is een onbekende fout opgetreden";

    // Parse different error types
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      errorMessage = error.message;
    } else if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      typeof error.status === "number"
    ) {
      switch (error.status) {
        case 400:
          errorMessage =
            "Ongeldige gegevens. Controleer je invoer en probeer het opnieuw.";
          break;
        case 401:
          errorMessage =
            "Je bent niet ingelogd of je sessie is verlopen. Log opnieuw in.";
          break;
        case 403:
          errorMessage = "Je hebt geen toegang tot deze functie.";
          break;
        case 404:
          errorMessage = "De gevraagde gegevens zijn niet gevonden.";
          break;
        case 500:
          errorMessage =
            "Er is een serverfout opgetreden. Probeer het later opnieuw.";
          break;
        default:
          errorMessage = `Er is een fout opgetreden (${error.status}).`;
      }
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    // Show the error in a modal
    showAlert({
      title: "Fout opgetreden",
      message: errorMessage,
      confirmText: "OK",
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
    });
  };

  const value = {
    showApiError,
  };

  return (
    <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>
  );
};

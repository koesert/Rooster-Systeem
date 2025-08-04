"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useValidation, ValidationConfigs } from "@/hooks/useValidation";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import {
  CalendarCheck,
  Calendar,
  MessageSquare,
  ArrowLeft,
  X,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { CreateTimeOffRequestDto } from "@/types/timeoff";
import * as api from "@/lib/api";
import { fromInputDateFormat } from "@/utils/dateUtils";

export default function CreateTimeOffPage() {
  usePageTitle("Dashboard - Nieuwe vrij aanvraag");

  const { user, isLoading, isManager } = useAuth();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<CreateTimeOffRequestDto>({
    reason: "",
    startDate: "",
    endDate: "",
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation setup
  const { fieldErrors, validateForm, handleInputChange, clearAllErrors } =
    useValidation({
      ...ValidationConfigs.timeoffCreate,
      validateOnChange: false, // Only validate on submit
    });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setError(null);

    // Add isManager to form data for validation
    const formDataWithManager = {
      ...formData,
      isManager: isManager(),
    };

    if (!validateForm(formDataWithManager)) {
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: CreateTimeOffRequestDto = {
        reason: formData.reason.trim(),
        startDate: fromInputDateFormat(formData.startDate), // Convert YYYY-MM-DD to DD-MM-YYYY
        endDate: fromInputDateFormat(formData.endDate), // Convert YYYY-MM-DD to DD-MM-YYYY
      };

      await api.createTimeOffRequest(requestData);

      // Navigate back to time off list
      router.push("/timeoff");
    } catch (error: unknown) {
      // Parse error for comprehensive error handling
      let errorMessage =
        "Er is een onbekende fout opgetreden bij het aanmaken van de aanvraag";

      if (error && typeof error === "object") {
        // Check if it's an ApiError with message
        if ("message" in error && typeof error.message === "string") {
          const message = error.message;

          // Check if the message is a JSON string
          if (message.startsWith("{") && message.endsWith("}")) {
            try {
              const parsed = JSON.parse(message);
              if (parsed.message && typeof parsed.message === "string") {
                errorMessage = parsed.message;
              } else {
                errorMessage = message;
              }
            } catch {
              // If JSON parsing fails, use the raw message
              errorMessage = message;
            }
          } else {
            errorMessage = message;
          }
        }
        // Check for status code to provide fallback messages
        else if ("status" in error) {
          const status = error.status as number;
          switch (status) {
            case 400:
              errorMessage =
                "De ingevoerde gegevens zijn niet geldig. Controleer de datums en probeer het opnieuw.";
              break;
            case 401:
              errorMessage =
                "Je bent niet ingelogd. Log opnieuw in en probeer het opnieuw.";
              break;
            case 403:
              errorMessage =
                "Je hebt geen toestemming om vrij aanvragen aan te maken.";
              break;
            case 422:
              errorMessage =
                "De aanvraag bevat fouten. Controleer de periode en reden.";
              break;
            case 409:
              errorMessage =
                "Er is al een aanvraag voor deze periode. Kies andere datums.";
              break;
            case 500:
              errorMessage =
                "Er is een serverfout opgetreden. Probeer het later opnieuw.";
              break;
            default:
              errorMessage = `Er is een fout opgetreden. Probeer het later opnieuw.`;
          }
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (
    field: keyof CreateTimeOffRequestDto,
    value: string
  ) => {
    const formDataWithManager = {
      ...formData,
      isManager: isManager(),
    };

    handleInputChange(field, value, formDataWithManager, setFormData);
  };

  if (isLoading) {
    return <LoadingScreen message="Nieuwe vrij aanvraag laden" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)",
      }}
    >
      <Sidebar />

      <main className="layout-main-content overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
                style={{
                  background: "linear-gradient(135deg, #d5896f, #e8eef2)",
                }}
              ></div>
              <div
                className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15"
                style={{
                  background: "linear-gradient(45deg, #d5896f, #67697c)",
                }}
              ></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push("/timeoff")}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug naar vrij aanvragen"
                    >
                      <ArrowLeft
                        className="h-5 w-5"
                        style={{ color: "#67697c" }}
                      />
                    </button>
                    <div
                      className="p-3 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, #d5896f, #d5896f90)",
                      }}
                    >
                      <CalendarCheck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1
                        className="text-4xl font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, #120309, #67697c)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Nieuwe vrij aanvraag
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* General Error */}
              {error && (
                <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-red-700 text-center font-medium">
                  {error}
                </div>
              )}

              {/* Period Information */}
              <div>
                <h3
                  className="text-xl font-semibold mb-6"
                  style={{ color: "#120309" }}
                >
                  Periode informatie
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <div>
                    <label
                      htmlFor="startDate"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Startdatum <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar
                          className="h-5 w-5"
                          style={{ color: "#d5896f" }}
                        />
                      </div>
                      <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        value={formData.startDate}
                        onChange={(e) =>
                          handleFieldChange("startDate", e.target.value)
                        }
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                          fieldErrors.startDate
                            ? "border-red-300 focus:border-red-500"
                            : "border-gray-300 focus:border-transparent"
                        }`}
                        style={{ color: "#120309" }}
                        onFocus={(e) => {
                          if (!fieldErrors.startDate) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
                          }
                        }}
                        onBlur={(e) => {
                          if (!fieldErrors.startDate) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = "";
                            target.style.borderColor = "#d1d5db";
                          }
                        }}
                        disabled={isSubmitting}
                      />
                    </div>
                    {fieldErrors.startDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {fieldErrors.startDate}
                      </p>
                    )}
                  </div>

                  {/* End Date */}
                  <div>
                    <label
                      htmlFor="endDate"
                      className="block text-sm font-semibold mb-2"
                      style={{ color: "#120309" }}
                    >
                      Einddatum <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar
                          className="h-5 w-5"
                          style={{ color: "#d5896f" }}
                        />
                      </div>
                      <input
                        type="date"
                        id="endDate"
                        name="endDate"
                        value={formData.endDate}
                        onChange={(e) =>
                          handleFieldChange("endDate", e.target.value)
                        }
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                          fieldErrors.endDate
                            ? "border-red-300 focus:border-red-500"
                            : "border-gray-300 focus:border-transparent"
                        }`}
                        style={{ color: "#120309" }}
                        onFocus={(e) => {
                          if (!fieldErrors.endDate) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow =
                              "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                            target.style.borderColor = "#d5896f";
                          }
                        }}
                        onBlur={(e) => {
                          if (!fieldErrors.endDate) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = "";
                            target.style.borderColor = "#d1d5db";
                          }
                        }}
                        disabled={isSubmitting}
                      />
                    </div>
                    {fieldErrors.endDate && (
                      <p className="mt-2 text-sm text-red-600 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {fieldErrors.endDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div>
                <h3
                  className="text-xl font-semibold mb-6"
                  style={{ color: "#120309" }}
                >
                  Aanvraag details
                </h3>
                <div>
                  <label
                    htmlFor="reason"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#120309" }}
                  >
                    Reden <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
                      <MessageSquare
                        className="h-5 w-5"
                        style={{ color: "#d5896f" }}
                      />
                    </div>
                    <textarea
                      id="reason"
                      name="reason"
                      rows={4}
                      value={formData.reason}
                      onChange={(e) =>
                        handleFieldChange("reason", e.target.value)
                      }
                      placeholder="Beschrijf de reden voor je vrij aanvraag..."
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg resize-none ${
                        fieldErrors.reason
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-300 focus:border-transparent"
                      }`}
                      style={{ color: "#120309" }}
                      onFocus={(e) => {
                        if (!fieldErrors.reason) {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.boxShadow =
                            "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                          target.style.borderColor = "#d5896f";
                        }
                      }}
                      onBlur={(e) => {
                        if (!fieldErrors.reason) {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.boxShadow = "";
                          target.style.borderColor = "#d1d5db";
                        }
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.reason && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {fieldErrors.reason}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    {formData.reason.length}/500 tekens
                  </p>
                </div>
              </div>

              {/* Information Note */}
              {!isManager() && (
                <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <div>
                      <h4 className="font-semibold text-blue-900">
                        Belangrijk
                      </h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Vrij aanvragen moeten minimaal 2 weken van tevoren
                        worden ingediend en kunnen maximaal 8 weken (56 dagen)
                        duren.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between space-x-4 pt-6 border-t border-gray-200/50">
                <button
                  type="button"
                  onClick={() => router.push("/timeoff")}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 max-[500px]:space-x-0 px-6 py-3 max-[500px]:px-3 rounded-xl border border-gray-300 text-gray-700 font-semibold transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <X className="h-5 w-5" />
                  <span className="max-[500px]:hidden">Annuleren</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Aanmaken...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>Indienen</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

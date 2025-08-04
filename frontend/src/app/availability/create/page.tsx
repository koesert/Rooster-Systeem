"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/ErrorContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import {
  ArrowLeft,
  Save,
  X,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Plane,
  Lock,
  Eye,
} from "lucide-react";
import {
  UpdateWeekAvailability,
  UpdateDayAvailability,
  AvailabilityStatus,
  getAvailabilityStatusFromDay,
} from "@/types/availability";
import * as api from "@/lib/api";

export default function CreateAvailabilityPage() {
  usePageTitle("Dashboard - Beschikbaarheid beheren");

  const { user, isLoading } = useAuth();
  const { showApiError } = useError();
  const router = useRouter();

  // Week navigation state - start at 1 (next week) instead of 0 (current week)
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(1); // 0 = current week (readonly), 1 = next week (first editable), etc.

  // Form state
  const [formData, setFormData] = useState<UpdateDayAvailability[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]); // Store original data to check for verlof
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveAndGoToNextWeek, setSaveAndGoToNextWeek] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Initialize form data when selectedWeekIndex changes
  useEffect(() => {
    initializeFormData();
  }, [selectedWeekIndex]);

  const initializeFormData = useCallback(async () => {
    setIsLoadingAvailability(true);
    const startOfWeek = getSelectedWeekStart();
    const weekStartString = formatDateString(startOfWeek);

    try {
      // Try to fetch existing availability for this week
      const existingAvailability = await api.getMyWeekAvailability(
        weekStartString,
        { showErrors: false }
      );

      // If we have existing data, use it
      if (
        existingAvailability &&
        existingAvailability.days &&
        existingAvailability.days.length > 0
      ) {
        const weekDays: UpdateDayAvailability[] = [];
        const originalDays: any[] = [];

        // Generate 7 days (Monday to Sunday) and map with existing data
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startOfWeek);
          currentDate.setDate(currentDate.getDate() + i);
          const dateString = formatDateString(currentDate);

          // Find existing availability for this date
          const existingDay = existingAvailability.days.find(
            (day) => day.date === dateString
          );

          // Store original data to check for verlof
          originalDays.push(existingDay);

          // Check if this day has verlof status
          const hasVerlof =
            existingDay &&
            getAvailabilityStatusFromDay(existingDay) ===
              AvailabilityStatus.TimeOff;

          // Convert backend status to isAvailable for frontend form
          let isAvailable: boolean | null = true; // Default to available
          if (hasVerlof) {
            isAvailable = null; // Don't set isAvailable for verlof days
          } else if (existingDay?.status === AvailabilityStatus.Available) {
            isAvailable = true;
          } else if (existingDay?.status === AvailabilityStatus.NotAvailable) {
            isAvailable = false;
          } else if (existingDay?.isAvailable !== undefined) {
            // Fallback to legacy isAvailable field if status not set
            isAvailable = existingDay.isAvailable;
          }

          weekDays.push({
            date: dateString,
            isAvailable: isAvailable,
            status: existingDay?.status, // Keep original status for reference
            notes: existingDay?.notes || "",
          });
        }

        setFormData(weekDays);
        setOriginalData(originalDays);
      } else {
        // No existing data, create default availability (all available)
        initializeDefaultFormData();
      }
    } catch {
      // If fetching fails (e.g., no availability exists yet), create default data
      console.log("No existing availability found, using defaults");
      initializeDefaultFormData();
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [selectedWeekIndex]); // Dependencies for useCallback

  const initializeDefaultFormData = () => {
    const startOfWeek = getSelectedWeekStart();
    const weekDays: UpdateDayAvailability[] = [];

    // Generate 7 days (Monday to Sunday)
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(currentDate.getDate() + i);

      weekDays.push({
        date: formatDateString(currentDate),
        isAvailable: true, // Default to available
        notes: "",
      });
    }

    setFormData(weekDays);
    setOriginalData([]);
  };

  const getSelectedWeekStart = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday (0) properly

    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday + selectedWeekIndex * 7);

    return monday;
  };

  const formatDateString = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getDutchDayName = (date: Date): string => {
    const dayNames = [
      "zondag",
      "maandag",
      "dinsdag",
      "woensdag",
      "donderdag",
      "vrijdag",
      "zaterdag",
    ];
    return dayNames[date.getDay()];
  };

  const formatDisplayDate = (dateString: string): string => {
    const [day, month, year] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayName = getDutchDayName(date);
    return `${
      dayName.charAt(0).toUpperCase() + dayName.slice(1)
    } ${day}-${month}`;
  };

  /**
   * Calculates ISO week number using the ISO 8601 standard (same as view page)
   * Week 1 is the first week with at least 4 days in the new year
   */
  const getWeekNumber = (): number => {
    const startOfWeek = getSelectedWeekStart();

    // Create UTC date to avoid timezone issues
    const d = new Date(
      Date.UTC(
        startOfWeek.getFullYear(),
        startOfWeek.getMonth(),
        startOfWeek.getDate()
      )
    );

    // ISO week calculation: find nearest Thursday
    const dayNum = d.getUTCDay() || 7; // Make Sunday = 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  };

  const getWeekStatusText = (): string => {
    if (selectedWeekIndex === 0) return "Huidige week";
    if (selectedWeekIndex === 1) return "Volgende week";
    if (selectedWeekIndex === 2) return "2 weken vooruit";
    return `${selectedWeekIndex} weken vooruit`;
  };

  // Check if current week is selected (readonly mode)
  const isCurrentWeek = (): boolean => {
    return selectedWeekIndex === 0;
  };

  // Check if a day has verlof (TimeOff status)
  const isDayVerlof = (dayIndex: number): boolean => {
    const originalDay = originalData[dayIndex];
    if (!originalDay) return false;
    return (
      getAvailabilityStatusFromDay(originalDay) === AvailabilityStatus.TimeOff
    );
  };

  const updateDayAvailability = (
    dayIndex: number,
    field: keyof UpdateDayAvailability,
    value: string | boolean
  ) => {
    // Don't allow updates for current week or verlof days
    if (isCurrentWeek() || (isDayVerlof(dayIndex) && field === "isAvailable")) {
      return;
    }

    setFormData((prev) =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const handleSubmit = async () => {
    // Don't allow submit for current week
    if (isCurrentWeek()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert formData to backend format and filter out verlof days
      const filteredFormData = formData.map((day, index) => {
        if (isDayVerlof(index)) {
          // Keep original verlof status, don't submit isAvailable changes
          return {
            date: day.date,
            status: AvailabilityStatus.TimeOff, // Ensure verlof status is preserved
            notes: day.notes,
          };
        }

        // Convert isAvailable to status for backend
        let status: AvailabilityStatus | null = null;
        if (day.isAvailable === true) {
          status = AvailabilityStatus.Available;
        } else if (day.isAvailable === false) {
          status = AvailabilityStatus.NotAvailable;
        }
        // If isAvailable is null, status remains null (remove availability record)

        return {
          date: day.date,
          status: status,
          notes: day.notes,
        };
      });

      const updateData: UpdateWeekAvailability = {
        employeeId: user!.id, // Will be set by backend
        weekStart: formatDateString(getSelectedWeekStart()),
        days: filteredFormData,
      };

      console.log("Sending to backend:", updateData); // Debug log

      await api.updateMyWeekAvailability(updateData);

      // Check if we should go to next week or back to availability page
      if (saveAndGoToNextWeek && selectedWeekIndex < 4) {
        // Go to next week (max index is 4 for 5 weeks)
        setSelectedWeekIndex((prev) => prev + 1);
        setSaveAndGoToNextWeek(false); // Reset checkbox
      } else {
        // Success! Redirect back to availability page with updated flag
        router.push("/availability?updated=true");
      }
    } catch (error: unknown) {
      console.error("Error saving availability:", error);

      let errorMessage =
        "Er is een fout opgetreden bij het opslaan van de beschikbaarheid";

      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        "message" in error
      ) {
        const errorWithDetails = error as { status: number; message: string };

        if (errorWithDetails.status === 400) {
          errorMessage = "Controleer je invoer en probeer het opnieuw";
        } else if (
          errorWithDetails.status === 401 ||
          errorWithDetails.status === 403
        ) {
          errorMessage =
            "Je hebt geen toestemming om beschikbaarheid bij te werken";
        } else if (errorWithDetails.message) {
          errorMessage = errorWithDetails.message;
        }
      }

      setError(errorMessage);
      showApiError(error, "Fout bij het opslaan van beschikbaarheid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    if (direction === "prev" && selectedWeekIndex > 0) {
      setSelectedWeekIndex((prev) => prev - 1);
    } else if (direction === "next" && selectedWeekIndex < 4) {
      // Max 5 weeks ahead (0-4)
      setSelectedWeekIndex((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Pagina laden" />;
  }

  if (!user) {
    return null; // Will redirect to login
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
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 max-[500px]:p-2 relative overflow-hidden">
              {/* Decorative background elements */}
              <div
                className="absolute top-0 right-0 w-16 h-16 rounded-full blur-3xl opacity-20"
                style={{
                  background: "linear-gradient(135deg, #d5896f, #e8eef2)",
                }}
              ></div>
              <div
                className="absolute bottom-0 left-0 w-12 h-12 rounded-full blur-2xl opacity-15"
                style={{
                  background: "linear-gradient(45deg, #d5896f, #67697c)",
                }}
              ></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push("/availability")}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug naar beschikbaarheid"
                    >
                      <ArrowLeft
                        className="h-5 w-5"
                        style={{ color: "#67697c" }}
                      />
                    </button>
                    <div
                      className="p-2 rounded-xl"
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
                        Beschikbaarheid beheren
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Week Notice */}
          {isCurrentWeek() && (
            <div className="mb-8">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                  <Eye className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="text-gray-600">
                      De huidige week kan niet meer worden aangepast
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <X className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Fout</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Week Selection */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigateWeek("prev")}
                  disabled={selectedWeekIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-sm font-medium max-[500px]:hidden">
                    Vorige week
                  </span>
                </button>

                <div className="text-center">
                  <h2
                    className="text-xl font-bold"
                    style={{ color: "#120309" }}
                  >
                    Week {getWeekNumber()}
                  </h2>
                  <p className="text-sm" style={{ color: "#67697c" }}>
                    {getWeekStatusText()}
                  </p>
                </div>

                <button
                  onClick={() => navigateWeek("next")}
                  disabled={selectedWeekIndex >= 4}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="text-sm font-medium max-[500px]:hidden">
                    Volgende week
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Form Section */}
          {isLoadingAvailability ? (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d5896f] mx-auto mb-4"></div>
                  <p className="text-lg" style={{ color: "#67697c" }}>
                    Beschikbaarheid laden...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 ${
                isCurrentWeek() ? "opacity-75" : ""
              }`}
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#120309" }}
                  >
                    Beschikbaarheid per dag
                  </h3>

                  {formData.map((day, index) => {
                    const isVerlof = isDayVerlof(index);
                    const isReadonly = isCurrentWeek();

                    return (
                      <div key={day.date} className="space-y-2">
                        {/* Day Info */}
                        <h4
                          className="font-medium text-lg"
                          style={{ color: "#120309" }}
                        >
                          {formatDisplayDate(day.date)}
                          {isVerlof && (
                            <span className="ml-2 inline-flex items-center space-x-1 text-sm font-medium px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">
                              <Plane className="h-3 w-3" />
                              <span>Verlof</span>
                            </span>
                          )}
                        </h4>

                        <div
                          className={`p-4 border border-gray-200 rounded-xl ${
                            isVerlof
                              ? "bg-purple-50/50"
                              : isReadonly
                              ? "bg-gray-50/50"
                              : "bg-gray-50/50"
                          }`}
                        >
                          {isVerlof ? (
                            // Verlof day - show as read-only
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3 p-4 bg-purple-100/60 rounded-lg border border-purple-200">
                                <Lock className="h-5 w-5 text-purple-600" />
                                <div>
                                  <p className="text-sm font-medium text-purple-800">
                                    Je hebt verlof op deze dag
                                  </p>
                                  <p className="text-xs text-purple-600">
                                    Beschikbaarheid kan niet worden aangepast
                                  </p>
                                </div>
                              </div>

                              {/* Show notes field for verlof days (can still be edited if not current week) */}
                              <div>
                                <label
                                  htmlFor={`notes-${index}`}
                                  className="text-sm font-medium"
                                  style={{ color: "#67697c" }}
                                >
                                  Notities (optioneel)
                                </label>
                                <textarea
                                  id={`notes-${index}`}
                                  value={day.notes || ""}
                                  onChange={(e) =>
                                    updateDayAvailability(
                                      index,
                                      "notes",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Opmerkingen..."
                                  rows={2}
                                  maxLength={500}
                                  disabled={isReadonly}
                                  className="mt-1 block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d5896f] focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                  style={{
                                    borderColor: "#d1d5db",
                                  }}
                                />
                                <p
                                  className="mt-1 text-xs"
                                  style={{ color: "#67697c" }}
                                >
                                  {day.notes?.length || 0}/500 tekens
                                </p>
                              </div>
                            </div>
                          ) : isReadonly ? (
                            // Current week - readonly mode
                            <div className="space-y-3">
                              <div className="flex items-center space-x-3 p-4 bg-gray-100/60 rounded-lg border border-gray-200">
                                <Lock className="h-5 w-5 text-gray-600" />
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {day.isAvailable
                                      ? "Beschikbaar"
                                      : "Niet beschikbaar"}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Huidige week kan niet worden aangepast
                                  </p>
                                </div>
                              </div>

                              {day.notes && (
                                <div>
                                  <label
                                    className="text-sm font-medium"
                                    style={{ color: "#67697c" }}
                                  >
                                    Notities
                                  </label>
                                  <div className="mt-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-sm text-gray-700">
                                      {day.notes}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            // Regular day - normal availability selection
                            <div className="flex-1">
                              <div className="space-y-3">
                                <div>
                                  <label
                                    className="text-sm font-medium"
                                    style={{ color: "#67697c" }}
                                  >
                                    Beschikbaarheid *
                                  </label>
                                  <div className="mt-2 flex space-x-4">
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`availability-${index}`}
                                        value="true"
                                        checked={day.isAvailable === true}
                                        onChange={() =>
                                          updateDayAvailability(
                                            index,
                                            "isAvailable",
                                            true
                                          )
                                        }
                                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                                      />
                                      <span className="ml-2 text-sm font-medium text-green-700">
                                        Ja
                                      </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`availability-${index}`}
                                        value="false"
                                        checked={day.isAvailable === false}
                                        onChange={() =>
                                          updateDayAvailability(
                                            index,
                                            "isAvailable",
                                            false
                                          )
                                        }
                                        className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500 cursor-pointer"
                                      />
                                      <span className="ml-2 text-sm font-medium text-red-700">
                                        Nee
                                      </span>
                                    </label>
                                  </div>
                                </div>

                                {/* Notes */}
                                <div>
                                  <label
                                    htmlFor={`notes-${index}`}
                                    className="text-sm font-medium"
                                    style={{ color: "#67697c" }}
                                  >
                                    Notities (optioneel)
                                  </label>
                                  <textarea
                                    id={`notes-${index}`}
                                    value={day.notes || ""}
                                    onChange={(e) =>
                                      updateDayAvailability(
                                        index,
                                        "notes",
                                        e.target.value
                                      )
                                    }
                                    placeholder="Opmerkingen..."
                                    rows={2}
                                    maxLength={500}
                                    className="mt-1 block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d5896f] focus:border-transparent resize-none"
                                    style={{
                                      borderColor: "#d1d5db",
                                    }}
                                  />
                                  <p
                                    className="mt-1 text-xs"
                                    style={{ color: "#67697c" }}
                                  >
                                    {day.notes?.length || 0}/500 tekens
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save and Next Week Option - only show if not current week */}
                {!isCurrentWeek() && (
                  <div className="border-t border-gray-200/50 pt-6">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAndGoToNextWeek}
                        onChange={(e) =>
                          setSaveAndGoToNextWeek(e.target.checked)
                        }
                        disabled={selectedWeekIndex >= 4}
                        className="h-4 w-4 text-[#d5896f] border-gray-300 rounded focus:ring-[#d5896f] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span
                        className={`text-sm font-medium ${
                          selectedWeekIndex >= 4
                            ? "text-gray-400"
                            : "text-gray-700"
                        }`}
                      >
                        Opslaan en naar volgende week
                      </span>
                    </label>
                    {selectedWeekIndex >= 4 && (
                      <p className="text-xs text-gray-500 mt-1 ml-7">
                        Je kunt maximaal 5 weken vooruit plannen
                      </p>
                    )}
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex items-center justify-between space-x-4 pt-6 border-t border-gray-200/50">
                  <button
                    onClick={() => router.push("/availability")}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 max-[500px]:space-x-0 px-6 py-3 max-[500px]:px-3 rounded-xl border border-gray-300 text-gray-700 font-semibold transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                    <span className="max-[500px]:hidden">Annuleren</span>
                  </button>

                  {/* Only show save button if not current week */}
                  {!isCurrentWeek() && (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        background:
                          "linear-gradient(135deg, #d5896f, #d5896f90)",
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>Opslaan...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          <span>Opslaan</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

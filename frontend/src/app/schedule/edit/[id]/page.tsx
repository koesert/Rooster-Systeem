"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useValidation } from "@/hooks/useValidation";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Edit,
  User,
  Calendar,
  Clock,
  Type,
  FileText,
  ArrowLeft,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  CalendarCheck,
  Plane,
} from "lucide-react";
import { UpdateShiftRequest, ShiftType, Shift } from "@/types/shift";
import { Employee } from "@/types/auth";
import {
  WeekAvailability,
  AvailabilityStatus,
  getAvailabilityStatusFromDay,
} from "@/types/availability";
import * as api from "@/lib/api";
import { toInputDateFormat, fromInputDateFormat } from "@/utils/dateUtils";

export default function EditShiftPage() {
  const params = useParams();
  const shiftId = parseInt(params.id as string);

  usePageTitle("Dashboard - Shift bewerken");

  const { user, isLoading, isManager } = useAuth();
  const router = useRouter();

  // Shift and employee data
  const [shift, setShift] = useState<Shift | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingShift, setIsLoadingShift] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  // Form state
  const [formData, setFormData] = useState<UpdateShiftRequest>({
    employeeId: 0,
    date: "",
    startTime: "12:00",
    endTime: "18:00",
    shiftType: ShiftType.Bedienen,
    isOpenEnded: false,
    isStandby: false,
    notes: "",
  });

  // Validation setup - using central validation system
  const {
    fieldErrors,
    setFieldErrors,
    validateForm,
    handleInputChange,
    clearAllErrors,
  } = useValidation({
    fields: [
      "employeeId",
      "date",
      "startTime",
      "endTime",
      "shiftType",
      "notes",
    ],
    validateOnChange: false, // Only validate on submit
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Availability state
  const [employeeAvailability, setEmployeeAvailability] =
    useState<WeekAvailability | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>("");

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && user && !isManager()) {
      router.back();
    }
  }, [user, isLoading, router, isManager]);

  // Load shift and employees data
  useEffect(() => {
    if (user && isManager()) {
      loadShiftData();
      loadEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isManager, shiftId]);

  // Load availability when employee or week changes
  useEffect(() => {
    if (formData.employeeId && formData.employeeId !== 0 && formData.date) {
      const newWeekStart = getWeekStart(formData.date);
      // Always load availability when employee changes, or when week changes
      if (
        newWeekStart !== currentWeekStart ||
        employeeAvailability?.employeeId !== formData.employeeId
      ) {
        setCurrentWeekStart(newWeekStart);
        loadEmployeeAvailability(formData.employeeId, newWeekStart);
      }
    } else {
      // Reset availability when no employee is selected
      setEmployeeAvailability(null);
      setCurrentWeekStart("");
    }
  }, [
    formData.employeeId,
    formData.date,
    currentWeekStart,
    employeeAvailability?.employeeId,
  ]);

  const loadShiftData = async () => {
    setIsLoadingShift(true);
    setError(null);

    try {
      const shiftData = await api.getShiftById(shiftId);
      setShift(shiftData);

      // Pre-fill form with existing data
      setFormData({
        employeeId: shiftData.employeeId,
        date: shiftData.date, // Keep in DD-MM-YYYY format as backend expects
        startTime: shiftData.startTime.substring(0, 5), // Remove seconds
        endTime: shiftData.endTime ? shiftData.endTime.substring(0, 5) : null,
        shiftType: shiftData.shiftType,
        isOpenEnded: shiftData.isOpenEnded,
        isStandby: shiftData.isStandby,
        notes: shiftData.notes || "",
      });
    } catch (error: any) {
      console.error("Error loading shift:", error);

      let errorMessage = "Fout bij het laden van shift gegevens";
      if (error.status === 404) {
        errorMessage = "Shift niet gevonden";
      } else if (error.status === 403) {
        errorMessage = "Je hebt geen toegang tot deze shift";
      }

      setError(errorMessage);
    } finally {
      setIsLoadingShift(false);
    }
  };

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const employeesData = await api.getAllEmployees();
      setEmployees(employeesData);
    } catch (error: any) {
      console.error("Error loading employees:", error);
      setError("Fout bij het laden van medewerkers");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const getWeekStart = (dateString: string): string => {
    // Parse DD-MM-YYYY format
    const [day, month, year] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    // Get Monday of this week
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + daysToMonday);

    // Format as DD-MM-YYYY
    const formattedDay = monday.getDate().toString().padStart(2, "0");
    const formattedMonth = (monday.getMonth() + 1).toString().padStart(2, "0");
    const formattedYear = monday.getFullYear().toString();

    return `${formattedDay}-${formattedMonth}-${formattedYear}`;
  };

  const loadEmployeeAvailability = async (
    employeeId: number,
    weekStart: string
  ) => {
    setIsLoadingAvailability(true);
    try {
      const availability = await api.getEmployeeWeekAvailability(
        employeeId,
        weekStart
      );
      setEmployeeAvailability(availability);
    } catch (error: unknown) {
      console.error("Error loading employee availability:", error);
      // Don't show error for availability - it's not critical for shift editing
      setEmployeeAvailability(null);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Custom input change handler that uses central validation
  const handleFormInputChange = (
    field: keyof UpdateShiftRequest,
    value: string | number | boolean | null
  ) => {
    let processedValue = value;

    // Convert date field from HTML input format (YYYY-MM-DD) to DD-MM-YYYY
    if (field === "date" && typeof value === "string" && value) {
      processedValue = fromInputDateFormat(value);
    }

    // Use central validation handleInputChange
    handleInputChange(field, processedValue, formData, setFormData);

    // Clear general error
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError(null);
    clearAllErrors();

    // Prepare form data for validation
    const validationData = {
      ...formData,
      // Add any additional context needed for validation
      isOpenEnded: formData.isOpenEnded,
    };

    // Validate form using central validation system
    const isValid = validateForm(validationData);

    // Extra safety check for employeeId specifically
    if (!formData.employeeId || formData.employeeId === 0) {
      setFieldErrors((prev: Record<string, string>) => ({
        ...prev,
        employeeId: "Selecteer een medewerker",
      }));
      return;
    }

    if (!isValid) {
      return; // Validation errors will be shown via fieldErrors
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Keep date in DD-MM-YYYY format for API (backend expects this format)
      const apiData: UpdateShiftRequest = {
        ...formData,
        date: formData.date, // Keep in DD-MM-YYYY format as backend expects
        startTime: formData.startTime + ":00", // Add seconds for backend
        endTime: formData.endTime ? formData.endTime + ":00" : null,
        notes: formData.notes?.trim() || undefined, // Handle empty notes
      };

      await api.updateShift(shiftId, apiData);

      // Success! Redirect to schedule page
      router.back();
    } catch (error: any) {
      console.error("Error updating shift:", error);

      let errorMessage =
        "Er is een fout opgetreden bij het bijwerken van de shift";

      if (error.status === 400) {
        if (error.errors) {
          // Handle validation errors from backend
          const errorDetails = Object.entries(error.errors)
            .map(
              ([field, messages]) =>
                `${field}: ${
                  Array.isArray(messages) ? messages.join(", ") : messages
                }`
            )
            .join("\n");
          errorMessage = `Validatie fouten:\n${errorDetails}`;
        } else {
          errorMessage = "Controleer je invoer en probeer het opnieuw";
        }
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = "Je hebt geen toestemming om deze shift te bewerken";
      } else if (error.status === 404) {
        errorMessage = "Shift niet gevonden";
      } else if (error.status === 500) {
        errorMessage = "Server fout. Probeer het later opnieuw";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Updated availability functions to support verlof
  const getAvailabilityIcon = (day: any) => {
    if (!day) {
      return <Minus className="h-5 w-5 text-gray-400" />;
    }

    const status = getAvailabilityStatusFromDay(day);

    switch (status) {
      case AvailabilityStatus.Available:
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case AvailabilityStatus.NotAvailable:
        return <XCircle className="h-5 w-5 text-red-600" />;
      case AvailabilityStatus.TimeOff:
        return <Plane className="h-5 w-5 text-purple-600" />;
      default:
        return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getAvailabilityText = (day: any) => {
    if (!day) return "Niet opgegeven";

    const status = getAvailabilityStatusFromDay(day);

    switch (status) {
      case AvailabilityStatus.Available:
        return "Beschikbaar";
      case AvailabilityStatus.NotAvailable:
        return "Niet beschikbaar";
      case AvailabilityStatus.TimeOff:
        return "Verlof";
      default:
        return "Niet opgegeven";
    }
  };

  const getAvailabilityColor = (day: any) => {
    if (!day) return "#f3f4f6"; // gray-100

    const status = getAvailabilityStatusFromDay(day);

    switch (status) {
      case AvailabilityStatus.Available:
        return "#dcfce7"; // green-100
      case AvailabilityStatus.NotAvailable:
        return "#fee2e2"; // red-100
      case AvailabilityStatus.TimeOff:
        return "#f3e8ff"; // purple-100
      default:
        return "#f3f4f6"; // gray-100
    }
  };

  const getDayName = (dateString: string): string => {
    const [day, month, year] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = [
      "Zondag",
      "Maandag",
      "Dinsdag",
      "Woensdag",
      "Donderdag",
      "Vrijdag",
      "Zaterdag",
    ];
    return dayNames[date.getDay()];
  };

  const formatDisplayDate = (dateString: string): string => {
    const [day, month, year] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const monthNames = [
      "januari",
      "februari",
      "maart",
      "april",
      "mei",
      "juni",
      "juli",
      "augustus",
      "september",
      "oktober",
      "november",
      "december",
    ];
    return `${day} ${monthNames[date.getMonth()]}`;
  };

  const getWeekNumber = (dateString: string): number => {
    const [day, month, year] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    // ISO week number calculation
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfYear =
      Math.floor(
        (date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;
    const dayOfWeek =
      firstDayOfYear.getDay() === 0 ? 7 : firstDayOfYear.getDay(); // Monday = 1, Sunday = 7

    return Math.ceil((dayOfYear + dayOfWeek - 1) / 7);
  };

  const getSelectedEmployeeName = (): string => {
    const employee = employees.find((emp) => emp.id === formData.employeeId);
    return employee ? employee.fullName : "";
  };

  if (isLoading || isLoadingShift || isLoadingEmployees) {
    return <LoadingScreen message="Shift gegevens laden" />;
  }

  if (!user || !shift) {
    return null; // Will redirect or show error
  }

  // Show error if shift couldn't be loaded
  if (error && !shift) {
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
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-600" />
              <h1 className="text-2xl font-bold mb-4 text-gray-900">{error}</h1>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Terug naar rooster
              </button>
            </div>
          </div>
        </main>
      </div>
    );
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
        <div className="max-w-7xl mx-auto">
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
                      onClick={() => router.back()}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug naar rooster"
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
                      <Edit className="h-8 w-8 text-white" />
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
                        Shift bewerken
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
                <form onSubmit={handleSubmit} className="space-y-8" noValidate>
                  {/* General Error */}
                  {error && (
                    <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-red-700 text-center font-medium">
                      {error}
                    </div>
                  )}

                  {/* Employee and Date */}
                  <div>
                    <h3
                      className="text-xl font-semibold mb-6"
                      style={{ color: "#120309" }}
                    >
                      Planning details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Employee Selection */}
                      <div>
                        <label
                          htmlFor="employeeId"
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#120309" }}
                        >
                          Medewerker <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User
                              className="h-5 w-5"
                              style={{ color: "#67697c" }}
                            />
                          </div>
                          <select
                            id="employeeId"
                            value={formData.employeeId}
                            onChange={(e) =>
                              handleFormInputChange(
                                "employeeId",
                                parseInt(e.target.value)
                              )
                            }
                            className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                              fieldErrors.employeeId
                                ? "border-red-300"
                                : "border-gray-200"
                            }`}
                            style={{ color: "#120309" }}
                            disabled={isSubmitting}
                            onFocus={(e) => {
                              if (!fieldErrors.employeeId) {
                                const target = e.target as HTMLSelectElement;
                                target.style.boxShadow =
                                  "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                                target.style.borderColor = "#d5896f";
                              }
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLSelectElement;
                              target.style.boxShadow = "";
                              target.style.borderColor = fieldErrors.employeeId
                                ? "#fca5a5"
                                : "#d1d5db";
                            }}
                          >
                            <option value={0}>Medewerker selecteren</option>
                            {employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>
                                {employee.fullName}
                              </option>
                            ))}
                          </select>
                        </div>
                        {fieldErrors.employeeId && (
                          <p className="mt-2 text-sm text-red-600">
                            {fieldErrors.employeeId}
                          </p>
                        )}
                      </div>

                      {/* Date */}
                      <div>
                        <label
                          htmlFor="date"
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#120309" }}
                        >
                          Datum <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Calendar
                              className="h-5 w-5"
                              style={{ color: "#67697c" }}
                            />
                          </div>
                          <input
                            id="date"
                            type="date"
                            value={toInputDateFormat(formData.date)}
                            onChange={(e) =>
                              handleFormInputChange("date", e.target.value)
                            }
                            className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                              fieldErrors.date
                                ? "border-red-300"
                                : "border-gray-200"
                            }`}
                            style={{ color: "#120309" }}
                            disabled={isSubmitting}
                            onFocus={(e) => {
                              if (!fieldErrors.date) {
                                const target = e.target as HTMLInputElement;
                                target.style.boxShadow =
                                  "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                                target.style.borderColor = "#d5896f";
                              }
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow = "";
                              target.style.borderColor = fieldErrors.date
                                ? "#fca5a5"
                                : "#d1d5db";
                            }}
                          />
                        </div>
                        {fieldErrors.date && (
                          <p className="mt-2 text-sm text-red-600">
                            {fieldErrors.date}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Time Settings */}
                  <div>
                    <h3
                      className="text-xl font-semibold mb-6"
                      style={{ color: "#120309" }}
                    >
                      Tijd instellingen
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Start Time */}
                      <div>
                        <label
                          htmlFor="startTime"
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#120309" }}
                        >
                          Starttijd <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Clock
                              className="h-5 w-5"
                              style={{ color: "#67697c" }}
                            />
                          </div>
                          <input
                            id="startTime"
                            type="time"
                            value={formData.startTime}
                            onChange={(e) =>
                              handleFormInputChange("startTime", e.target.value)
                            }
                            className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${
                              fieldErrors.startTime
                                ? "border-red-300"
                                : "border-gray-200"
                            }`}
                            style={{ color: "#120309" }}
                            disabled={isSubmitting}
                            onFocus={(e) => {
                              if (!fieldErrors.startTime) {
                                const target = e.target as HTMLInputElement;
                                target.style.boxShadow =
                                  "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                                target.style.borderColor = "#d5896f";
                              }
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow = "";
                              target.style.borderColor = fieldErrors.startTime
                                ? "#fca5a5"
                                : "#d1d5db";
                            }}
                          />
                        </div>
                        {fieldErrors.startTime && (
                          <p className="mt-2 text-sm text-red-600">
                            {fieldErrors.startTime}
                          </p>
                        )}
                        <p
                          className="mt-2 text-xs"
                          style={{ color: "#67697c" }}
                        >
                          Tussen 12:00 en 23:59
                        </p>
                      </div>

                      {/* End Time */}
                      <div>
                        <label
                          htmlFor="endTime"
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#120309" }}
                        >
                          Eindtijd{" "}
                          {!formData.isOpenEnded && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Clock
                              className="h-5 w-5"
                              style={{
                                color: formData.isOpenEnded
                                  ? "#9ca3af"
                                  : "#67697c",
                              }}
                            />
                          </div>
                          <input
                            id="endTime"
                            type="time"
                            value={formData.endTime || ""}
                            onChange={(e) =>
                              handleFormInputChange("endTime", e.target.value)
                            }
                            className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none transition-all duration-300 ${
                              formData.isOpenEnded
                                ? "bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                                : fieldErrors.endTime
                                ? "border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                                : "border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                            }`}
                            style={{
                              color: formData.isOpenEnded
                                ? "#9ca3af"
                                : "#120309",
                            }}
                            disabled={formData.isOpenEnded || isSubmitting}
                            onFocus={(e) => {
                              if (
                                !formData.isOpenEnded &&
                                !fieldErrors.endTime
                              ) {
                                const target = e.target as HTMLInputElement;
                                target.style.boxShadow =
                                  "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                                target.style.borderColor = "#d5896f";
                              }
                            }}
                            onBlur={(e) => {
                              if (!formData.isOpenEnded) {
                                const target = e.target as HTMLInputElement;
                                target.style.boxShadow = "";
                                target.style.borderColor = fieldErrors.endTime
                                  ? "#fca5a5"
                                  : "#d1d5db";
                              }
                            }}
                          />
                        </div>
                        {fieldErrors.endTime && (
                          <p className="mt-2 text-sm text-red-600">
                            {fieldErrors.endTime}
                          </p>
                        )}
                        <p
                          className="mt-2 text-xs"
                          style={{ color: "#67697c" }}
                        >
                          Tussen 12:01 en 00:00 (of open einde)
                        </p>
                      </div>
                    </div>

                    {/* Open Ended Checkbox */}
                    <div className="mt-6">
                      <label className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isOpenEnded}
                          onChange={(e) => {
                            handleFormInputChange(
                              "isOpenEnded",
                              e.target.checked
                            );
                            if (e.target.checked) {
                              handleFormInputChange("endTime", null);
                            } else {
                              handleFormInputChange("endTime", "18:00");
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 focus:ring-2 focus:ring-orange-500"
                          style={{ accentColor: "#d5896f" }}
                          disabled={isSubmitting}
                        />
                        <span
                          className="text-sm font-medium"
                          style={{ color: "#120309" }}
                        >
                          Open einde
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Shift Type and Notes */}
                  <div>
                    <h3
                      className="text-xl font-semibold mb-6"
                      style={{ color: "#120309" }}
                    >
                      Shift details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Shift Type and Standby */}
                      <div className="space-y-6">
                        {/* Shift Type */}
                        <div>
                          <label
                            htmlFor="shiftType"
                            className="block text-sm font-semibold mb-2"
                            style={{ color: "#120309" }}
                          >
                            Type shift <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Type
                                className="h-5 w-5"
                                style={{ color: "#67697c" }}
                              />
                            </div>
                            <select
                              id="shiftType"
                              value={formData.shiftType}
                              onChange={(e) =>
                                handleFormInputChange(
                                  "shiftType",
                                  parseInt(e.target.value) as ShiftType
                                )
                              }
                              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                              style={{ color: "#120309" }}
                              disabled={isSubmitting}
                              onFocus={(e) => {
                                const target = e.target as HTMLSelectElement;
                                target.style.boxShadow =
                                  "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                                target.style.borderColor = "#d5896f";
                              }}
                              onBlur={(e) => {
                                const target = e.target as HTMLSelectElement;
                                target.style.boxShadow = "";
                                target.style.borderColor = "#d1d5db";
                              }}
                            >
                              <option value={ShiftType.Schoonmaak}>
                                Schoonmaak
                              </option>
                              <option value={ShiftType.Bedienen}>
                                Bedienen
                              </option>
                              <option value={ShiftType.SchoonmaakBedienen}>
                                Schoonmaak & Bedienen
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Standby Checkbox */}
                        <div>
                          <label className="flex items-center space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.isStandby}
                              onChange={(e) =>
                                handleFormInputChange(
                                  "isStandby",
                                  e.target.checked
                                )
                              }
                              className="w-5 h-5 rounded border-gray-300 focus:ring-2 focus:ring-orange-500"
                              style={{ accentColor: "#d5896f" }}
                              disabled={isSubmitting}
                            />
                            <span
                              className="text-sm font-medium"
                              style={{ color: "#120309" }}
                            >
                              Standby
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Right Column: Notes */}
                      <div>
                        <label
                          htmlFor="notes"
                          className="block text-sm font-semibold mb-2"
                          style={{ color: "#120309" }}
                        >
                          Notities{" "}
                          <span className="text-gray-500">(optioneel)</span>
                        </label>
                        <div className="relative">
                          <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
                            <FileText
                              className="h-5 w-5"
                              style={{ color: "#67697c" }}
                            />
                          </div>
                          <textarea
                            id="notes"
                            value={formData.notes || ""}
                            onChange={(e) =>
                              handleFormInputChange("notes", e.target.value)
                            }
                            className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg resize-none ${
                              fieldErrors.notes
                                ? "border-red-300"
                                : "border-gray-200"
                            }`}
                            style={{ color: "#120309" }}
                            placeholder="Eventuele opmerkingen..."
                            rows={3}
                            maxLength={500}
                            disabled={isSubmitting}
                            onFocus={(e) => {
                              if (!fieldErrors.notes) {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.boxShadow =
                                  "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                                target.style.borderColor = "#d5896f";
                              }
                            }}
                            onBlur={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.boxShadow = "";
                              target.style.borderColor = fieldErrors.notes
                                ? "#fca5a5"
                                : "#d1d5db";
                            }}
                          />
                        </div>
                        {fieldErrors.notes && (
                          <p className="mt-2 text-sm text-red-600">
                            {fieldErrors.notes}
                          </p>
                        )}
                        <p
                          className="mt-2 text-xs"
                          style={{ color: "#67697c" }}
                        >
                          {formData.notes?.length || 0}/500 tekens
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-between space-x-4 pt-6 border-t border-gray-200/50">
                    <button
                      type="button"
                      onClick={() => router.back()}
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
                  </div>
                </form>
              </div>
            </div>

            {/* Employee Availability Section */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                    }}
                  >
                    <CalendarCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: "#120309" }}
                    >
                      Beschikbaarheid
                    </h3>
                    {getSelectedEmployeeName() && (
                      <p className="text-sm" style={{ color: "#67697c" }}>
                        {getSelectedEmployeeName()}
                      </p>
                    )}
                  </div>
                </div>

                {!formData.employeeId || formData.employeeId === 0 ? (
                  <div className="text-center py-8">
                    <User
                      className="h-12 w-12 mx-auto mb-3"
                      style={{ color: "#67697c" }}
                    />
                    <p className="text-sm" style={{ color: "#67697c" }}>
                      Selecteer eerst een medewerker om hun beschikbaarheid te
                      bekijken
                    </p>
                  </div>
                ) : isLoadingAvailability ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-sm mt-3" style={{ color: "#67697c" }}>
                      Beschikbaarheid laden...
                    </p>
                  </div>
                ) : employeeAvailability ? (
                  <div className="space-y-3">
                    <div
                      className="text-xs font-medium mb-4"
                      style={{ color: "#67697c" }}
                    >
                      Week {getWeekNumber(employeeAvailability.weekStart)}
                    </div>
                    {employeeAvailability.days.map((day, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-xl border border-gray-200 transition-all duration-200"
                        style={{
                          backgroundColor: getAvailabilityColor(day),
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          {getAvailabilityIcon(day)}
                          <div>
                            <div
                              className="text-sm font-medium"
                              style={{ color: "#120309" }}
                            >
                              {getDayName(day.date)}
                            </div>
                            <div
                              className="text-xs"
                              style={{ color: "#67697c" }}
                            >
                              {formatDisplayDate(day.date)} •{" "}
                              {getAvailabilityText(day)}
                            </div>
                          </div>
                        </div>
                        {day.notes && (
                          <div
                            className="text-xs max-w-20 truncate"
                            style={{ color: "#67697c" }}
                            title={day.notes}
                          >
                            {day.notes}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Legend - UPDATED to include verlof */}
                    <div className="mt-6 pt-4 border-t border-gray-200/50">
                      <p
                        className="text-xs font-medium mb-3"
                        style={{ color: "#67697c" }}
                      >
                        Legenda:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-gray-600">Beschikbaar</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-3 w-3 text-red-600" />
                          <span className="text-gray-600">
                            Niet beschikbaar
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Plane className="h-3 w-3 text-purple-600" />
                          <span className="text-gray-600">Verlof</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Minus className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Niet opgegeven</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Minus
                      className="h-12 w-12 mx-auto mb-3"
                      style={{ color: "#67697c" }}
                    />
                    <p className="text-sm" style={{ color: "#67697c" }}>
                      Geen beschikbaarheid gevonden voor deze week
                    </p>
                    <p className="text-xs mt-2" style={{ color: "#67697c" }}>
                      De medewerker heeft nog geen beschikbaarheid ingesteld
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

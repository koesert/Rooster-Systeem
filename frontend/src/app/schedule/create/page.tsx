"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Plus,
  User,
  Calendar,
  Clock,
  Type,
  FileText,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Minus,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  AlertTriangle,
  Plane,
} from "lucide-react";
import { CreateShiftRequest, ShiftType, Shift } from "@/types/shift";
import { Employee } from "@/types/auth";
import {
  WeekAvailability,
  AvailabilityStatus,
  getAvailabilityStatusFromDay,
} from "@/types/availability";
import * as api from "@/lib/api";
import {
  getCurrentDate,
  toInputDateFormat,
  fromInputDateFormat,
  formatDate,
} from "@/utils/dateUtils";
import {
  getShiftColor,
  formatTime,
  calculateShiftLanes,
  calculateShiftTopPosition,
  calculateShiftHeight,
  getWeekDates,
  generateTimeSlots,
} from "@/utils/scheduleUtils";

export default function CreateShiftPage() {
  usePageTitle("Dashboard - Nieuwe shift");

  const { user, isLoading, isManager } = useAuth();
  const { showModal, showAlert, showConfirm, hideModal } = useModal();
  const router = useRouter();

  // Employee list
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);

  // Form state
  const [formData, setFormData] = useState<CreateShiftRequest>({
    employeeId: 0,
    date: getCurrentDate(),
    startTime: "12:00",
    endTime: "18:00",
    shiftType: ShiftType.Bedienen,
    isOpenEnded: false,
    isStandby: false,
    notes: "",
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Week view state
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [hoveredShiftId, setHoveredShiftId] = useState<number | null>(null);

  // Availability state
  const [allEmployeesAvailability, setAllEmployeesAvailability] = useState<
    WeekAvailability[]
  >([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && user && !isManager()) {
      router.push("/schedule");
    }
  }, [user, isLoading, router, isManager]);

  // Load employees
  useEffect(() => {
    if (user && isManager()) {
      loadEmployees();
    }
  }, [user, isManager]);

  // Load shifts and availability when week changes or employees change
  useEffect(() => {
    if (user && isManager() && employees.length > 0) {
      loadWeekShifts();
      loadAllEmployeesAvailability();
    }
  }, [currentWeekDate, user, isManager, employees]);

  // Initial load when employees are loaded
  useEffect(() => {
    if (user && isManager() && employees.length > 0) {
      loadWeekShifts();
      loadAllEmployeesAvailability();
    }
  }, [employees.length]);

  const loadEmployees = async () => {
    try {
      const employeesData = await api.getEmployees();
      setEmployees(employeesData);
      // Don't auto-select first employee - let user choose
    } catch (error: unknown) {
      console.error("Error loading employees:", error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const loadWeekShifts = async () => {
    setIsLoadingShifts(true);
    try {
      const weekDates = getWeekDates(currentWeekDate);
      const startDate = weekDates[0];
      const endDate = weekDates[6];

      const shiftsData = await api.getAllShifts({
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      });
      setShifts(shiftsData);
    } catch (error: unknown) {
      console.error("Error loading shifts:", error);
    } finally {
      setIsLoadingShifts(false);
    }
  };

  const loadAllEmployeesAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const weekDates = getWeekDates(currentWeekDate);
      const mondayDate = weekDates[0];
      const weekStart = formatDate(mondayDate);

      // Get availability for all employees
      const availabilityPromises = employees.map((employee) =>
        api
          .getEmployeeWeekAvailability(employee.id, weekStart)
          .then((data) => ({ ...data, employeeId: employee.id }))
          .catch(() => ({
            employeeId: employee.id,
            weekStart: weekStart,
            employeeName: employee.fullName,
            days: [],
          }))
      );

      const availabilityData = await Promise.all(availabilityPromises);
      setAllEmployeesAvailability(availabilityData);
    } catch (error: unknown) {
      console.error("Error loading availability:", error);
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Reset errors
    setError(null);
    setFieldErrors({});

    // Basic validation
    const errors: Record<string, string> = {};
    if (!formData.employeeId || formData.employeeId === 0) {
      errors.employeeId = "Selecteer een werknemer";
    }
    if (!formData.date) {
      errors.date = "Selecteer een datum";
    }
    if (!formData.startTime) {
      errors.startTime = "Selecteer een starttijd";
    }
    if (!formData.endTime && !formData.isOpenEnded) {
      errors.endTime = "Selecteer een eindtijd of kies voor open einde";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Format data for API - add seconds to times for TimeSpan conversion
      const apiData = {
        ...formData,
        startTime: formData.startTime + ":00", // Add seconds for backend
        endTime: formData.endTime ? formData.endTime + ":00" : null,
        notes: formData.notes?.trim() || undefined,
      };

      await api.createShift(apiData);

      // Reset form
      setFormData({
        employeeId: 0, // Reset to "Selecteer werknemer"
        date: getCurrentDate(),
        startTime: "12:00",
        endTime: "18:00",
        shiftType: ShiftType.Bedienen,
        isOpenEnded: false,
        isStandby: false,
        notes: "",
      });

      // Reload data
      loadWeekShifts();
      loadAllEmployeesAvailability();

      setError(null);
    } catch (error: unknown) {
      console.error("Error creating shift:", error);
      setError("Er is een fout opgetreden bij het aanmaken van de shift");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    field: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Navigation helpers
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  const getWeekTitle = (): string => {
    const weekDates = getWeekDates(currentWeekDate);
    const startDate = weekDates[0];
    const endDate = weekDates[6];
    const weekNumber = getWeekNumber(currentWeekDate);

    const startMonth = startDate.toLocaleDateString("nl-NL", { month: "long" });
    const endMonth = endDate.toLocaleDateString("nl-NL", { month: "long" });
    const year = startDate.getFullYear();

    const dateRange =
      startMonth === endMonth
        ? `${startDate.getDate()} - ${endDate.getDate()} ${startMonth} ${year}`
        : `${startDate.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth} ${year}`;

    return `Week ${weekNumber} • ${dateRange}`;
  };

  // Week navigation
  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentWeekDate(new Date());
  };

  // Shift click handler - identical to schedule page
  const handleShiftClick = (shift: Shift) => {
    const colors = getShiftColor(shift.shiftType);

    showModal({
      type: "custom",
      title: "Shift details",
      size: "md",
      showCancel: false,
      confirmText: "Sluiten",
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
            >
              {shift.shiftTypeName}
            </div>
            {shift.isOpenEnded && (
              <span className="text-sm text-gray-600">Open einde</span>
            )}
            {shift.isStandby && (
              <span className="text-sm text-orange-600">Standby</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Medewerker</p>
              <p className="text-lg text-gray-600">{shift.employeeName}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Datum</p>
              <p className="text-lg text-gray-600">{formatDate(shift.date)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Tijd</p>
              <p className="text-lg text-gray-600">{shift.timeRange}</p>
              {shift.durationInHours && (
                <p className="text-sm text-gray-600">
                  {shift.durationInHours} uur
                </p>
              )}
            </div>

            {shift.notes && (
              <div>
                <p className="text-sm font-medium text-gray-600">Notities</p>
                <p className="text-base text-gray-600">{shift.notes}</p>
              </div>
            )}
          </div>

          {isManager() && (
            <div className="flex space-x-2 pt-4 border-t">
              <button
                onClick={() => {
                  // Close the modal first, then navigate to edit page
                  hideModal();
                  setTimeout(() => handleEditShift(shift), 150);
                }}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                <span>Bewerken</span>
              </button>
              <button
                onClick={() => {
                  // Close the modal first, then show delete confirmation
                  hideModal();
                  setTimeout(() => handleDeleteShift(shift), 150);
                }}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Verwijderen</span>
              </button>
            </div>
          )}
        </div>
      ),
      icon: <Clock className="h-6 w-6" style={{ color: "#d5896f" }} />,
    });
  };

  // Edit shift handler (managers only)
  const handleEditShift = (shift: Shift) => {
    if (!isManager()) {
      showAlert({
        title: "Onvoldoende rechten",
        message: "Alleen managers kunnen shifts bewerken.",
        confirmText: "OK",
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      });
      return;
    }

    // Navigate to edit page
    router.push(`/schedule/edit/${shift.id}`);
  };

  // Delete shift handler (managers only)
  const handleDeleteShift = (shift: Shift) => {
    if (!isManager()) {
      showAlert({
        title: "Onvoldoende rechten",
        message: "Alleen managers kunnen shifts verwijderen.",
        confirmText: "OK",
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      });
      return;
    }

    showConfirm({
      title: "Shift verwijderen",
      message: `Weet je zeker dat je de shift van ${
        shift.employeeName
      } op ${formatDate(shift.date)} van ${formatTime(shift.startTime)} tot ${
        shift.isOpenEnded ? "einde" : formatTime(shift.endTime!)
      } wilt verwijderen?`,
      confirmText: "Verwijderen",
      cancelText: "Annuleren",
      variant: "danger",
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      onConfirm: async () => {
        try {
          await api.deleteShift(shift.id);

          // Reload data after successful deletion
          loadWeekShifts();
          loadAllEmployeesAvailability();

          showAlert({
            title: "Shift verwijderd",
            message: "De shift is succesvol verwijderd.",
            confirmText: "OK",
            icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          });
        } catch (error: unknown) {
          console.error("Error deleting shift:", error);

          let errorMessage =
            "Er is een fout opgetreden bij het verwijderen van de shift";

          if (error && typeof error === "object" && "message" in error) {
            errorMessage = (error as { message: string }).message;
          }

          showAlert({
            title: "Fout bij verwijderen",
            message: errorMessage,
            confirmText: "OK",
            icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
          });
        }
      },
    });
  };

  // Check if date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Shift rendering helpers
  const getShiftsForDate = (date: Date): Shift[] => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const dayShifts = shifts.filter((shift) => {
      let shiftDateStr = shift.date;
      if (shiftDateStr.includes("-") && shiftDateStr.length === 10) {
        const parts = shiftDateStr.split("-");
        if (parts.length === 3 && parts[0].length === 2) {
          shiftDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      if (shiftDateStr.includes("T")) {
        shiftDateStr = shiftDateStr.split("T")[0];
      }
      return shiftDateStr === dateStr;
    });

    return dayShifts;
  };

  const renderShiftBlocksForDay = (dayShifts: Shift[], timeSlots: string[]) => {
    if (dayShifts.length === 0) return null;

    const shiftsWithLanes = calculateShiftLanes(dayShifts);
    const isCompactMode = dayShifts.length > 3;

    return shiftsWithLanes.map((shift) => {
      const colors = getShiftColor(shift.shiftType);
      const topPosition = calculateShiftTopPosition(shift.startTime, timeSlots);
      const height = calculateShiftHeight(shift);

      const laneWidth = 100 / shift.totalLanes;
      const leftPosition = shift.lane * laneWidth;

      const isHovered = hoveredShiftId === shift.id;

      // Get employee details for name formatting
      const employee = employees.find((emp) => emp.id === shift.employeeId);

      // Format name based on compact mode
      const displayName =
        isCompactMode && employee
          ? (() => {
              const firstNameInitials = employee.firstName
                .split(" ")
                .map((name) => name.charAt(0))
                .join("");
              const lastNameInitials = employee.lastName
                .split(" ")
                .map((name) => name.charAt(0))
                .join("");
              return `${firstNameInitials} ${lastNameInitials}`;
            })()
          : employee?.firstName || shift.employeeName;

      return (
        <div
          key={shift.id}
          onClick={() => handleShiftClick(shift)}
          onMouseEnter={() => setHoveredShiftId(shift.id)}
          onMouseLeave={() => setHoveredShiftId(null)}
          className={`absolute cursor-pointer rounded p-2 text-xs ${colors.bg} ${colors.border} ${colors.text} border transition-all duration-200 overflow-hidden`}
          style={{
            left: `${leftPosition}%`,
            width: `${laneWidth - 1}%`,
            top: `${topPosition}px`,
            height: `${height}px`,
            minHeight: "36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            zIndex: isHovered ? 30 : 15,
            transform: isHovered ? "scale(1.05)" : "scale(1)",
            boxShadow: isHovered
              ? "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
              : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* Standby indicator */}
          {shift.isStandby && (
            <div className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full shadow-sm"></div>
          )}

          <div
            className="font-medium text-xs max-[500px]:text-[10px]"
            style={{
              lineHeight: "1.2",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "normal",
            }}
          >
            {displayName}
          </div>
          {!isCompactMode && (
            <div
              className="text-xs max-[500px]:text-[9px] opacity-80 mt-1"
              style={{
                lineHeight: "1.1",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "normal",
              }}
            >
              {formatTime(shift.startTime)} -{" "}
              {shift.isOpenEnded
                ? "einde"
                : shift.endTime
                ? formatTime(shift.endTime)
                : "N/A"}
            </div>
          )}
        </div>
      );
    });
  };

  // Get availability for employee on specific date - UPDATED to handle verlof
  const getAvailabilityIcon = (employeeId: number, date: Date) => {
    const employeeAvailability = allEmployeesAvailability.find(
      (ea) => ea.employeeId === employeeId
    );

    if (!employeeAvailability) {
      return <Minus className="h-3 w-3 text-gray-400" />;
    }

    const dateStr = formatDate(date);
    const dayAvailability = employeeAvailability.days.find(
      (day) => day.date === dateStr
    );

    if (!dayAvailability) {
      return <Minus className="h-3 w-3 text-gray-400" />;
    }

    // Use the helper function to get the proper status
    const status = getAvailabilityStatusFromDay(dayAvailability);

    switch (status) {
      case AvailabilityStatus.Available:
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case AvailabilityStatus.NotAvailable:
        return <XCircle className="h-3 w-3 text-red-600" />;
      case AvailabilityStatus.TimeOff:
        return <Plane className="h-3 w-3 text-purple-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user || !isManager()) {
    return null;
  }

  const weekDates = getWeekDates(currentWeekDate);
  const timeSlots = generateTimeSlots();

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #e8eef2 0%, #d5896f 100%)",
      }}
    >
      {/* Main Content */}
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/schedule")}
                className="p-3 rounded-xl hover:bg-white/20 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5" style={{ color: "#67697c" }} />
              </button>
              <div
                className="p-3 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                }}
              >
                <Plus className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1
                  className="text-4xl font-bold"
                  style={{
                    background: "linear-gradient(135deg, #120309, #67697c)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Nieuwe shift
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Side-by-side Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Form Section - Left Side */}
          <div className="col-span-12 lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* General Error */}
                {error && (
                  <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-red-700 text-center font-medium">
                    {error}
                  </div>
                )}

                {/* Employee Selection */}
                <div>
                  <label
                    htmlFor="employeeId"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#120309" }}
                  >
                    Werknemer <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5" style={{ color: "#67697c" }} />
                    </div>
                    <select
                      id="employeeId"
                      value={formData.employeeId}
                      onChange={(e) =>
                        handleInputChange(
                          "employeeId",
                          parseInt(e.target.value)
                        )
                      }
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        fieldErrors.employeeId
                          ? "border-red-300 bg-red-50/50 focus:ring-red-500/50"
                          : "border-gray-200 bg-white/60 focus:ring-blue-500/50"
                      }`}
                      disabled={isLoadingEmployees || isSubmitting}
                    >
                      <option value={0}>Selecteer werknemer</option>
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
                      type="date"
                      id="date"
                      value={toInputDateFormat(formData.date)}
                      onChange={(e) =>
                        handleInputChange(
                          "date",
                          fromInputDateFormat(e.target.value)
                        )
                      }
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        fieldErrors.date
                          ? "border-red-300 bg-red-50/50 focus:ring-red-500/50"
                          : "border-gray-200 bg-white/60 focus:ring-blue-500/50"
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.date && (
                    <p className="mt-2 text-sm text-red-600">
                      {fieldErrors.date}
                    </p>
                  )}
                </div>

                {/* Start Time */}
                <div>
                  <label
                    htmlFor="startTime"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#120309" }}
                  >
                    Start tijd <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5" style={{ color: "#67697c" }} />
                    </div>
                    <input
                      type="time"
                      id="startTime"
                      value={formData.startTime}
                      onChange={(e) =>
                        handleInputChange("startTime", e.target.value)
                      }
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        fieldErrors.startTime
                          ? "border-red-300 bg-red-50/50 focus:ring-red-500/50"
                          : "border-gray-200 bg-white/60 focus:ring-blue-500/50"
                      }`}
                      disabled={isSubmitting}
                    />
                  </div>
                  {fieldErrors.startTime && (
                    <p className="mt-2 text-sm text-red-600">
                      {fieldErrors.startTime}
                    </p>
                  )}
                </div>

                {/* End Time */}
                <div>
                  <label
                    htmlFor="endTime"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#120309" }}
                  >
                    Eind tijd{" "}
                    {!formData.isOpenEnded && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Clock className="h-5 w-5" style={{ color: "#67697c" }} />
                    </div>
                    <input
                      type="time"
                      id="endTime"
                      value={formData.endTime || ""}
                      onChange={(e) =>
                        handleInputChange("endTime", e.target.value)
                      }
                      className={`w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 ${
                        fieldErrors.endTime
                          ? "border-red-300 bg-red-50/50 focus:ring-red-500/50"
                          : "border-gray-200 bg-white/60 focus:ring-blue-500/50"
                      } ${formData.isOpenEnded ? "opacity-50" : ""}`}
                      disabled={formData.isOpenEnded || isSubmitting}
                    />
                  </div>
                  {fieldErrors.endTime && (
                    <p className="mt-2 text-sm text-red-600">
                      {fieldErrors.endTime}
                    </p>
                  )}
                </div>

                {/* Open Ended */}
                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isOpenEnded}
                      onChange={(e) =>
                        handleInputChange("isOpenEnded", e.target.checked)
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
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

                {/* Standby */}
                <div>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isStandby}
                      onChange={(e) =>
                        handleInputChange("isStandby", e.target.checked)
                      }
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
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
                      <Type className="h-5 w-5" style={{ color: "#67697c" }} />
                    </div>
                    <select
                      id="shiftType"
                      value={formData.shiftType}
                      onChange={(e) =>
                        handleInputChange(
                          "shiftType",
                          parseInt(e.target.value) as ShiftType
                        )
                      }
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200"
                      disabled={isSubmitting}
                    >
                      <option value={ShiftType.Bedienen}>Bedienen</option>
                      <option value={ShiftType.Schoonmaak}>Schoonmaak</option>
                      <option value={ShiftType.SchoonmaakBedienen}>
                        Schoonmaak & bedienen
                      </option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label
                    htmlFor="notes"
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#120309" }}
                  >
                    Opmerkingen
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
                      value={formData.notes}
                      onChange={(e) =>
                        handleInputChange("notes", e.target.value)
                      }
                      placeholder="Opmerkingen..."
                      rows={3}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 bg-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-200 resize-none"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSubmitting
                      ? "linear-gradient(135deg, #9ca3af, #6b7280)"
                      : "linear-gradient(135deg, #d5896f, #d5896f90)",
                  }}
                >
                  {isSubmitting ? "Bezig..." : "Shift aanmaken"}
                </button>
              </form>
            </div>
          </div>

          {/* Week View Section - Right Side */}
          <div className="col-span-12 lg:col-span-10">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-6">
              {/* Week Navigation inside the container */}
              <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-200/50">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={navigateToToday}
                    className="px-4 py-2 bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 text-gray-700 font-medium hover:bg-white transition-colors cursor-pointer"
                  >
                    Vandaag
                  </button>
                </div>

                {/* Week title in center */}
                <div className="flex-1 text-center">
                  <h2 className="text-lg font-semibold text-gray-700">
                    {getWeekTitle()}
                  </h2>
                </div>

                <div className="flex items-center bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20">
                  <button
                    onClick={() => navigateWeek("prev")}
                    className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => navigateWeek("next")}
                    className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {isLoadingShifts ? (
                <div className="p-12 text-center">
                  <div
                    className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                    style={{ borderColor: "#d5896f" }}
                  ></div>
                  <p className="mt-4 font-medium" style={{ color: "#67697c" }}>
                    Shifts laden...
                  </p>
                </div>
              ) : (
                <div className="p-6 max-[500px]:p-3">
                  <div className="grid grid-cols-8 gap-px bg-gray-200">
                    {/* Time column header */}
                    <div className="bg-white p-4 max-[500px]:p-2">
                      <p className="text-sm font-medium text-gray-600">Tijd</p>
                    </div>

                    {/* Day headers */}
                    {weekDates.map((date, index) => (
                      <div
                        key={index}
                        className={`p-4 max-[500px]:p-2 text-center ${
                          isToday(date)
                            ? "bg-red-50 border-red-200"
                            : "bg-white"
                        }`}
                      >
                        <p
                          className={`text-lg font-medium capitalize ${
                            isToday(date) ? "text-red-600" : "text-gray-600"
                          }`}
                        >
                          {date.toLocaleDateString("nl-NL", {
                            weekday: "long",
                          })}
                        </p>
                        <p
                          className={`text-2xl font-bold ${
                            isToday(date) ? "text-red-700" : "text-gray-900"
                          }`}
                        >
                          {date.getDate()}
                        </p>
                      </div>
                    ))}

                    {/* Time slots and shifts */}
                    {timeSlots.map((time, timeIndex) => (
                      <React.Fragment key={`time-row-${timeIndex}`}>
                        {/* Time label */}
                        <div
                          className="bg-white p-2 max-[500px]:p-1 flex items-start"
                          style={{ minHeight: "50px", zIndex: 5 }}
                        >
                          <p className="text-sm text-gray-600 font-medium">
                            {time}
                          </p>
                        </div>

                        {/* Day cells */}
                        {weekDates.map((date, dayIndex) => (
                          <div
                            key={`day-${dayIndex}-time-${timeIndex}`}
                            className="bg-white p-0 relative"
                            style={{ minHeight: "50px" }}
                          >
                            {/* Render shifts only once at the first time slot */}
                            {timeIndex === 0 && (
                              <div
                                className="absolute inset-0"
                                style={{ zIndex: 10 }}
                              >
                                {renderShiftBlocksForDay(
                                  getShiftsForDate(date),
                                  timeSlots
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Availability Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3
                className="text-xl font-bold mb-4"
                style={{ color: "#120309" }}
              >
                Beschikbaarheid medewerkers
              </h3>

              {isLoadingAvailability ? (
                <div className="p-8 text-center">
                  <div
                    className="inline-block animate-spin rounded-full h-6 w-6 border-b-2"
                    style={{ borderColor: "#d5896f" }}
                  ></div>
                  <p
                    className="mt-2 text-sm font-medium"
                    style={{ color: "#67697c" }}
                  >
                    Beschikbaarheid laden...
                  </p>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Geen medewerkers gevonden</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-8 gap-2 min-w-full">
                    {/* Header with days */}
                    <div className="text-sm font-semibold text-gray-600 p-2">
                      Medewerker
                    </div>
                    {weekDates.map((date, index) => (
                      <div
                        key={index}
                        className={`text-center text-sm font-semibold p-2 ${
                          isToday(date) ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        {date.toLocaleDateString("nl-NL", { weekday: "short" })}
                      </div>
                    ))}

                    {/* Employee availability rows */}
                    {employees.map((employee) => (
                      <React.Fragment key={employee.id}>
                        {/* Employee name */}
                        <div className="text-sm font-medium text-gray-900 p-2 bg-gray-50 rounded">
                          {employee.firstName}
                        </div>

                        {/* Availability for each day */}
                        {weekDates.map((date, dayIndex) => (
                          <div
                            key={dayIndex}
                            className="flex justify-center items-center p-2 bg-gray-50 rounded"
                          >
                            {getAvailabilityIcon(employee.id, date)}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Legend - UPDATED to include verlof */}
                  <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-600">Beschikbaar</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span className="text-gray-600">Niet beschikbaar</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Plane className="h-4 w-4 text-purple-600" />
                      <span className="text-gray-600">Verlof</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Minus className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Niet opgegeven</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

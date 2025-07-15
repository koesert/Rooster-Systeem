"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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
  X,
  CheckCircle,
  XCircle,
  Minus,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Menu,
  Home,
  CalendarDays,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { CreateShiftRequest, ShiftType, Shift } from "@/types/shift";
import { Employee } from "@/types/auth";
import { WeekAvailability } from "@/types/availability";
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
  const router = useRouter();

  // Sidebar state
  const [isHoveringSidebar, setIsHoveringSidebar] = useState(false);

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

  // Load shifts and availability when week changes
  useEffect(() => {
    if (user && isManager()) {
      loadWeekShifts();
      loadAllEmployeesAvailability();
    }
  }, [currentWeekDate, user, isManager]);

  const loadEmployees = async () => {
    try {
      const employeesData = await api.getEmployees();
      setEmployees(employeesData);
      if (employeesData.length > 0) {
        setFormData((prev) => ({ ...prev, employeeId: employeesData[0].id }));
      }
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
      await api.createShift(formData);
      router.push("/schedule");
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

  // Week navigation
  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentWeekDate(new Date());
  };

  // Sidebar navigation
  const navigateToPage = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      router.push("/login");
    } catch (error: unknown) {
      console.error("Logout error:", error);
    }
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

    return shiftsWithLanes.map((shift) => {
      const colors = getShiftColor(shift.shiftType);
      const topPosition = calculateShiftTopPosition(shift.startTime, timeSlots);
      const height = calculateShiftHeight(shift);

      const laneWidth = 100 / shift.totalLanes;
      const leftPosition = shift.lane * laneWidth;

      const isHovered = hoveredShiftId === shift.id;

      return (
        <div
          key={shift.id}
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
          <div className="font-medium truncate">{shift.employeeName}</div>
          <div className="text-xs opacity-75 truncate">
            {formatTime(shift.startTime)} -{" "}
            {shift.isOpenEnded
              ? "Open"
              : shift.endTime
              ? formatTime(shift.endTime)
              : "N/A"}
          </div>
        </div>
      );
    });
  };

  // Get availability for employee on specific date
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

    if (dayAvailability?.isAvailable === true) {
      return <CheckCircle className="h-3 w-3 text-green-600" />;
    } else if (dayAvailability?.isAvailable === false) {
      return <XCircle className="h-3 w-3 text-red-600" />;
    } else {
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
                className="p-3 rounded-xl hover:bg-white/20 transition-colors"
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

        {/* Main Layout */}
        <div className="grid grid-cols-12 gap-6">
          {/* Form Section - Left Side */}
          <div className="col-span-12 lg:col-span-4">
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

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
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
                        <Clock
                          className="h-5 w-5"
                          style={{ color: "#67697c" }}
                        />
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
                        <Clock
                          className="h-5 w-5"
                          style={{ color: "#67697c" }}
                        />
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
                      Open einde (werkt tot sluitingstijd)
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
                      Standby shift (oproepbaar indien nodig)
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
                        Schoonmaak & Bedienen
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
                      placeholder="Eventuele opmerkingen..."
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
          <div className="col-span-12 lg:col-span-8">
            {/* Week Navigation */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold" style={{ color: "#120309" }}>
                Week overzicht
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={navigateToToday}
                  className="px-4 py-2 bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 text-gray-700 font-medium hover:bg-white transition-colors cursor-pointer"
                >
                  Vandaag
                </button>
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
            </div>

            {/* Week View */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-6">
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
                        className="bg-white p-4 max-[500px]:p-2 text-center"
                      >
                        <p className="text-lg font-medium text-gray-600 capitalize">
                          {date.toLocaleDateString("nl-NL", {
                            weekday: "long",
                          })}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
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
                        className="text-center text-sm font-semibold text-gray-600 p-2"
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

                  {/* Legend */}
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

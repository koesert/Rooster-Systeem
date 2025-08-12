"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useValidation } from "@/hooks/useValidation";
import LoadingScreen from "@/components/LoadingScreen";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Minus,
  ChevronLeft,
  ChevronRight,
  Plane,
  Calendar,
  Clock,
  Type,
  FileText,
  Trash2,
  AlertTriangle,
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
import { getShiftColor, formatTime, getWeekDates } from "@/utils/scheduleUtils";

interface ShiftModalData {
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  isOpenEnded: boolean;
  isStandby: boolean;
  notes: string;
}

export default function ScheduleManagePage() {
  usePageTitle("Dashboard - Rooster beheren");

  const { user, isLoading, isManager } = useAuth();
  const { showModal, showAlert, showConfirm, hideModal } = useModal();
  const router = useRouter();

  // Data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [currentWeekDate, setCurrentWeekDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [allEmployeesAvailability, setAllEmployeesAvailability] = useState<
    WeekAvailability[]
  >([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Modal state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalFormData, setModalFormData] = useState<ShiftModalData>({
    startTime: "12:00",
    endTime: "18:00",
    shiftType: ShiftType.Bedienen,
    isOpenEnded: false,
    isStandby: false,
    notes: "",
  });

  // Validation for modal form - using the official validation system
  const { fieldErrors, setFieldErrors, validateForm, clearAllErrors } =
    useValidation({
      fields: ["startTime", "endTime", "shiftType", "notes"],
      validateOnChange: false,
    });

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

  const loadEmployees = async () => {
    try {
      const employeesData = await api.getEmployees();
      setEmployees(employeesData);
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

  // Week navigation helpers
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

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(currentWeekDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setCurrentWeekDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentWeekDate(new Date());
  };

  // Get availability status for employee on specific date
  const getAvailabilityStatus = (
    employeeId: number,
    date: Date
  ): AvailabilityStatus | null => {
    const employeeAvailability = allEmployeesAvailability.find(
      (ea) => ea.employeeId === employeeId
    );

    if (!employeeAvailability) {
      return null;
    }

    const dateStr = formatDate(date);
    const dayAvailability = employeeAvailability.days.find(
      (day) => day.date === dateStr
    );

    if (!dayAvailability) {
      return null;
    }

    return getAvailabilityStatusFromDay(dayAvailability);
  };

  // Get shift for employee on specific date
  const getShiftForEmployeeDate = (
    employeeId: number,
    date: Date
  ): Shift | null => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return (
      shifts.find((shift) => {
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
        return shiftDateStr === dateStr && shift.employeeId === employeeId;
      }) || null
    );
  };

  // Format shift time display
  const formatShiftTime = (shift: Shift): string => {
    if (shift.isOpenEnded) {
      return formatTime(shift.startTime);
    }
    return `${formatTime(shift.startTime)} - ${formatTime(shift.endTime!)}`;
  };

  // Handle cell click - create or edit shift
  const handleCellClick = (employee: Employee, date: Date) => {
    const existingShift = getShiftForEmployeeDate(employee.id, date);

    if (existingShift) {
      // Edit existing shift
      showEditShiftModal(existingShift, employee, date);
    } else {
      // Create new shift
      showCreateShiftModal(employee, date);
    }
  };

  // Show create shift modal
  const showCreateShiftModal = (employee: Employee, date: Date) => {
    const initialData: ShiftModalData = {
      startTime: "12:00",
      endTime: "18:00",
      shiftType: ShiftType.Bedienen,
      isOpenEnded: false,
      isStandby: false,
      notes: "",
    };

    showShiftModal(
      "Nieuwe shift toevoegen",
      `Voor ${employee.fullName} op ${formatDate(date)}`,
      initialData,
      async (data) => {
        const apiData: CreateShiftRequest = {
          employeeId: employee.id,
          date: formatDate(date),
          startTime: data.startTime + ":00",
          endTime: data.endTime ? data.endTime + ":00" : null,
          shiftType: data.shiftType,
          isOpenEnded: data.isOpenEnded,
          isStandby: data.isStandby,
          notes: data.notes?.trim() || undefined,
        };

        await api.createShift(apiData);
        loadWeekShifts();
      }
    );
  };

  // Show edit shift modal
  const showEditShiftModal = (shift: Shift, employee: Employee, date: Date) => {
    const initialData: ShiftModalData = {
      startTime: shift.startTime.substring(0, 5), // Remove seconds
      endTime: shift.endTime ? shift.endTime.substring(0, 5) : "",
      shiftType: shift.shiftType,
      isOpenEnded: shift.isOpenEnded,
      isStandby: shift.isStandby,
      notes: shift.notes || "",
    };

    showShiftModal(
      "Shift bewerken",
      `Voor ${employee.fullName} op ${formatDate(date)}`,
      initialData,
      async (data) => {
        const apiData = {
          employeeId: employee.id,
          date: formatDate(date),
          startTime: data.startTime + ":00",
          endTime: data.endTime ? data.endTime + ":00" : null,
          shiftType: data.shiftType,
          isOpenEnded: data.isOpenEnded,
          isStandby: data.isStandby,
          notes: data.notes?.trim() || undefined,
        };

        await api.updateShift(shift.id, apiData);
        loadWeekShifts();
      },
      () => handleDeleteShift(shift)
    );
  };

  // Generic shift modal
  const showShiftModal = (
    title: string,
    subtitle: string,
    initialData: ShiftModalData,
    onSubmit: (data: ShiftModalData) => Promise<void>,
    onDelete?: () => void
  ) => {
    clearAllErrors();

    let localFormData = { ...initialData };
    let localFieldErrors: Record<string, string> = {};

    const handleFormSubmit = async () => {
      // Use the official validation system
      const isValid = validateForm({
        startTime: localFormData.startTime,
        endTime: localFormData.isOpenEnded ? "" : localFormData.endTime,
        shiftType: localFormData.shiftType,
        notes: localFormData.notes,
        isOpenEnded: localFormData.isOpenEnded,
      });

      localFieldErrors = { ...fieldErrors };

      if (!isValid) {
        // Trigger re-render with errors
        showShiftModal(title, subtitle, localFormData, onSubmit, onDelete);
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(localFormData);
        hideModal();
        showAlert({
          title: "Succes",
          message: onDelete ? "Shift is bijgewerkt" : "Shift is toegevoegd",
          confirmText: "OK",
          icon: <CheckCircle className="h-6 w-6 text-green-600" />,
        });
      } catch (error: unknown) {
        console.error("Error saving shift:", error);
        showAlert({
          title: "Fout",
          message: "Er is een fout opgetreden bij het opslaan van de shift",
          confirmText: "OK",
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    showModal({
      type: "custom",
      title,
      size: "lg",
      showCancel: true,
      confirmText: isSubmitting ? "Opslaan..." : "Opslaan",
      cancelText: "Annuleren",
      onConfirm: handleFormSubmit,
      content: (
        <div className="space-y-6">
          <p className="text-sm text-gray-600 mb-4">{subtitle}</p>

          {/* Start Time */}
          <div>
            <label
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
                defaultValue={localFormData.startTime}
                onChange={(e) => {
                  localFormData.startTime = e.target.value;
                  if (localFieldErrors.startTime) {
                    delete localFieldErrors.startTime;
                  }
                }}
                className={`w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 ${
                  localFieldErrors.startTime || fieldErrors.startTime
                    ? "border-red-300 bg-red-50/50 focus:ring-red-500/50"
                    : "border-gray-200 bg-white/60 focus:ring-blue-500/50"
                }`}
              />
            </div>
            {(localFieldErrors.startTime || fieldErrors.startTime) && (
              <p className="mt-2 text-sm text-red-600">
                {localFieldErrors.startTime || fieldErrors.startTime}
              </p>
            )}
          </div>

          {/* End Time */}
          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#120309" }}
            >
              Eind tijd{" "}
              {!localFormData.isOpenEnded && (
                <span className="text-red-500">*</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Clock className="h-5 w-5" style={{ color: "#67697c" }} />
              </div>
              <input
                type="time"
                defaultValue={localFormData.endTime}
                onChange={(e) => {
                  localFormData.endTime = e.target.value;
                  if (localFieldErrors.endTime) {
                    delete localFieldErrors.endTime;
                  }
                }}
                className={`w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 ${
                  localFieldErrors.endTime || fieldErrors.endTime
                    ? "border-red-300 bg-red-50/50 focus:ring-red-500/50"
                    : "border-gray-200 bg-white/60 focus:ring-blue-500/50"
                } ${localFormData.isOpenEnded ? "opacity-50" : ""}`}
                disabled={localFormData.isOpenEnded}
              />
            </div>
            {(localFieldErrors.endTime || fieldErrors.endTime) && (
              <p className="mt-2 text-sm text-red-600">
                {localFieldErrors.endTime || fieldErrors.endTime}
              </p>
            )}
          </div>

          {/* Open Ended */}
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked={localFormData.isOpenEnded}
                onChange={(e) => {
                  localFormData.isOpenEnded = e.target.checked;
                  if (e.target.checked) {
                    localFormData.endTime = "";
                    const endTimeInput = document.querySelector(
                      'input[type="time"]:nth-of-type(2)'
                    ) as HTMLInputElement;
                    if (endTimeInput) endTimeInput.value = "";
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
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
                defaultChecked={localFormData.isStandby}
                onChange={(e) => {
                  localFormData.isStandby = e.target.checked;
                }}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500/50"
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
                defaultValue={localFormData.shiftType}
                onChange={(e) => {
                  localFormData.shiftType = parseInt(
                    e.target.value
                  ) as ShiftType;
                }}
                className="w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 focus:outline-none focus:ring-2 transition-all duration-200 border-gray-200 bg-white/60 focus:ring-blue-500/50"
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
              className="block text-sm font-semibold mb-2"
              style={{ color: "#120309" }}
            >
              Opmerkingen
            </label>
            <div className="relative">
              <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none">
                <FileText className="h-5 w-5" style={{ color: "#67697c" }} />
              </div>
              <textarea
                defaultValue={localFormData.notes}
                onChange={(e) => {
                  localFormData.notes = e.target.value;
                }}
                placeholder="Opmerkingen..."
                rows={3}
                className="w-full pl-12 pr-4 py-3 border rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 resize-none border-gray-200 bg-white/60 focus:ring-blue-500/50"
              />
            </div>
          </div>

          {/* Delete button for edit mode */}
          {onDelete && (
            <div className="pt-4 border-t">
              <button
                onClick={() => {
                  hideModal();
                  setTimeout(onDelete, 150);
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Shift verwijderen</span>
              </button>
            </div>
          )}
        </div>
      ),
    });
  };

  // Delete shift handler
  const handleDeleteShift = (shift: Shift) => {
    showConfirm({
      title: "Shift verwijderen",
      message: `Weet je zeker dat je deze shift wilt verwijderen?`,
      confirmText: "Verwijderen",
      cancelText: "Annuleren",
      variant: "danger",
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      onConfirm: async () => {
        try {
          await api.deleteShift(shift.id);
          loadWeekShifts();
          showAlert({
            title: "Shift verwijderd",
            message: "De shift is succesvol verwijderd.",
            confirmText: "OK",
            icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          });
        } catch (error: unknown) {
          console.error("Error deleting shift:", error);
          showAlert({
            title: "Fout bij verwijderen",
            message:
              "Er is een fout opgetreden bij het verwijderen van de shift",
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

  // Render availability icon
  const renderAvailabilityIcon = (status: AvailabilityStatus | null) => {
    switch (status) {
      case AvailabilityStatus.Available:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case AvailabilityStatus.NotAvailable:
        return <XCircle className="h-4 w-4 text-red-600" />;
      case AvailabilityStatus.TimeOff:
        return <Plane className="h-4 w-4 text-purple-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user || !isManager()) {
    return null;
  }

  const weekDates = getWeekDates(currentWeekDate);

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #e8eef2 0%, #d5896f 100%)",
      }}
    >
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
                <Calendar className="h-8 w-8 text-white" />
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
                  Rooster beheren
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {/* Week Navigation */}
          <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-200/50">
            <div className="flex items-center space-x-4">
              <button
                onClick={navigateToToday}
                className="px-4 py-2 bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 text-gray-700 font-medium hover:bg-white transition-colors cursor-pointer"
              >
                Vandaag
              </button>
            </div>

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

          {/* Excel-like Grid */}
          {isLoadingEmployees || isLoadingShifts || isLoadingAvailability ? (
            <div className="p-12 text-center">
              <div
                className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: "#d5896f" }}
              ></div>
              <p className="mt-4 font-medium" style={{ color: "#67697c" }}>
                Rooster laden...
              </p>
            </div>
          ) : (
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  {/* Header Row */}
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-50 p-4 text-left font-semibold text-gray-700 min-w-[200px]">
                        Medewerker
                      </th>
                      {weekDates.map((date, index) => (
                        <th
                          key={index}
                          className={`border border-gray-300 p-4 text-center font-semibold min-w-[150px] ${
                            isToday(date)
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm capitalize">
                              {date.toLocaleDateString("nl-NL", {
                                weekday: "long",
                              })}
                            </span>
                            <span className="text-lg font-bold">
                              {date.getDate()}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Employee Rows */}
                  <tbody>
                    {employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50/50">
                        {/* Employee Name */}
                        <td className="border border-gray-300 bg-white p-4 font-medium text-gray-900">
                          {employee.fullName}
                        </td>

                        {/* Day Cells */}
                        {weekDates.map((date, dayIndex) => {
                          const availabilityStatus = getAvailabilityStatus(
                            employee.id,
                            date
                          );
                          const shift = getShiftForEmployeeDate(
                            employee.id,
                            date
                          );
                          const colors = shift
                            ? getShiftColor(shift.shiftType)
                            : null;

                          return (
                            <td
                              key={dayIndex}
                              className={`border border-gray-300 p-3 text-center cursor-pointer hover:bg-gray-100 transition-colors min-h-[80px] ${
                                shift ? colors?.bg : "bg-white"
                              }`}
                              onClick={() => handleCellClick(employee, date)}
                            >
                              <div className="flex flex-col items-center space-y-2">
                                {/* Availability Icon */}
                                <div className="flex items-center justify-center">
                                  {renderAvailabilityIcon(availabilityStatus)}
                                </div>

                                {/* Shift Time */}
                                {shift && (
                                  <div
                                    className={`text-sm font-medium ${
                                      colors?.text || "text-gray-900"
                                    }`}
                                  >
                                    {formatShiftTime(shift)}
                                    {shift.isStandby && (
                                      <div className="text-xs text-orange-600 mt-1">
                                        Standby
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
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
  );
}

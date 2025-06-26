'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Users, AlertTriangle, RefreshCw, CheckCircle, User } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { Shift, ShiftType } from '@/types/shift';
import { Employee } from '@/types/auth';
import * as api from '@/lib/api';

type ViewType = 'week' | 'month' | 'day';

// Shift type colors
const getShiftColor = (shiftType: ShiftType): { bg: string; border: string; text: string } => {
  switch (shiftType) {
    case ShiftType.Schoonmaak: // Schoonmaak
      return { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' };
    case ShiftType.Bedienen: // Bedienen
      return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900' };
    case ShiftType.SchoonmaakBedienen: // Schoonmaak & Bedienen
      return { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900' };
    default:
      return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900' };
  }
};

// Time helpers
const SCHEDULE_START_HOUR = 12; // 12:00
const SCHEDULE_END_HOUR = 24; // 24:00 (midnight) - full schedule display
const OPEN_END_HOUR = 22; // 22:00 (10 PM) - end time for open shifts visually
const HOURS_IN_SCHEDULE = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;

const formatTime = (time: string): string => {
  // Convert HH:MM:SS to HH:MM
  return time.substring(0, 5);
};

const timeToPosition = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;

  // Handle midnight case (00:00 should be treated as 24:00 for positioning)
  if (hours === 0) {
    totalMinutes = 24 * 60 + minutes;
  }

  const scheduleStartMinutes = SCHEDULE_START_HOUR * 60;
  const minutesFromStart = totalMinutes - scheduleStartMinutes;
  return (minutesFromStart / (HOURS_IN_SCHEDULE * 60)) * 100;
};

const calculateShiftWidth = (startTime: string, endTime: string | null, isOpenEnded: boolean): number => {
  if (isOpenEnded || !endTime) {
    // Open ended shifts go until 22:00 (10 PM)
    const startPos = timeToPosition(startTime);
    const endPos = timeToPosition('22:00:00');
    return Math.max(endPos - startPos, 5); // Minimum 5% width
  }

  const startPos = timeToPosition(startTime);
  const endPos = timeToPosition(endTime);

  // Handle shifts that cross midnight or go beyond our schedule
  if (endPos <= startPos) {
    // If end time is before start time or at start time, extend to end of schedule
    return Math.max(timeToPosition('22:00:00') - startPos, 5); // Minimum 5% width for visibility
  }

  return Math.max(endPos - startPos, 5); // Minimum 5% width for visibility
};

export default function SchedulePage() {
  usePageTitle('Dashboard - Mijn rooster');

  const { user, isLoading, isManager } = useAuth();
  const { showModal, showAlert, showConfirm, hideModal } = useModal();
  const router = useRouter();

  // State
  const [viewType, setViewType] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const [hoveredShiftId, setHoveredShiftId] = useState<number | null>(null);

  // Employee selection state (for managers)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load employees for managers
  useEffect(() => {
    if (user && isManager()) {
      loadEmployees();
    }
  }, [user, isManager]);

  // Reset employee selection when switching to day view
  useEffect(() => {
    if (viewType === 'day' && selectedEmployeeId !== null) {
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
    }
  }, [viewType, selectedEmployeeId]);

  // Load shifts when date, view type, or selected employee changes
  useEffect(() => {
    if (user) {
      loadShifts();
    }
  }, [user, currentDate, viewType, selectedEmployeeId]);

  // Load employees list (managers only)
  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const employeesData = await api.getAllEmployees();
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      showAlert({
        title: 'Fout bij laden',
        message: 'Er is een fout opgetreden bij het laden van de medewerkers.',
        confirmText: 'OK',
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Handle employee selection
  const handleEmployeeSelection = (employeeId: string) => {
    if (employeeId === 'own') {
      // Reset to own schedule
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
    } else {
      const empId = parseInt(employeeId);
      const employee = employees.find(emp => emp.id === empId);
      setSelectedEmployeeId(empId);
      setSelectedEmployee(employee || null);
    }
  };

  // Load shifts from API
  const loadShifts = async () => {
    setIsLoadingShifts(true);
    try {
      let startDate: Date;
      let endDate: Date;

      if (viewType === 'week') {
        const weekDates = getWeekDates(currentDate);
        startDate = weekDates[0];
        endDate = weekDates[6];
      } else if (viewType === 'month') {
        const monthDays = getDaysInMonth(currentDate);
        startDate = monthDays[0];
        endDate = monthDays[monthDays.length - 1];
      } else {
        // Day view - load just that day
        startDate = new Date(currentDate);
        endDate = new Date(currentDate);
      }

      // Format dates for API (YYYY-MM-DD) using local time to avoid timezone issues
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const formattedStartDate = formatDateForAPI(startDate);
      const formattedEndDate = formatDateForAPI(endDate);

      const shiftsData = await api.getAllShifts({
        startDate: formattedStartDate,
        endDate: formattedEndDate
      });

      setShifts(shiftsData);
    } catch (error) {
      console.error('Error loading shifts:', error);
      showAlert({
        title: 'Fout bij laden',
        message: 'Er is een fout opgetreden bij het laden van de shifts.',
        confirmText: 'OK',
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />
      });
    } finally {
      setIsLoadingShifts(false);
    }
  };

  // Generate time slots for the schedule
  const timeSlots: string[] = [];
  for (let hour = SCHEDULE_START_HOUR; hour < SCHEDULE_END_HOUR; hour++) {
    const displayHour = hour === 24 ? 0 : hour; // Convert 24 to 0 for display
    timeSlots.push(`${displayHour.toString().padStart(2, '0')}:00`);
  }
  // Add the final hour (00:00)
  timeSlots.push('00:00');

  // Get week dates
  const getWeekDates = (date: Date): Date[] => {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    startOfWeek.setDate(diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  // Get days in month
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    return days;
  };

  // Navigation handlers
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewType === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewType === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  // Navigate to day view for a specific date
  const navigateToDay = (date: Date) => {
    setCurrentDate(new Date(date));
    setViewType('day');
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  // Get shifts for a specific date with filtering based on selected employee
  const getShiftsForDate = (date: Date): Shift[] => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD format

    const dayShifts = shifts.filter(shift => {
      // Handle different possible date formats from backend
      let shiftDateStr = shift.date;

      // If shift.date is in DD-MM-YYYY format, convert to YYYY-MM-DD
      if (shiftDateStr.includes('-') && shiftDateStr.length === 10) {
        const parts = shiftDateStr.split('-');
        if (parts.length === 3 && parts[0].length === 2) {
          // DD-MM-YYYY format, convert to YYYY-MM-DD
          shiftDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // If shift.date includes time (ISO format), extract just the date part
      if (shiftDateStr.includes('T')) {
        shiftDateStr = shiftDateStr.split('T')[0];
      }

      return shiftDateStr === dateStr;
    });

    // Filter based on selected employee or current user
    const targetEmployeeId = selectedEmployeeId || user?.id;

    if (viewType === 'day') {
      // In day view, show all shifts if manager viewing all, or specific employee's shifts
      if (isManager() && selectedEmployeeId === null) {
        // Manager viewing all employees
        return dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
      } else {
        // Viewing specific employee or user viewing their own
        return dayShifts.filter(shift => shift.employeeId === targetEmployeeId)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
      }
    } else {
      // In week/month view, always show only the target employee's shifts
      return dayShifts.filter(shift => shift.employeeId === targetEmployeeId);
    }
  };

  // Get all shifts for the current date (used in day view when showing all employees)
  const getAllShiftsForDate = (date: Date): Shift[] => {
    // Use local date formatting to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD format

    const dayShifts = shifts.filter(shift => {
      // Handle different possible date formats from backend
      let shiftDateStr = shift.date;

      // If shift.date is in DD-MM-YYYY format, convert to YYYY-MM-DD
      if (shiftDateStr.includes('-') && shiftDateStr.length === 10) {
        const parts = shiftDateStr.split('-');
        if (parts.length === 3 && parts[0].length === 2) {
          // DD-MM-YYYY format, convert to YYYY-MM-DD
          shiftDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // If shift.date includes time (ISO format), extract just the date part
      if (shiftDateStr.includes('T')) {
        shiftDateStr = shiftDateStr.split('T')[0];
      }

      return shiftDateStr === dateStr;
    });

    // If viewing specific employee, filter to only their shifts
    if (selectedEmployeeId) {
      return dayShifts.filter(shift => shift.employeeId === selectedEmployeeId)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }

    // Otherwise return all shifts for the date
    return dayShifts.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Calculate shift lanes for overlapping shifts (horizontal positioning)
  const calculateShiftLanes = (shifts: Shift[]): Array<Shift & { lane: number; totalLanes: number }> => {
    if (shifts.length === 0) return [];

    // Sort shifts by start time
    const sortedShifts = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const lanesData: Array<Shift & { lane: number; totalLanes: number }> = [];
    const lanes: Array<{ endTime: string; isOpenEnded: boolean; shiftId: number }> = [];

    sortedShifts.forEach(shift => {
      // Find the first available lane (check for time overlap)
      let assignedLane = -1;

      for (let i = 0; i < lanes.length; i++) {
        const lane = lanes[i];

        // Check if this lane is available (previous shift has ended or doesn't overlap)
        if (!lane.isOpenEnded && lane.endTime <= shift.startTime) {
          assignedLane = i;
          break;
        }
      }

      // If no lane is available, create a new one
      if (assignedLane === -1) {
        assignedLane = lanes.length;
        lanes.push({ endTime: '', isOpenEnded: false, shiftId: -1 });
      }

      // Update the lane with current shift info
      const endTime = shift.isOpenEnded ? '22:00:00' : (shift.endTime || '22:00:00');
      lanes[assignedLane] = {
        endTime: endTime,
        isOpenEnded: shift.isOpenEnded,
        shiftId: shift.id
      };

      lanesData.push({
        ...shift,
        lane: assignedLane,
        totalLanes: lanes.length
      });
    });

    // Update all shifts with the final total lanes count
    const maxLanes = lanes.length;
    return lanesData.map(shift => ({ ...shift, totalLanes: maxLanes }));
  };

  // Check if a shift should be rendered in a specific time slot (for continuing shifts)
  const shouldRenderShiftInTimeSlot = (shift: Shift, timeSlot: string): boolean => {
    const [timeHour, timeMinute] = timeSlot.split(':').map(Number);
    let timeSlotMinutes = timeHour * 60 + timeMinute;

    // Handle midnight (00:00) as 24:00 for comparison
    if (timeHour === 0) {
      timeSlotMinutes = 24 * 60;
    }

    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    let startMinutes = startHour * 60 + startMinute;

    // Handle midnight in start time
    if (startHour === 0) {
      startMinutes = 24 * 60 + startMinute;
    }

    let endMinutes: number;
    if (shift.isOpenEnded) {
      // Open ended shifts go until 22:00
      endMinutes = 22 * 60;
    } else if (shift.endTime) {
      const [endHour, endMin] = shift.endTime.split(':').map(Number);
      endMinutes = endHour * 60 + endMin;

      // Handle midnight in end time
      if (endHour === 0) {
        endMinutes = 24 * 60 + endMin;
      }
    } else {
      endMinutes = 22 * 60; // Default to 22:00 if no end time
    }

    // Check if this time slot is within the shift duration
    return timeSlotMinutes >= startMinutes && timeSlotMinutes < endMinutes;
  };

  // Calculate how many time slots a shift spans
  const calculateShiftDurationInSlots = (shift: Shift): number => {
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    let startMinutes = startHour * 60 + startMinute;

    // Handle midnight in start time
    if (startHour === 0) {
      startMinutes = 24 * 60 + startMinute;
    }

    let endMinutes: number;
    if (shift.isOpenEnded) {
      // Open ended shifts go until 22:00
      endMinutes = 22 * 60;
    } else if (shift.endTime) {
      const [endHour, endMin] = shift.endTime.split(':').map(Number);
      endMinutes = endHour * 60 + endMin;

      // Handle midnight in end time
      if (endHour === 0) {
        endMinutes = 24 * 60 + endMin;
      }
    } else {
      endMinutes = 22 * 60; // Default to 22:00 if no end time
    }

    const durationInMinutes = endMinutes - startMinutes;
    return Math.ceil(durationInMinutes / 60); // Convert to hours and round up
  };

  // Render shift blocks for a specific day in week view
  const renderShiftBlocksForDay = (dayShifts: Shift[], timeSlots: string[]) => {
    if (dayShifts.length === 0) return null;

    const shiftsWithLanes = calculateShiftLanes(dayShifts);

    return shiftsWithLanes.map(shift => {
      const colors = getShiftColor(shift.shiftType);
      const shiftDurationInSlots = calculateShiftDurationInSlots(shift);

      // Find the starting time slot index
      const [shiftHour, shiftMinute] = shift.startTime.split(':').map(Number);

      // Find the time slot that contains this shift's start hour
      const shiftHourFormatted = `${shiftHour.toString().padStart(2, '0')}:00`;
      const startTimeIndex = timeSlots.findIndex(slot => slot === shiftHourFormatted);

      if (startTimeIndex === -1) return null;

      // Calculate height and position based on lanes
      const laneWidth = 100 / shift.totalLanes;
      const leftPosition = (shift.lane * laneWidth);

      const isHovered = hoveredShiftId === shift.id;

      // Display name based on whether we're viewing a specific employee or all employees
      const displayName = (viewType === 'day' && !selectedEmployeeId) ? shift.employeeName : shift.shiftTypeName;

      return (
        <div
          key={shift.id}
          onClick={() => handleShiftClick(shift)}
          onMouseEnter={() => setHoveredShiftId(shift.id)}
          onMouseLeave={() => setHoveredShiftId(null)}
          className={`absolute cursor-pointer rounded p-2 text-xs ${colors.bg} ${colors.border} ${colors.text} border transition-all duration-200`}
          style={{
            left: `${leftPosition}%`,
            width: `${laneWidth - 1}%`, // Small gap between lanes
            top: `${startTimeIndex * 50 + startTimeIndex + 1 + (shiftMinute / 60) * 50}px`, // Position within the hour slot based on minutes
            height: `${shiftDurationInSlots * 50 + (shiftDurationInSlots - 1) - 3}px`, // 50px per slot + borders between slots - 3px padding
            minHeight: '36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            zIndex: isHovered ? 30 : 15,
            transform: isHovered ? 'scale(1.05)' : 'scale(1)',
            boxShadow: isHovered ? '0 10px 25px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div
            className="font-medium"
            style={{
              fontSize: viewType === 'day'
                ? (shift.totalLanes > 6 ? '14px' : '16px')
                : (shift.totalLanes > 3 ? '13px' : '15px'),
              lineHeight: '1.2',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal'
            }}
          >
            {displayName}
          </div>
          <div
            className="text-xs opacity-80 mt-1"
            style={{
              fontSize: viewType === 'day'
                ? (shift.totalLanes > 6 ? '14px' : '16px')
                : (shift.totalLanes > 3 ? '13px' : '15px'),
              lineHeight: '1.1',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal'
            }}
          >
            {formatTime(shift.startTime)} - {shift.isOpenEnded ? 'einde' : formatTime(shift.endTime!)}
            {((viewType === 'day' && !selectedEmployeeId) || selectedEmployeeId) && (
              <div className="mt-0.5 text-xs opacity-70">
                {(viewType === 'day' && !selectedEmployeeId) ? shift.shiftTypeName : shift.employeeName}
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  // Check if a time slot has shifts for hiding borders
  const hasShiftsInTimeSlot = (date: Date, timeSlot: string): boolean => {
    const dayShifts = getShiftsForDate(date);
    return dayShifts.some(shift => shouldRenderShiftInTimeSlot(shift, timeSlot));
  };

  const getNavigationTitle = (): string => {
    if (viewType === 'week') {
      const weekDates = getWeekDates(currentDate);
      const startDate = weekDates[0];
      const endDate = weekDates[6];
      const startMonth = startDate.toLocaleDateString('nl-NL', { month: 'short' });
      const endMonth = endDate.toLocaleDateString('nl-NL', { month: 'short' });
      const year = startDate.getFullYear();

      if (startMonth === endMonth) {
        return `${startDate.getDate()} - ${endDate.getDate()} ${startMonth} ${year}`;
      } else {
        return `${startDate.getDate()} ${startMonth} - ${endDate.getDate()} ${endMonth} ${year}`;
      }
    } else if (viewType === 'month') {
      return currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    } else if (viewType === 'day') {
      return currentDate.toLocaleDateString('nl-NL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    return '';
  };

  // Delete shift handler (managers only)
  const handleDeleteShift = (shift: Shift) => {
    if (!isManager()) {
      showAlert({
        title: 'Onvoldoende rechten',
        message: 'Alleen managers kunnen shifts verwijderen.',
        confirmText: 'OK',
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />
      });
      return;
    }

    showConfirm({
      title: 'Shift verwijderen',
      message: `Weet je zeker dat je de shift van ${shift.employeeName} op ${formatDate(shift.date)} van ${formatTime(shift.startTime)} tot ${shift.isOpenEnded ? 'einde' : formatTime(shift.endTime!)} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
      confirmText: 'Ja, verwijderen',
      cancelText: 'Annuleren',
      variant: 'danger',
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      onConfirm: async () => {
        try {
          await api.deleteShift(shift.id);

          // Refresh shifts list
          await loadShifts();

          // Show success message
          showAlert({
            title: 'Shift verwijderd',
            message: `De shift van ${shift.employeeName} is succesvol verwijderd.`,
            confirmText: 'OK',
            icon: <CheckCircle className="h-6 w-6 text-green-600" />
          });
        } catch (error: any) {
          console.error('Error deleting shift:', error);

          let errorMessage = 'Er is een fout opgetreden bij het verwijderen van de shift.';
          if (error.status === 403) {
            errorMessage = 'Je hebt geen rechten om deze shift te verwijderen.';
          } else if (error.status === 404) {
            errorMessage = 'De shift is niet gevonden of al verwijderd.';
          }

          showAlert({
            title: 'Fout bij verwijderen',
            message: errorMessage,
            confirmText: 'OK',
            icon: <AlertTriangle className="h-6 w-6 text-red-600" />
          });
        }
      }
    });
  };

  // Shift click handler
  const handleShiftClick = (shift: Shift) => {
    const colors = getShiftColor(shift.shiftType);

    showModal({
      type: 'custom',
      title: 'Shift details',
      size: 'md',
      showCancel: false,
      confirmText: 'Sluiten',
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
              {shift.shiftTypeName}
            </div>
            {shift.isOpenEnded && (
              <span className="text-sm text-gray-600">Open einde</span>
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
                <p className="text-sm text-gray-600">{shift.durationInHours} uur</p>
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
                onClick={() => console.log('Edit shift:', shift.id)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
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
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Verwijderen</span>
              </button>
            </div>
          )}
        </div>
      ),
      icon: <Clock className="h-6 w-6" style={{ color: '#d5896f' }} />
    });
  };

  // Add shift handler (managers only)
  const handleAddShift = () => {
    if (!isManager()) return;

    router.push('/schedule/create');
  };

  // Get page title based on selected employee
  const getPageTitle = (): string => {
    if (selectedEmployee) {
      return `Rooster van ${selectedEmployee.fullName}`;
    }
    return 'Mijn rooster';
  };

  // Get page description based on selected employee
  const getPageDescription = (): string => {
    if (selectedEmployee) {
      return `Bekijk het rooster van ${selectedEmployee.fullName}`;
    }
    if (viewType === 'day') {
      return 'Bekijk het rooster voor deze dag';
    }
    return 'Bekijk je rooster voor de week of maand';
  };

  if (isLoading) {
    return <LoadingScreen message="Rooster laden" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-full mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {getPageTitle()}
                      </h1>
                      <p className="text-lg mt-1" style={{ color: '#67697c' }}>
                        {getPageDescription()}
                      </p>
                    </div>
                  </div>

                  {isManager() && (
                    <button
                      onClick={handleAddShift}
                      className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                    >
                      <Plus className="h-5 w-5" />
                      <span>Nieuwe shift</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* View Controls */}
          <div className="mb-6 flex items-center justify-between">
            {/* View Type Tabs */}
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-1 flex">
              <button
                onClick={() => setViewType('day')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${viewType === 'day'
                  ? 'bg-gradient-to-r from-[#d5896f] to-[#d5896f90] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                  }`}
              >
                Dag
              </button>
              <button
                onClick={() => setViewType('week')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${viewType === 'week'
                  ? 'bg-gradient-to-r from-[#d5896f] to-[#d5896f90] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                  }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType('month')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${viewType === 'month'
                  ? 'bg-gradient-to-r from-[#d5896f] to-[#d5896f90] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 cursor-pointer'
                  }`}
              >
                Maand
              </button>
            </div>

            {/* Employee selection dropdown for managers (hidden in day view since it shows all shifts) */}
            {isManager() && viewType !== 'day' && (
              <div className="flex items-center space-x-3 bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 px-4 py-2">
                <User className="h-5 w-5" style={{ color: '#67697c' }} />
                <label className="text-sm font-medium" style={{ color: '#120309' }}>
                  Bekijk rooster van:
                </label>
                <div className="relative">
                  <select
                    value={selectedEmployeeId || 'own'}
                    onChange={(e) => handleEmployeeSelection(e.target.value)}
                    disabled={isLoadingEmployees}
                    className="pl-3 pr-8 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg min-w-[180px]"
                    style={{ color: '#120309' }}
                    onFocus={(e) => {
                      const target = e.target as HTMLSelectElement;
                      target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                      target.style.borderColor = '#d5896f';
                    }}
                    onBlur={(e) => {
                      const target = e.target as HTMLSelectElement;
                      target.style.boxShadow = '';
                      target.style.borderColor = '#d1d5db';
                    }}
                  >
                    <option value="own">Mijn eigen rooster</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </option>
                    ))}
                  </select>
                  {isLoadingEmployees && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2" style={{ borderColor: '#d5896f' }}></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={navigateToToday}
                className="px-4 py-2 bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 text-gray-700 font-medium hover:bg-white transition-colors cursor-pointer"
              >
                Vandaag
              </button>

              <div className="flex items-center bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20">
                <button
                  onClick={navigatePrevious}
                  className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>

                <div className="px-4 py-2 min-w-[200px] text-center font-medium text-gray-900">
                  {getNavigationTitle()}
                </div>

                <button
                  onClick={navigateNext}
                  className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Schedule View */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            {isLoadingShifts ? (
              // Loading state
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#d5896f' }}></div>
                <p className="mt-4 font-medium" style={{ color: '#67697c' }}>Shifts laden...</p>
              </div>
            ) : viewType === 'day' ? (
              // Day View - Same grid layout as week view but with custom column widths (1/8 for time, 7/8 for day)
              <div className="p-6">
                <div className="grid gap-px bg-gray-200" style={{ gridTemplateColumns: '1fr 7fr' }}>
                  {/* Time column header */}
                  <div className="bg-white p-4">
                    <p className="text-sm font-medium text-gray-600">Tijd</p>
                  </div>

                  {/* Day header */}
                  <div className="bg-white p-4 text-center">
                    <p className="text-lg font-medium text-gray-600 capitalize">
                      {currentDate.toLocaleDateString('nl-NL', { weekday: 'long' })}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {currentDate.getDate()}
                    </p>
                  </div>

                  {/* Time slots and shifts */}
                  {timeSlots.map((time, timeIndex) => (
                    <React.Fragment key={`time-row-${timeIndex}`}>
                      {/* Time label */}
                      <div className="bg-white p-2 flex items-start" style={{ minHeight: '50px', zIndex: 5 }}>
                        <p className="text-sm text-gray-600 font-medium">{time}</p>
                      </div>

                      {/* Day cell */}
                      <div
                        className="bg-white p-0 relative"
                        style={{ minHeight: '50px' }}
                      >
                        {/* Render all shifts for this day only once at the first time slot */}
                        {timeIndex === 0 && (
                          <div className="absolute inset-0" style={{ zIndex: 10 }}>
                            {renderShiftBlocksForDay(getAllShiftsForDate(currentDate), timeSlots)}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : viewType === 'week' ? (
              // Week View
              <div className="p-6">
                <div className="grid grid-cols-8 gap-px bg-gray-200">
                  {/* Time column header */}
                  <div className="bg-white p-4">
                    <p className="text-sm font-medium text-gray-600">Tijd</p>
                  </div>

                  {/* Day headers */}
                  {getWeekDates(currentDate).map((date, index) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayName = date.toLocaleDateString('nl-NL', { weekday: 'long' });
                    const dayNumber = date.getDate();
                    const hasShifts = getShiftsForDate(date).length > 0;

                    return (
                      <div
                        key={index}
                        onClick={() => navigateToDay(date)}
                        className={`bg-white p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-orange-50' : ''}`}
                        title="Klik om dag weergave te openen"
                      >
                        <p className="text-lg font-medium text-gray-600 capitalize">{dayName}</p>
                        <p className={`text-2xl font-bold ${isToday ? 'text-orange-600' : 'text-gray-900'}`}>
                          {dayNumber}
                        </p>
                      </div>
                    );
                  })}

                  {/* Time slots and shifts */}
                  {timeSlots.map((time, timeIndex) => (
                    <React.Fragment key={`time-row-${timeIndex}`}>
                      {/* Time label */}
                      <div className="bg-white p-2 flex items-start" style={{ minHeight: '50px', zIndex: 5 }}>
                        <p className="text-sm text-gray-600 font-medium">{time}</p>
                      </div>

                      {/* Day cells */}
                      {getWeekDates(currentDate).map((date, dayIndex) => {
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                          <div
                            key={`cell-${timeIndex}-${dayIndex}`}
                            className={`bg-white p-0 relative ${isToday ? 'bg-orange-50/50' : ''}`}
                            style={{ minHeight: '50px' }}
                          >
                            {/* Render all shifts for this day only once at the first time slot */}
                            {timeIndex === 0 && (
                              <div className="absolute inset-0" style={{ zIndex: 10 }}>
                                {renderShiftBlocksForDay(getShiftsForDate(date), timeSlots)}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ) : (
              // Month View
              <div className="p-6">
                <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
                  {/* Day headers */}
                  {['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'].map((day) => (
                    <div key={day} className="bg-gray-50 p-4 text-center">
                      <p className="text-lg font-medium text-gray-700 capitalize">{day}</p>
                    </div>
                  ))}

                  {/* Calendar days */}
                  {(() => {
                    const days = getDaysInMonth(currentDate);
                    const firstDayOfWeek = (days[0].getDay() + 6) % 7; // Convert to Monday-based
                    const paddingDays = Array(firstDayOfWeek).fill(null);

                    return [...paddingDays, ...days].map((date, index) => {
                      if (!date) {
                        return <div key={`padding-${index}`} className="bg-gray-50 p-4" />;
                      }

                      const isToday = date.toDateString() === new Date().toDateString();
                      const dayNumber = date.getDate();
                      const dayShifts = getShiftsForDate(date);

                      return (
                        <div
                          key={index}
                          onClick={() => navigateToDay(date)}
                          className={`bg-white p-4 min-h-[120px] cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'bg-orange-50 border-2 border-orange-400' : ''
                            }`}
                          title="Klik om dag weergave te openen"
                        >
                          <p className={`text-sm font-medium mb-2 ${isToday ? 'text-orange-600' : 'text-gray-900'
                            }`}>
                            {dayNumber}
                          </p>

                          {/* Shift summary */}
                          <div className="space-y-1">
                            {dayShifts.slice(0, 2).map(shift => {
                              const colors = getShiftColor(shift.shiftType);
                              return (
                                <div
                                  key={shift.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShiftClick(shift);
                                  }}
                                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${colors.bg} ${colors.text}`}
                                >
                                  <div
                                    className="font-medium"
                                    style={{
                                      lineHeight: '1.2',
                                      wordBreak: 'break-word',
                                      overflowWrap: 'break-word',
                                      whiteSpace: 'normal'
                                    }}
                                  >
                                    {formatTime(shift.startTime)} {selectedEmployee ? shift.shiftTypeName : shift.employeeName}
                                  </div>
                                </div>
                              );
                            })}
                            {dayShifts.length > 2 && (
                              <div className="text-xs text-center p-1 rounded bg-gray-100 text-gray-600 font-medium">
                                +{dayShifts.length - 2} meer
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
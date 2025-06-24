'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Users, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';
import { Shift, ShiftType } from '@/types/shift';
import * as api from '@/lib/api';

type ViewType = 'week' | 'month';

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
const SCHEDULE_END_HOUR = 24; // 00:00 (midnight)
const HOURS_IN_SCHEDULE = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;

const formatTime = (time: string): string => {
  // Convert HH:MM:SS to HH:MM
  return time.substring(0, 5);
};

const timeToPosition = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const scheduleStartMinutes = SCHEDULE_START_HOUR * 60;
  const minutesFromStart = totalMinutes - scheduleStartMinutes;
  return (minutesFromStart / (HOURS_IN_SCHEDULE * 60)) * 100;
};

const calculateShiftWidth = (startTime: string, endTime: string | null, isOpenEnded: boolean): number => {
  if (isOpenEnded || !endTime) {
    // Open ended shifts go until midnight
    return 100 - timeToPosition(startTime);
  }

  const startPos = timeToPosition(startTime);
  const endPos = timeToPosition(endTime);

  // Handle shifts that cross midnight
  if (endPos < startPos) {
    return 100 - startPos; // Just go to the end of the day
  }

  return endPos - startPos;
};

export default function SchedulePage() {
  usePageTitle('Dashboard - Rooster');

  const { user, isLoading, isManager } = useAuth();
  const { showModal, showAlert } = useModal();
  const router = useRouter();

  // State
  const [viewType, setViewType] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load shifts when date or view type changes
  useEffect(() => {
    if (user) {
      loadShifts();
    }
  }, [user, currentDate, viewType]);

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
      } else {
        const monthDays = getDaysInMonth(currentDate);
        startDate = monthDays[0];
        endDate = monthDays[monthDays.length - 1];
      }

      // Format dates for API (YYYY-MM-DD)
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];

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
  const timeSlots = [];
  for (let hour = SCHEDULE_START_HOUR; hour <= SCHEDULE_END_HOUR; hour++) {
    const displayHour = hour === 24 ? 0 : hour; // Convert 24 to 0 for display
    timeSlots.push(`${displayHour.toString().padStart(2, '0')}:00`);
  }

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
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const navigateToToday = () => {
    setCurrentDate(new Date());
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date): Shift[] => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date.startsWith(dateStr));
  };

  // Render shift block for week view
  const renderShiftBlock = (shift: Shift) => {
    const colors = getShiftColor(shift.shiftType);
    const startPos = timeToPosition(shift.startTime);
    const width = calculateShiftWidth(shift.startTime, shift.endTime, shift.isOpenEnded);

    return (
      <div
        key={shift.id}
        onClick={() => handleShiftClick(shift)}
        className={`absolute cursor-pointer rounded p-1 text-xs ${colors.bg} ${colors.border} ${colors.text} border hover:shadow-md transition-shadow`}
        style={{
          left: `${startPos}%`,
          width: `${width}%`,
          top: '2px',
          bottom: '2px'
        }}
      >
        <div className="font-medium truncate">{shift.employeeName}</div>
        <div className="text-xs opacity-80">{formatTime(shift.startTime)} - {shift.isOpenEnded ? 'einde' : formatTime(shift.endTime!)}</div>
      </div>
    );
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
    } else {
      return currentDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
    }
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
              <p className="text-lg">{shift.employeeName}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Datum</p>
              <p className="text-lg">{formatDate(shift.date)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600">Tijd</p>
              <p className="text-lg">{shift.timeRange}</p>
              {shift.durationInHours && (
                <p className="text-sm text-gray-600">{shift.durationInHours} uur</p>
              )}
            </div>

            {shift.notes && (
              <div>
                <p className="text-sm font-medium text-gray-600">Notities</p>
                <p className="text-base">{shift.notes}</p>
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
                onClick={() => console.log('Delete shift:', shift.id)}
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

    showAlert({
      title: 'Nieuwe shift toevoegen',
      message: 'Deze functie wordt binnenkort toegevoegd!',
      confirmText: 'OK',
      icon: <AlertTriangle className="h-6 w-6 text-orange-600" />
    });
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
                        Rooster
                      </h1>
                      <p className="text-lg mt-1" style={{ color: '#67697c' }}>
                        Bekijk het werkrooster van alle medewerkers
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
                onClick={() => setViewType('week')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${viewType === 'week'
                  ? 'bg-gradient-to-r from-[#d5896f] to-[#d5896f90] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType('month')}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${viewType === 'month'
                  ? 'bg-gradient-to-r from-[#d5896f] to-[#d5896f90] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                Maand
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <button
                onClick={navigateToToday}
                className="px-4 py-2 bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20 text-gray-700 font-medium hover:bg-white transition-colors"
              >
                Vandaag
              </button>

              <div className="flex items-center bg-white/80 backdrop-blur-lg rounded-lg shadow-lg border border-white/20">
                <button
                  onClick={navigatePrevious}
                  className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>

                <div className="px-4 py-2 min-w-[200px] text-center font-medium text-gray-900">
                  {getNavigationTitle()}
                </div>

                <button
                  onClick={navigateNext}
                  className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
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
                    const dayName = date.toLocaleDateString('nl-NL', { weekday: 'short' });
                    const dayNumber = date.getDate();

                    return (
                      <div
                        key={index}
                        className={`bg-white p-4 text-center ${isToday ? 'bg-orange-50' : ''}`}
                      >
                        <p className="text-sm font-medium text-gray-600 capitalize">{dayName}</p>
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
                      <div className="bg-white p-4 border-t border-gray-100">
                        <p className="text-sm text-gray-600">{time}</p>
                      </div>

                      {/* Day cells */}
                      {getWeekDates(currentDate).map((date, dayIndex) => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        const dayShifts = getShiftsForDate(date);

                        return (
                          <div
                            key={`cell-${timeIndex}-${dayIndex}`}
                            className={`bg-white p-1 border-t border-gray-100 relative ${isToday ? 'bg-orange-50/50' : ''
                              }`}
                            style={{ minHeight: '60px' }}
                          >
                            {/* Render shifts only in the first time slot row for each day */}
                            {timeIndex === 0 && dayShifts.map(shift => renderShiftBlock(shift))}
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
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {/* Day headers */}
                  {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((day) => (
                    <div key={day} className="bg-gray-50 p-4 text-center">
                      <p className="text-sm font-medium text-gray-700 uppercase">{day}</p>
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

                      return (
                        <div
                          key={index}
                          className={`bg-white p-4 min-h-[100px] ${isToday ? 'bg-orange-50 ring-2 ring-orange-400' : ''
                            }`}
                        >
                          <p className={`text-sm font-medium mb-2 ${isToday ? 'text-orange-600' : 'text-gray-900'
                            }`}>
                            {dayNumber}
                          </p>

                          {/* Shift summary */}
                          <div className="space-y-1">
                            {getShiftsForDate(date).slice(0, 3).map(shift => {
                              const colors = getShiftColor(shift.shiftType);
                              return (
                                <div
                                  key={shift.id}
                                  onClick={() => handleShiftClick(shift)}
                                  className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${colors.bg} ${colors.text}`}
                                >
                                  <div className="truncate">
                                    {formatTime(shift.startTime)} {shift.employeeName}
                                  </div>
                                </div>
                              );
                            })}
                            {getShiftsForDate(date).length > 3 && (
                              <div className="text-xs text-gray-500 text-center">
                                +{getShiftsForDate(date).length - 3} meer
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
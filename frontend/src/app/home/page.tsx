'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useError } from '@/contexts/ErrorContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { CheckCircle, X, CalendarDays, CalendarCheck, User, Clock, Edit, Trash2, AlertTriangle, Home } from 'lucide-react';
import { Shift } from '@/types/shift';
import { WeekAvailability } from '@/types/availability';
import { formatDate } from '@/utils/dateUtils';
import * as api from '@/lib/api';
import { useModal } from '@/contexts/ModalContext';
import {
  getShiftColor,
  formatTime,
  calculateShiftLanes,
  calculateShiftTopPosition,
  calculateShiftHeight,
  generateTimeSlots
} from '@/utils/scheduleUtils';

export default function HomePage() {
  usePageTitle('Dashboard - Home');

  const { user, isLoading, justLoggedIn, clearJustLoggedIn, isManager } = useAuth();
  const { showApiError } = useError();
  const { showModal, showAlert, showConfirm, hideModal } = useModal();
  const router = useRouter();
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(false);

  // State for schedule
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);
  const currentDate = new Date(); // Current date for today's schedule
  const [hoveredShiftId, setHoveredShiftId] = useState<number | null>(null);

  // State for availability
  const [weekAvailabilities, setWeekAvailabilities] = useState<WeekAvailability[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Handle authentication
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Handle welcome notification
  useEffect(() => {
    if (justLoggedIn && user) {
      setShowWelcomeNotification(true);
      const timer = setTimeout(() => {
        setShowWelcomeNotification(false);
        clearJustLoggedIn();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [justLoggedIn, user, clearJustLoggedIn]);

  // Load data when user is available
  useEffect(() => {
    if (user) {
      loadShifts();
      loadAvailability();
    }
  }, [user]);

  // Clear justLoggedIn when component unmounts
  useEffect(() => {
    return () => {
      if (justLoggedIn) {
        clearJustLoggedIn();
      }
    };
  }, [justLoggedIn, clearJustLoggedIn]);

  const loadShifts = async () => {
    setIsLoadingShifts(true);
    try {
      const startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 999);

      const shiftsData = await api.getMyShifts(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setShifts(shiftsData);
    } catch (error: any) {
      showApiError(error, 'Fout bij het laden van shifts');
    } finally {
      setIsLoadingShifts(false);
    }
  };

  const loadAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const availability = await api.getMyAvailability();
      setWeekAvailabilities(availability);
    } catch (error: any) {
      showApiError(error, 'Fout bij het laden van beschikbaarheid');
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Shift click handler (copied from schedule page)
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
      icon: <Clock className="h-6 w-6" style={{ color: '#d5896f' }} />
    });
  };

  // Shift management functions (copied from schedule page)
  const handleEditShift = (shift: Shift) => {
    if (!isManager()) {
      showAlert({
        title: 'Onvoldoende rechten',
        message: 'Alleen managers kunnen shifts bewerken.',
        confirmText: 'OK',
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />
      });
      return;
    }

    router.push(`/schedule/edit/${shift.id}`);
  };

  const handleDeleteShift = async (shift: Shift) => {
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
          await loadShifts();
          showAlert({
            title: 'Shift verwijderd',
            message: `De shift van ${shift.employeeName} is succesvol verwijderd.`,
            confirmText: 'OK',
            icon: <CheckCircle className="h-6 w-6 text-green-600" />
          });
        } catch (error: any) {

          showApiError(error, 'Fout bij het verwijderen van de shift');
        }
      }
    });
  };

  // Helper functions (copied from schedule page)
  const getAllShiftsForDate = (date: Date): Shift[] => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD format

    return shifts.filter(shift => {
      try {
        if (!shift.date) return false;

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
      } catch {
        // Invalid date format - would be logged by logging service in production
        return false;
      }
    }).sort((a, b) => a.startTime.localeCompare(b.startTime));
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
          onClick={() => handleShiftClick(shift)}
          onMouseEnter={() => setHoveredShiftId(shift.id)}
          onMouseLeave={() => setHoveredShiftId(null)}
          className={`absolute cursor-pointer rounded p-2 text-xs ${colors.bg} ${colors.border} ${colors.text} border transition-all duration-200`}
          style={{
            left: `${leftPosition}%`,
            width: `${laneWidth - 1}%`, // Small gap between lanes
            top: `${topPosition}px`, // Exact position based on start time
            height: `${height}px`, // Exact height based on duration
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
              fontSize: shift.totalLanes > 6 ? '14px' : '16px',
              lineHeight: '1.2',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal'
            }}
          >
            {shift.employeeName}
          </div>
          <div
            className="text-xs opacity-80 mt-1"
            style={{
              fontSize: shift.totalLanes > 6 ? '14px' : '16px',
              lineHeight: '1.1',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal'
            }}
          >
            {formatTime(shift.startTime)} - {shift.isOpenEnded ? 'einde' : formatTime(shift.endTime!)}
            <div className="mt-0.5 text-xs opacity-70">
              {shift.shiftTypeName}
            </div>
          </div>
        </div>
      );
    });
  };

  // Get current week availability
  const getCurrentWeekAvailability = () => {
    if (!weekAvailabilities || weekAvailabilities.length === 0) return null;

    const now = new Date();
    const startOfWeek = new Date(now);
    const dayOfWeek = startOfWeek.getDay();
    // Convert Sunday (0) to 7, then get Monday (1)
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Format as DD-MM-YYYY to match the backend format
    const day = String(startOfWeek.getDate()).padStart(2, '0');
    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const year = startOfWeek.getFullYear();
    const weekStartFormatted = `${day}-${month}-${year}`;

    return weekAvailabilities.find(week => week.weekStart === weekStartFormatted);
  };

  const getAvailabilityForDay = (dayName: string) => {
    const currentWeek = getCurrentWeekAvailability();
    if (!currentWeek) return null;

    // Map abbreviated day names to full lowercase names
    const dayMap: { [key: string]: string } = {
      'ma': 'maandag',
      'di': 'dinsdag',
      'wo': 'woensdag',
      'do': 'donderdag',
      'vr': 'vrijdag',
      'za': 'zaterdag',
      'zo': 'zondag'
    };

    const fullDayName = dayMap[dayName.toLowerCase()];
    if (!fullDayName) return null;

    // Find day by dayOfWeek property
    const dayAvailability = currentWeek.days.find(day =>
      day.dayOfWeek && day.dayOfWeek.toLowerCase() === fullDayName
    );

    return dayAvailability?.isAvailable ?? null;
  };

  const getAvailabilityIcon = (isAvailable?: boolean | null) => {
    if (isAvailable === true) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (isAvailable === false) {
      return <X className="h-4 w-4 text-red-600" />;
    } else {
      return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getAvailabilityText = (isAvailable?: boolean | null) => {
    if (isAvailable === true) return 'Beschikbaar';
    if (isAvailable === false) return 'Niet beschikbaar';
    return 'Niet opgegeven';
  };

  // Generate time slots for day view
  const timeSlots = generateTimeSlots();

  // Show loading screen while checking authentication
  if (isLoading) {
    return <LoadingScreen message="Dashboard laden" />;
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="layout-with-sidebar" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      {/* Welcome Notification */}
      {showWelcomeNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-md lg:top-4 lg:right-4 lg:z-50" style={{ top: '5rem' }}>
          <div className="bg-white/95 backdrop-blur-lg rounded-xl shadow-2xl border border-white/20 p-4 transform transition-all duration-500 ease-out animate-slide-in" style={{ boxShadow: '0 25px 50px rgba(103, 105, 124, 0.15)' }}>
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold" style={{ color: '#120309' }}>
                  Succesvol ingelogd!
                </h4>
                <p className="text-sm mt-1" style={{ color: '#67697c' }}>
                  Welkom terug, {user.fullName}. Je dashboard is klaar voor gebruik.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowWelcomeNotification(false);
                  clearJustLoggedIn();
                }}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
              >
                <X className="h-4 w-4" style={{ color: '#67697c' }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="layout-main-content overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                    <Home className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold lg:text-4xl text-2xl" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                      Welkom in je dashboard, {user.firstName}!
                    </h1>
                    <p className="text-lg mt-2 lg:text-lg text-base" style={{ color: '#67697c' }}>
                      Bekijk je rooster voor vandaag en je beschikbaarheid voor deze week
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Today's Schedule - Takes 2/3 width */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                    <CalendarDays className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: '#120309' }}>
                      Rooster vandaag
                    </h2>
                    <p className="text-sm" style={{ color: '#67697c' }}>
                      {currentDate.toLocaleDateString('nl-NL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {isLoadingShifts ? (
                  <div className="p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#d5896f' }}></div>
                    <p className="mt-4 font-medium" style={{ color: '#67697c' }}>Rooster laden...</p>
                  </div>
                ) : (
                  <div>
                    {getAllShiftsForDate(currentDate).length === 0 ? (
                      <div className="text-center py-16">
                        <CalendarDays className="mx-auto h-16 w-16 text-gray-400" />
                        <h3 className="mt-4 text-xl font-semibold text-gray-900">Geen shifts vandaag</h3>
                        <p className="mt-2 text-gray-600">Je hebt geen geplande shifts voor vandaag.</p>
                      </div>
                    ) : (
                      <div className="grid gap-px bg-gray-200 rounded-lg overflow-hidden" style={{ gridTemplateColumns: '1fr 7fr' }}>
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
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Takes 1/3 width */}
            <div className="space-y-8">
              {/* Weekly Availability */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                    <CalendarCheck className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold" style={{ color: '#120309' }}>
                    Mijn beschikbaarheid
                  </h3>
                </div>

                {isLoadingAvailability ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#d5896f' }}></div>
                    <p className="mt-2 text-sm" style={{ color: '#67697c' }}>Laden...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'].map((day) => {
                      const isAvailable = getAvailabilityForDay(day);
                      const dayNames: { [key: string]: string } = {
                        'ma': 'maandag',
                        'di': 'dinsdag',
                        'wo': 'woensdag',
                        'do': 'donderdag',
                        'vr': 'vrijdag',
                        'za': 'zaterdag',
                        'zo': 'zondag'
                      };
                      return (
                        <div key={day} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50">
                          <span className="text-sm font-medium capitalize" style={{ color: '#120309' }}>
                            {dayNames[day]}
                          </span>
                          <div className="flex items-center space-x-2">
                            {getAvailabilityIcon(isAvailable)}
                            <span className="text-xs" style={{ color: '#67697c' }}>
                              {getAvailabilityText(isAvailable)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Quick link to manage availability */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => router.push('/availability')}
                    className="w-full text-sm text-center py-2 px-4 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                    style={{ color: '#67697c' }}
                  >
                    Beschikbaarheid beheren
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: '#120309' }}>
                  Snelle acties
                </h3>

                <div className="space-y-3">
                  {/* View schedule */}
                  <button
                    onClick={() => router.push('/schedule')}
                    className="w-full group p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                        <CalendarDays className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1 group-hover:text-opacity-80 transition-all duration-200" style={{ color: '#120309' }}>
                          Rooster
                        </h4>
                        <p className="text-xs" style={{ color: '#67697c' }}>
                          Bekijk het rooster
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Manage availability */}
                  <button
                    onClick={() => router.push('/availability')}
                    className="w-full group p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                        <CalendarCheck className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1 group-hover:text-opacity-80 transition-all duration-200" style={{ color: '#120309' }}>
                          Beschikbaarheid
                        </h4>
                        <p className="text-xs" style={{ color: '#67697c' }}>
                          Beheer je beschikbaarheid
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Profile */}
                  <button
                    onClick={() => router.push('/profile')}
                    className="w-full group p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1 group-hover:text-opacity-80 transition-all duration-200" style={{ color: '#120309' }}>
                          Profiel
                        </h4>
                        <p className="text-xs" style={{ color: '#67697c' }}>
                          Bekijk je profiel
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
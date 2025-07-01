'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useError } from '@/contexts/ErrorContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Minus, CalendarCheck, User, Edit } from 'lucide-react';
import { WeekAvailability, DayAvailability } from '@/types/availability';
import { Employee } from '@/types/auth';
import * as api from '@/lib/api';

export default function AvailabilityPage() {
  const { user, isLoading, isManager } = useAuth();
  const { showApiError } = useError();
  const router = useRouter();

  // State
  const [weekAvailabilities, setWeekAvailabilities] = useState<WeekAvailability[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0); // Index voor navigatie door weken
  const [error, setError] = useState<string | null>(null);

  // Manager dropdown state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Get page title based on selected employee
  const getPageTitle = (): string => {
    if (selectedEmployee) {
      return `Beschikbaarheid van ${selectedEmployee.fullName}`;
    }
    return 'Mijn beschikbaarheid';
  };

  // Get page description based on selected employee
  const getPageDescription = (): string => {
    if (selectedEmployee) {
      return `Bekijk de beschikbaarheid van ${selectedEmployee.fullName}`;
    }
    return 'Bekijk je beschikbaarheid voor de komende weken';
  };

  usePageTitle(`Dashboard - ${getPageTitle()}`);

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

  // Load availability data
  useEffect(() => {
    if (user) {
      loadAvailability();
    }
  }, [user, selectedEmployeeId]);

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      const employeeList = await api.getEmployees();
      setEmployees(employeeList);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      showApiError(error, 'Fout bij het laden van medewerkers');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const loadAvailability = async () => {
    setIsLoadingAvailability(true);
    setError(null);
    try {
      let availability: WeekAvailability[];

      if (selectedEmployeeId && isManager()) {
        // Manager viewing specific employee's availability
        availability = await api.getEmployeeAvailability(selectedEmployeeId);
      } else {
        // User viewing their own availability
        availability = await api.getMyAvailability();
      }

      setWeekAvailabilities(availability);
    } catch (error: any) {
      console.error('Error loading availability:', error);
      setError('Kon beschikbaarheid niet laden');
      showApiError(error, 'Fout bij het laden van beschikbaarheid');
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const handleEmployeeSelection = (value: string) => {
    if (value === 'own') {
      setSelectedEmployeeId(null);
      setSelectedEmployee(null);
    } else {
      const employeeId = parseInt(value);
      setSelectedEmployeeId(employeeId);
      const employee = employees.find(emp => emp.id === employeeId);
      setSelectedEmployee(employee || null);
    }
  };

  const getAvailabilityIcon = (isAvailable?: boolean | null) => {
    if (isAvailable === true) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    } else if (isAvailable === false) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    } else {
      return <Minus className="h-5 w-5 text-gray-400" />;
    }
  };

  const getAvailabilityText = (isAvailable?: boolean | null) => {
    if (isAvailable === true) return 'Beschikbaar';
    if (isAvailable === false) return 'Niet beschikbaar';
    return 'Niet opgegeven';
  };

  const getAvailabilityColor = (isAvailable?: boolean | null) => {
    if (isAvailable === true) return 'bg-green-50 border-green-200';
    if (isAvailable === false) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  const formatWeekRange = (weekStart: string) => {
    // Parse DD-MM-YYYY format
    const [day, month, year] = weekStart.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short'
      });
    };

    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getWeekNumber = (weekStart: string) => {
    // Parse DD-MM-YYYY format
    const [day, month, year] = weekStart.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Copy date so don't modify original
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);

    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

    // Calculate full weeks to nearest Thursday
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const navigateWeeks = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    } else if (direction === 'next' && currentWeekIndex < weekAvailabilities.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Beschikbaarheid laden" />;
  }

  if (!user) {
    return null;
  }

  const currentWeek = weekAvailabilities[currentWeekIndex];

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      <main className="layout-main-content overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <CalendarCheck className="h-8 w-8 text-white" />
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

                  {/* Only show "Add availability" button when viewing own availability */}
                  {!selectedEmployeeId && (
                    <button
                      onClick={() => router.push('/availability/create')}
                      className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                    >
                      <Edit className="h-5 w-5" />
                      <span>Beschikbaarheid beheren</span>
                    </button>
                  )}
                </div>

                {/* Employee selection dropdown for managers */}
                {isManager() && (
                  <div className="mt-6 flex items-center space-x-3 bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 px-4 py-3">
                    <User className="h-5 w-5" style={{ color: '#67697c' }} />
                    <label className="text-sm font-medium" style={{ color: '#120309' }}>
                      {selectedEmployee ? `Beschikbaarheid van:` : `Bekijk beschikbaarheid van:`}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedEmployeeId || 'own'}
                        onChange={(e) => handleEmployeeSelection(e.target.value)}
                        disabled={isLoadingEmployees}
                        className="pl-3 pr-8 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg min-w-[180px]"
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
                        <option value="own">Mijn eigen beschikbaarheid</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.fullName}
                          </option>
                        ))}
                      </select>
                      {isLoadingEmployees && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#d5896f' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Fout</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoadingAvailability ? (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#d5896f' }}></div>
                <p className="mt-4 font-medium" style={{ color: '#67697c' }}>Beschikbaarheid laden...</p>
              </div>
            </div>
          ) : weekAvailabilities.length === 0 ? (
            // No Data State
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-12">
              <div className="text-center">
                <CalendarCheck className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Geen beschikbaarheid gevonden</h3>
                <p className="mt-2 text-gray-600">
                  {selectedEmployee
                    ? `${selectedEmployee.fullName} heeft nog geen beschikbaarheid ingesteld voor de komende weken.`
                    : 'Er is nog geen beschikbaarheid ingesteld voor de komende weken.'
                  }
                </p>
              </div>
            </div>
          ) : (
            // Availability Content
            <div className="space-y-6">
              {/* Week Navigation */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigateWeeks('prev')}
                    disabled={currentWeekIndex === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-900 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Vorige week</span>
                  </button>

                  <div className="text-center">
                    <h2 className="text-xl font-bold" style={{ color: '#120309' }}>
                      Week {currentWeek ? getWeekNumber(currentWeek.weekStart) : 1}
                    </h2>
                    {currentWeek && (
                      <p className="text-sm" style={{ color: '#67697c' }}>
                        {formatWeekRange(currentWeek.weekStart)}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => navigateWeeks('next')}
                    disabled={currentWeekIndex === weekAvailabilities.length - 1}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-900 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span className="text-sm font-medium">Volgende week</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Current Week Availability */}
              {currentWeek && (
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                  <h3 className="text-lg font-semibold mb-6" style={{ color: '#120309' }}>
                    Beschikbaarheid voor week van {formatWeekRange(currentWeek.weekStart)}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                    {currentWeek.days.map((day: DayAvailability, index: number) => (
                      <div
                        key={index}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${getAvailabilityColor(day.isAvailable)}`}
                      >
                        <div className="text-center">
                          <h4 className="font-semibold text-gray-900 capitalize mb-1">
                            {day.dayOfWeek}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {day.date}
                          </p>

                          <div className="flex flex-col items-center space-y-2">
                            {getAvailabilityIcon(day.isAvailable)}
                            <span className="text-sm font-medium text-gray-900">
                              {getAvailabilityText(day.isAvailable)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Week Overview Grid */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <h3 className="text-lg font-semibold mb-6" style={{ color: '#120309' }}>
                  Overzicht alle weken
                </h3>

                <div className="space-y-4">
                  {weekAvailabilities.map((week: WeekAvailability, weekIndex: number) => (
                    <div
                      key={weekIndex}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:bg-gray-50 ${weekIndex === currentWeekIndex
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white'
                        }`}
                      onClick={() => setCurrentWeekIndex(weekIndex)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Week {getWeekNumber(week.weekStart)}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatWeekRange(week.weekStart)}
                          </p>
                        </div>

                        <div className="flex space-x-1">
                          {week.days.map((day: DayAvailability, dayIndex: number) => (
                            <div
                              key={dayIndex}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${day.isAvailable === true
                                ? 'bg-green-100 border-green-300'
                                : day.isAvailable === false
                                  ? 'bg-red-100 border-red-300'
                                  : 'bg-gray-100 border-gray-300'
                                }`}
                              title={`${day.dayOfWeek}: ${getAvailabilityText(day.isAvailable)}`}
                            >
                              {day.isAvailable === true && <CheckCircle className="h-3 w-3 text-green-600" />}
                              {day.isAvailable === false && <XCircle className="h-3 w-3 text-red-600" />}
                              {day.isAvailable === null && <Minus className="h-3 w-3 text-gray-400" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
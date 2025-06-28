'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useError } from '@/contexts/ErrorContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { ArrowLeft, Save, X, CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { UpdateWeekAvailability, UpdateDayAvailability } from '@/types/availability';
import * as api from '@/lib/api';

export default function CreateAvailabilityPage() {
  usePageTitle('Dashboard - Beschikbaarheid beheren');

  const { user, isLoading } = useAuth();
  const { showApiError } = useError();
  const router = useRouter();

  // Week navigation state
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0); // 0 = current week, 1 = next week, etc.

  // Form state
  const [formData, setFormData] = useState<UpdateDayAvailability[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Initialize form data when selectedWeekIndex changes
  useEffect(() => {
    initializeFormData();
  }, [selectedWeekIndex]);

  const initializeFormData = async () => {
    setIsLoadingAvailability(true);
    const startOfWeek = getSelectedWeekStart();
    const weekStartString = formatDateString(startOfWeek);

    try {
      // Try to fetch existing availability for this week
      const existingAvailability = await api.getMyWeekAvailability(weekStartString, { showErrors: false });
      
      // If we have existing data, use it
      if (existingAvailability && existingAvailability.days && existingAvailability.days.length > 0) {
        const weekDays: UpdateDayAvailability[] = [];
        
        // Generate 7 days (Monday to Sunday) and map with existing data
        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(startOfWeek);
          currentDate.setDate(currentDate.getDate() + i);
          const dateString = formatDateString(currentDate);
          
          // Find existing availability for this date
          const existingDay = existingAvailability.days.find(day => day.date === dateString);
          
          weekDays.push({
            date: dateString,
            isAvailable: existingDay?.isAvailable ?? true, // Default to available if not set
            notes: existingDay?.notes || ''
          });
        }
        
        setFormData(weekDays);
      } else {
        // No existing data, create default availability (all available)
        initializeDefaultFormData();
      }
    } catch (error) {
      // If fetching fails (e.g., no availability exists yet), create default data
      console.log('No existing availability found, using defaults');
      initializeDefaultFormData();
    } finally {
      setIsLoadingAvailability(false);
    }
  };

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
        notes: ''
      });
    }

    setFormData(weekDays);
  };

  const getSelectedWeekStart = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday (0) properly

    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday + (selectedWeekIndex * 7));

    return monday;
  };

  const formatDateString = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const getDutchDayName = (date: Date): string => {
    const dayNames = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
    return dayNames[date.getDay()];
  };

  const formatDisplayDate = (dateString: string): string => {
    const [day, month, year] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dayName = getDutchDayName(date);
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)} ${day}-${month}`;
  };

  const getWeekDisplayText = (): string => {
    const startOfWeek = getSelectedWeekStart();
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const startDay = String(startOfWeek.getDate()).padStart(2, '0');
    const startMonth = String(startOfWeek.getMonth() + 1).padStart(2, '0');
    const endDay = String(endOfWeek.getDate()).padStart(2, '0');
    const endMonth = String(endOfWeek.getMonth() + 1).padStart(2, '0');

    return `Week ${startDay}-${startMonth} t/m ${endDay}-${endMonth}`;
  };

  const getWeekStatusText = (): string => {
    if (selectedWeekIndex === 0) return 'Huidige week';
    if (selectedWeekIndex === 1) return '1 week vooruit';
    return `${selectedWeekIndex} weken vooruit`;
  };

  const updateDayAvailability = (dayIndex: number, field: keyof UpdateDayAvailability, value: any) => {
    setFormData(prev => prev.map((day, index) =>
      index === dayIndex ? { ...day, [field]: value } : day
    ));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const updateData: UpdateWeekAvailability = {
        employeeId: user!.id, // Will be set by backend
        weekStart: formatDateString(getSelectedWeekStart()),
        days: formData
      };

      await api.updateMyWeekAvailability(updateData);

      // Success! Redirect back to availability page
      router.push('/availability');
    } catch (error: any) {
      console.error('Error saving availability:', error);

      let errorMessage = 'Er is een fout opgetreden bij het opslaan van de beschikbaarheid';

      if (error.status === 400) {
        errorMessage = 'Controleer je invoer en probeer het opnieuw';
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Je hebt geen toestemming om beschikbaarheid bij te werken';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      showApiError(error, 'Fout bij het opslaan van beschikbaarheid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedWeekIndex > 0) {
      setSelectedWeekIndex(prev => prev - 1);
    } else if (direction === 'next' && selectedWeekIndex < 3) { // Max 4 weeks ahead
      setSelectedWeekIndex(prev => prev + 1);
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Pagina laden" />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push('/availability')}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug naar beschikbaarheid"
                    >
                      <ArrowLeft className="h-5 w-5" style={{ color: '#67697c' }} />
                    </button>
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <CalendarCheck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Beschikbaarheid beheren
                      </h1>
                      <p className="text-lg mt-1" style={{ color: '#67697c' }}>
                        Bekijk en bewerk je beschikbaarheid voor de geselecteerde week
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
                  onClick={() => navigateWeek('prev')}
                  disabled={selectedWeekIndex === 0}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="text-sm font-medium">Vorige week</span>
                </button>

                <div className="text-center">
                  <h2 className="text-xl font-bold" style={{ color: '#120309' }}>
                    {getWeekDisplayText()}
                  </h2>
                  <p className="text-sm" style={{ color: '#67697c' }}>
                    {getWeekStatusText()}
                  </p>
                </div>

                <button
                  onClick={() => navigateWeek('next')}
                  disabled={selectedWeekIndex >= 3}
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span className="text-sm font-medium">Volgende week</span>
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
                  <p className="text-lg" style={{ color: '#67697c' }}>
                    Beschikbaarheid laden...
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold" style={{ color: '#120309' }}>
                  Beschikbaarheid per dag
                </h3>

                {formData.map((day, index) => (
                  <div key={day.date} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                    <div className="flex items-start space-x-6">
                      {/* Day Info */}
                      <div className="min-w-[140px]">
                        <h4 className="font-medium" style={{ color: '#120309' }}>
                          {formatDisplayDate(day.date)}
                        </h4>
                      </div>

                      {/* Availability Selection */}
                      <div className="flex-1">
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium" style={{ color: '#67697c' }}>
                              Beschikbaarheid *
                            </label>
                            <div className="mt-2 flex space-x-4">
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={`availability-${index}`}
                                  value="true"
                                  checked={day.isAvailable === true}
                                  onChange={() => updateDayAvailability(index, 'isAvailable', true)}
                                  className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-500 cursor-pointer"
                                />
                                <span className="ml-2 text-sm font-medium text-green-700">
                                  Beschikbaar
                                </span>
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="radio"
                                  name={`availability-${index}`}
                                  value="false"
                                  checked={day.isAvailable === false}
                                  onChange={() => updateDayAvailability(index, 'isAvailable', false)}
                                  className="h-4 w-4 text-red-600 border-gray-300 focus:ring-red-500 cursor-pointer"
                                />
                                <span className="ml-2 text-sm font-medium text-red-700">
                                  Niet beschikbaar
                                </span>
                              </label>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <label htmlFor={`notes-${index}`} className="text-sm font-medium" style={{ color: '#67697c' }}>
                              Notities (optioneel)
                            </label>
                            <textarea
                              id={`notes-${index}`}
                              value={day.notes || ''}
                              onChange={(e) => updateDayAvailability(index, 'notes', e.target.value)}
                              placeholder="Eventuele opmerkingen..."
                              rows={2}
                              maxLength={500}
                              className="mt-1 block w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#d5896f] focus:border-transparent resize-none"
                              style={{
                                borderColor: '#d1d5db'
                              }}
                            />
                            <p className="mt-1 text-xs" style={{ color: '#67697c' }}>
                              {(day.notes?.length || 0)}/500 tekens
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200/50">
                <button
                  onClick={() => router.push('/availability')}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <X className="h-5 w-5" />
                  <span>Annuleren</span>
                </button>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Opslaan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Beschikbaarheid opslaan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
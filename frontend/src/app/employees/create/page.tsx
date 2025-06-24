'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { UserPlus, User, Lock, Eye, EyeOff, ArrowLeft, Save, X, Shield, Calendar } from 'lucide-react';
import { CreateEmployeeRequest, Role } from '@/types/auth';
import * as api from '@/lib/api';

export default function CreateEmployeePage() {
  usePageTitle('Dashboard - Nieuwe medewerker');

  const { user, isLoading, hasAccess, isManager, getRoleName } = useAuth();
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState<CreateEmployeeRequest>({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    role: Role.Werknemer,
    hireDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    birthDate: ''
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Redirect to login if not authenticated or no access
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && !isManager()) {
      // Only Managers can create employees
      router.push('/employees');
    }
  }, [user, isLoading, router, isManager]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'Voornaam is verplicht';
    } else if (formData.firstName.length > 50) {
      errors.firstName = 'Voornaam mag maximaal 50 tekens bevatten';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Achternaam is verplicht';
    } else if (formData.lastName.length > 50) {
      errors.lastName = 'Achternaam mag maximaal 50 tekens bevatten';
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Gebruikersnaam is verplicht';
    } else if (formData.username.length > 30) {
      errors.username = 'Gebruikersnaam mag maximaal 30 tekens bevatten';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      errors.username = 'Gebruikersnaam mag alleen letters, cijfers, punten, underscores en streepjes bevatten';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Wachtwoord is verplicht';
    } else if (formData.password.length < 6) {
      errors.password = 'Wachtwoord moet minimaal 6 tekens bevatten';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Wachtwoord moet minimaal 1 hoofdletter bevatten';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Wachtwoord moet minimaal 1 cijfer bevatten';
    }

    // Role validation (only managers can assign manager role)
    if (formData.role === Role.Manager && !isManager()) {
      errors.role = 'Alleen managers kunnen andere managers in dienst nemen';
    }

    // Hire date validation
    if (!formData.hireDate) {
      errors.hireDate = 'Datum in dienst is verplicht';
    } else {
      const hireDate = new Date(formData.hireDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (hireDate > today) {
        errors.hireDate = 'Datum in dienst kan niet in de toekomst liggen';
      }
    }

    // Birth date validation
    if (!formData.birthDate) {
      errors.birthDate = 'Geboortedatum is verplicht';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 16) {
        errors.birthDate = 'Medewerker moet minimaal 16 jaar oud zijn';
      } else if (age > 100) {
        errors.birthDate = 'Controleer de geboortedatum';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof CreateEmployeeRequest, value: string | Role) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear general error
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createEmployee(formData);

      // Success! Redirect to employees page
      router.push('/employees');
    } catch (error: any) {
      console.error('Error creating employee:', error);

      let errorMessage = 'Er is een fout opgetreden bij het aanmaken van de medewerker';

      if (error.status === 400) {
        if (error.message.includes('Username') && error.message.includes('already exists')) {
          setFieldErrors({ username: 'Deze gebruikersnaam bestaat al' });
          return;
        } else {
          errorMessage = 'Controleer je invoer en probeer het opnieuw';
        }
      } else if (error.status === 500) {
        errorMessage = 'Server fout. Probeer het later opnieuw';
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
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
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push('/employees')}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug naar medewerkers"
                    >
                      <ArrowLeft className="h-5 w-5" style={{ color: '#67697c' }} />
                    </button>
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <UserPlus className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Nieuwe medewerker
                      </h1>
                      <p className="text-lg mt-1" style={{ color: '#67697c' }}>
                        Voeg een nieuwe medewerker toe aan het systeem
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
              {/* General Error */}
              {error && (
                <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-red-700 text-center font-medium">
                  {error}
                </div>
              )}

              {/* Personal Information */}
              <div>
                <h3 className="text-xl font-semibold mb-6" style={{ color: '#120309' }}>
                  Persoonlijke informatie
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Voornaam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="firstName"
                        name="new-firstname"
                        type="text"
                        autoComplete="off"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.firstName ? 'border-red-300' : 'border-gray-200'}`}
                        style={{ color: '#120309' }}
                        placeholder="Voer de voornaam in"
                        disabled={isSubmitting}
                        maxLength={50}
                        onFocus={(e) => {
                          if (!fieldErrors.firstName) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.firstName ? '#fca5a5' : '#d1d5db';
                        }}
                      />
                    </div>
                    {fieldErrors.firstName && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Achternaam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="lastName"
                        name="new-lastname"
                        type="text"
                        autoComplete="off"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.lastName ? 'border-red-300' : 'border-gray-200'}`}
                        style={{ color: '#120309' }}
                        placeholder="Voer de achternaam in"
                        disabled={isSubmitting}
                        maxLength={50}
                        onFocus={(e) => {
                          if (!fieldErrors.lastName) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.lastName ? '#fca5a5' : '#d1d5db';
                        }}
                      />
                    </div>
                    {fieldErrors.lastName && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h3 className="text-xl font-semibold mb-6" style={{ color: '#120309' }}>
                  Account informatie
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Gebruikersnaam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="username"
                        name="new-username"
                        type="text"
                        autoComplete="off"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.username ? 'border-red-300' : 'border-gray-200'}`}
                        style={{ color: '#120309' }}
                        placeholder="bijv. john.doe"
                        disabled={isSubmitting}
                        maxLength={30}
                        onFocus={(e) => {
                          if (!fieldErrors.username) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.username ? '#fca5a5' : '#d1d5db';
                        }}
                      />
                    </div>
                    {fieldErrors.username && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.username}</p>
                    )}
                    <p className="mt-2 text-xs" style={{ color: '#67697c' }}>
                      Alleen letters, cijfers, punten, underscores en streepjes toegestaan
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Wachtwoord <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="password"
                        name="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.password ? 'border-red-300' : 'border-gray-200'}`}
                        style={{ color: '#120309' }}
                        placeholder="Voer een veilig wachtwoord in"
                        disabled={isSubmitting}
                        onFocus={(e) => {
                          if (!fieldErrors.password) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.password ? '#fca5a5' : '#d1d5db';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                        disabled={isSubmitting}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 hover:opacity-70 transition-opacity duration-200" style={{ color: '#67697c' }} />
                        ) : (
                          <Eye className="h-5 w-5 hover:opacity-70 transition-opacity duration-200" style={{ color: '#67697c' }} />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.password}</p>
                    )}
                    <p className="mt-2 text-xs" style={{ color: '#67697c' }}>
                      Minimaal 6 tekens met 1 hoofdletter en 1 cijfer
                    </p>
                  </div>
                </div>
              </div>

              {/* Role and Dates Information */}
              <div>
                <h3 className="text-xl font-semibold mb-6" style={{ color: '#120309' }}>
                  Functie & gegevens
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Role */}
                  <div>
                    <label htmlFor="role" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Rol <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Shield className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => handleInputChange('role', parseInt(e.target.value) as Role)}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.role ? 'border-red-300' : 'border-gray-200'}`}
                        style={{ color: '#120309' }}
                        disabled={isSubmitting}
                        onFocus={(e) => {
                          if (!fieldErrors.role) {
                            const target = e.target as HTMLSelectElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLSelectElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.role ? '#fca5a5' : '#d1d5db';
                        }}
                      >
                        <option value={Role.Werknemer}>{getRoleName(Role.Werknemer)}</option>
                        <option value={Role.ShiftLeider}>{getRoleName(Role.ShiftLeider)}</option>
                        {isManager() && (
                          <option value={Role.Manager}>{getRoleName(Role.Manager)}</option>
                        )}
                      </select>
                    </div>
                    {fieldErrors.role && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.role}</p>
                    )}
                    {!isManager() && (
                      <p className="mt-2 text-xs" style={{ color: '#67697c' }}>
                        Alleen managers kunnen andere managers in dienst nemen
                      </p>
                    )}
                  </div>

                  {/* Hire Date */}
                  <div>
                    <label htmlFor="hireDate" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      In dienst sinds <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="hireDate"
                        name="hire-date"
                        type="date"
                        value={formData.hireDate}
                        onChange={(e) => handleInputChange('hireDate', e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.hireDate ? 'border-red-300' : 'border-gray-200'}`}
                        style={{ color: '#120309' }}
                        disabled={isSubmitting}
                        max={new Date().toISOString().split('T')[0]}
                        onFocus={(e) => {
                          if (!fieldErrors.hireDate) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.hireDate ? '#fca5a5' : '#d1d5db';
                        }}
                      />
                    </div>
                    {fieldErrors.hireDate && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.hireDate}</p>
                    )}
                  </div>

                  {/* Birth Date */}
                  <div>
                    <label htmlFor="birthDate" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Geboortedatum <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="birthDate"
                        name="birth-date"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.birthDate ? 'border-red-300' : 'border-gray-200'}`}
                        style={{ color: '#120309' }}
                        disabled={isSubmitting}
                        max={new Date().toISOString().split('T')[0]}
                        onFocus={(e) => {
                          if (!fieldErrors.birthDate) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.birthDate ? '#fca5a5' : '#d1d5db';
                        }}
                      />
                    </div>
                    {fieldErrors.birthDate && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.birthDate}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200/50">
                <button
                  type="button"
                  onClick={() => router.push('/employees')}
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <X className="h-5 w-5" />
                  <span>Annuleren</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Aanmaken...</span>
                    </>
                  ) : (
                    <>
                      <span>Medewerker aanmaken</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
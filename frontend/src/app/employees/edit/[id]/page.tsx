'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useError } from '@/contexts/ErrorContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { Edit, User, Lock, Eye, EyeOff, ArrowLeft, Save, X, Shield, Calendar } from 'lucide-react';
import { UpdateEmployeeRequest, Role, Employee } from '@/types/auth';
import * as api from '@/lib/api';
import { toInputDateFormat, fromInputDateFormat } from '@/utils/dateUtils';

export default function EditEmployeePage() {
  const params = useParams();
  const employeeId = parseInt(params.id as string);

  usePageTitle('Dashboard - Medewerker bewerken');

  const { user, isLoading, isManager, getRoleName } = useAuth();
  const { showApiError } = useError();
  const router = useRouter();

  // State for employee data
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(true);

  // Form state
  const [formData, setFormData] = useState<UpdateEmployeeRequest>({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
    role: Role.Werknemer,
    hireDate: '',
    birthDate: ''
  });

  // Password confirmation state
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check if current user is editing their own profile
  const isEditingSelf = user?.id === employeeId;
  const canEdit = isManager() || isEditingSelf;

  // Redirect if not authenticated or no access
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && !canEdit) {
      router.push('/home');
    }
  }, [user, isLoading, router, canEdit]);

  const loadEmployee = useCallback(async () => {
    setIsLoadingEmployee(true);

    try {
      const employeeData = await api.getEmployeeById(employeeId);
      setEmployee(employeeData);

      // Pre-fill form with existing data
      setFormData({
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        username: employeeData.username,
        password: '', // Always empty for security
        role: employeeData.role,
        hireDate: employeeData.hireDate, // Keep in DD-MM-YYYY format
        birthDate: employeeData.birthDate // Keep in DD-MM-YYYY format
      });
    } catch (error: unknown) {
      console.error('Error loading employee:', error);
      
      // Use centralized error handling
      showApiError(error, 'Er is een fout opgetreden bij het laden van de medewerkersgegevens');
      
      // Redirect back on error
      router.push('/employees');
    } finally {
      setIsLoadingEmployee(false);
    }
  }, [employeeId, showApiError, router]);

  // Load employee data
  useEffect(() => {
    if (user && canEdit) {
      loadEmployee();
    }
  }, [user, canEdit, employeeId, loadEmployee]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Only validate fields that can be edited based on user role
    if (isManager()) {
      // Managers can edit everything

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
        if (age > 100) {
          errors.birthDate = 'Controleer de geboortedatum';
        }
      }
    }

    // Username validation (both managers and employees)
    if (!formData.username.trim()) {
      errors.username = 'Gebruikersnaam is verplicht';
    } else if (formData.username.length > 30) {
      errors.username = 'Gebruikersnaam mag maximaal 30 tekens bevatten';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(formData.username)) {
      errors.username = 'Gebruikersnaam mag alleen letters, cijfers, punten, underscores en streepjes bevatten';
    }

    // Password validation (optional for updates, but if provided must be valid)
    if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Wachtwoord moet minimaal 6 tekens bevatten';
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        errors.password = 'Wachtwoord moet minimaal 1 hoofdletter bevatten';
      } else if (!/(?=.*\d)/.test(formData.password)) {
        errors.password = 'Wachtwoord moet minimaal 1 cijfer bevatten';
      }

      // Password confirmation
      if (formData.password !== confirmPassword) {
        errors.confirmPassword = 'Wachtwoorden komen niet overeen';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof UpdateEmployeeRequest, value: string | Role) => {
    let processedValue = value;

    // Convert date fields from HTML input format (YYYY-MM-DD) to DD-MM-YYYY
    if ((field === 'hireDate' || field === 'birthDate') && typeof value === 'string' && value) {
      processedValue = fromInputDateFormat(value);
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));

    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create update payload based on user role and whether editing self
      let updateData: UpdateEmployeeRequest;

      if (isManager()) {
        // Managers can update everything
        updateData = {
          ...formData,
          password: formData.password || undefined // Only include password if provided
        };
      } else {
        // Employees can only update username and password
        updateData = {
          firstName: employee!.firstName, // Keep existing values
          lastName: employee!.lastName,
          username: formData.username,
          password: formData.password || undefined,
          role: employee!.role,
          hireDate: employee!.hireDate,
          birthDate: employee!.birthDate
        };
      }

      if (isEditingSelf) {
        // Use profile endpoint for self-updates (available to all authenticated users)
        await api.updateProfile(updateData);
      } else {
        // Use employee endpoint for managing other employees (managers only)
        await api.updateEmployee(employeeId, updateData);
      }

      // Go back to employees list after successful update
      router.push('/employees');
    } catch (error: unknown) {
      console.error('Error updating employee:', error);

      // Handle specific username conflict error
      if (error && typeof error === 'object' && 'status' in error && 'message' in error) {
        const errorWithDetails = error as { status: number; message: string };
        if (errorWithDetails.status === 400 && 
            errorWithDetails.message && 
            errorWithDetails.message.includes('Username') && 
            errorWithDetails.message.includes('already exists')) {
          setFieldErrors({ username: 'Deze gebruikersnaam bestaat al' });
        } else {
          // Use centralized error handling for all other errors
          showApiError(error, 'Er is een fout opgetreden bij het bijwerken van de medewerker');
        }
      } else {
        // Use centralized error handling for all other errors
        showApiError(error, 'Er is een fout opgetreden bij het bijwerken van de medewerker');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isLoadingEmployee) {
    return <LoadingScreen message="Gegevens laden" />;
  }

  if (!user || !employee) {
    return null;
  }

  const canEditField = (field: string) => {
    if (isManager()) return true;
    return field === 'username' || field === 'password';
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      <main className="layout-main-content overflow-y-auto">
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
                      onClick={() => router.back()}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug"
                    >
                      <ArrowLeft className="h-5 w-5" style={{ color: '#67697c' }} />
                    </button>
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <Edit className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {isEditingSelf ? 'Profiel bewerken' : `${employee.fullName} bewerken`}
                      </h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
              {/* Hidden honeypot fields to confuse autocomplete */}
              <div style={{ display: 'none' }}>
                <input type="text" name="username" autoComplete="username" tabIndex={-1} />
                <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
              </div>

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
                        <User className="h-5 w-5" style={{ color: canEditField('firstName') ? '#67697c' : '#9ca3af' }} />
                      </div>
                      <input
                        id="firstName"
                        name="first-name"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        disabled={!canEditField('firstName') || isSubmitting}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="words"
                        spellCheck="false"
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 ${!canEditField('firstName')
                          ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
                          : fieldErrors.firstName
                            ? 'border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                            : 'border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                          }`}
                        style={{ color: canEditField('firstName') ? '#120309' : '#9ca3af' }}
                        placeholder="Voornaam"
                        maxLength={50}
                        onFocus={(e) => {
                          if (canEditField('firstName') && !fieldErrors.firstName) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          if (canEditField('firstName')) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '';
                            target.style.borderColor = fieldErrors.firstName ? '#fca5a5' : '#d1d5db';
                          }
                        }}
                      />
                    </div>
                    {fieldErrors.firstName && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.firstName}</p>
                    )}
                    {!canEditField('firstName') && (
                      <p className="mt-2 text-xs text-gray-500">Dit veld kan niet worden bewerkt</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Achternaam <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5" style={{ color: canEditField('lastName') ? '#67697c' : '#9ca3af' }} />
                      </div>
                      <input
                        id="lastName"
                        name="last-name"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        disabled={!canEditField('lastName') || isSubmitting}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="words"
                        spellCheck="false"
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 ${!canEditField('lastName')
                          ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
                          : fieldErrors.lastName
                            ? 'border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                            : 'border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                          }`}
                        style={{ color: canEditField('lastName') ? '#120309' : '#9ca3af' }}
                        placeholder="Achternaam"
                        maxLength={50}
                        onFocus={(e) => {
                          if (canEditField('lastName') && !fieldErrors.lastName) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          if (canEditField('lastName')) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '';
                            target.style.borderColor = fieldErrors.lastName ? '#fca5a5' : '#d1d5db';
                          }
                        }}
                      />
                    </div>
                    {fieldErrors.lastName && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.lastName}</p>
                    )}
                    {!canEditField('lastName') && (
                      <p className="mt-2 text-xs text-gray-500">Dit veld kan niet worden bewerkt</p>
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
                        name="user-name"
                        type="text"
                        value={formData.username}
                        onChange={(e) => handleInputChange('username', e.target.value.toLowerCase())}
                        disabled={isSubmitting}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.username ? 'border-red-300' : 'border-gray-200'
                          }`}
                        style={{ color: '#120309' }}
                        placeholder="bijv. john.doe"
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
                      Nieuw wachtwoord <span className="text-gray-500">(optioneel)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="password"
                        name="new-password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        disabled={isSubmitting}
                        autoComplete="new-password"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.password ? 'border-red-300' : 'border-gray-200'
                          }`}
                        style={{ color: '#120309' }}
                        placeholder="Laat leeg voor geen wijzigingen"
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

                {/* Password Confirmation - only show if password is being changed */}
                {formData.password && (
                  <div className="mt-6">
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                      Bevestig nieuw wachtwoord <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="off"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (fieldErrors.confirmPassword) {
                            setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
                          }
                        }}
                        disabled={isSubmitting}
                        className={`w-full pl-12 pr-12 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg ${fieldErrors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                          }`}
                        style={{ color: '#120309' }}
                        placeholder="Bevestig je nieuwe wachtwoord"
                        onFocus={(e) => {
                          if (!fieldErrors.confirmPassword) {
                            const target = e.target as HTMLInputElement;
                            target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                            target.style.borderColor = '#d5896f';
                          }
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = fieldErrors.confirmPassword ? '#fca5a5' : '#d1d5db';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 hover:opacity-70 transition-opacity duration-200" style={{ color: '#67697c' }} />
                        ) : (
                          <Eye className="h-5 w-5 hover:opacity-70 transition-opacity duration-200" style={{ color: '#67697c' }} />
                        )}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Role and Dates Information - Only show for managers */}
              {isManager() && (
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
                          <Shield className="h-5 w-5" style={{ color: canEditField('role') ? '#67697c' : '#9ca3af' }} />
                        </div>
                        <select
                          id="role"
                          value={formData.role}
                          onChange={(e) => handleInputChange('role', parseInt(e.target.value) as Role)}
                          disabled={!canEditField('role') || isSubmitting}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 ${!canEditField('role')
                            ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
                            : fieldErrors.role ? 'border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                            : 'border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                            }`}
                          style={{ color: canEditField('role') ? '#120309' : '#9ca3af' }}
                          onFocus={(e) => {
                            if (canEditField('role') && !fieldErrors.role) {
                              const target = e.target as HTMLSelectElement;
                              target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                              target.style.borderColor = '#d5896f';
                            }
                          }}
                          onBlur={(e) => {
                            if (canEditField('role')) {
                              const target = e.target as HTMLSelectElement;
                              target.style.boxShadow = '';
                              target.style.borderColor = fieldErrors.role ? '#fca5a5' : '#d1d5db';
                            }
                          }}
                        >
                          <option value={Role.Werknemer}>{getRoleName(Role.Werknemer)}</option>
                          <option value={Role.ShiftLeider}>{getRoleName(Role.ShiftLeider)}</option>
                          <option value={Role.Manager}>{getRoleName(Role.Manager)}</option>
                        </select>
                      </div>
                      {fieldErrors.role && (
                        <p className="mt-2 text-sm text-red-600">{fieldErrors.role}</p>
                      )}
                      {!canEditField('role') && (
                        <p className="mt-2 text-xs text-gray-500">Dit veld kan niet worden bewerkt</p>
                      )}
                    </div>

                    {/* Hire Date */}
                    <div>
                      <label htmlFor="hireDate" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                        In dienst sinds <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5" style={{ color: canEditField('hireDate') ? '#67697c' : '#9ca3af' }} />
                        </div>
                        <input
                          id="hireDate"
                          name="hire-date"
                          type="date"
                          value={toInputDateFormat(formData.hireDate)}
                          onChange={(e) => handleInputChange('hireDate', e.target.value)}
                          disabled={!canEditField('hireDate') || isSubmitting}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 ${!canEditField('hireDate')
                            ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
                            : fieldErrors.hireDate
                              ? 'border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                              : 'border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                            }`}
                          style={{ color: canEditField('hireDate') ? '#120309' : '#9ca3af' }}
                          max={new Date().toISOString().split('T')[0]}
                          onFocus={(e) => {
                            if (canEditField('hireDate') && !fieldErrors.hireDate) {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                              target.style.borderColor = '#d5896f';
                            }
                          }}
                          onBlur={(e) => {
                            if (canEditField('hireDate')) {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow = '';
                              target.style.borderColor = fieldErrors.hireDate ? '#fca5a5' : '#d1d5db';
                            }
                          }}
                        />
                      </div>
                      {fieldErrors.hireDate && (
                        <p className="mt-2 text-sm text-red-600">{fieldErrors.hireDate}</p>
                      )}
                      {!canEditField('hireDate') && (
                        <p className="mt-2 text-xs text-gray-500">Dit veld kan niet worden bewerkt</p>
                      )}
                    </div>

                    {/* Birth Date */}
                    <div>
                      <label htmlFor="birthDate" className="block text-sm font-semibold mb-2" style={{ color: '#120309' }}>
                        Geboortedatum <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Calendar className="h-5 w-5" style={{ color: canEditField('birthDate') ? '#67697c' : '#9ca3af' }} />
                        </div>
                        <input
                          id="birthDate"
                          name="birth-date"
                          type="date"
                          value={toInputDateFormat(formData.birthDate)}
                          onChange={(e) => handleInputChange('birthDate', e.target.value)}
                          disabled={!canEditField('birthDate') || isSubmitting}
                          className={`w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 ${!canEditField('birthDate')
                            ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200'
                            : fieldErrors.birthDate
                              ? 'border-red-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                              : 'border-gray-200 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg'
                            }`}
                          style={{ color: canEditField('birthDate') ? '#120309' : '#9ca3af' }}
                          max={new Date().toISOString().split('T')[0]}
                          onFocus={(e) => {
                            if (canEditField('birthDate') && !fieldErrors.birthDate) {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                              target.style.borderColor = '#d5896f';
                            }
                          }}
                          onBlur={(e) => {
                            if (canEditField('birthDate')) {
                              const target = e.target as HTMLInputElement;
                              target.style.boxShadow = '';
                              target.style.borderColor = fieldErrors.birthDate ? '#fca5a5' : '#d1d5db';
                            }
                          }}
                        />
                      </div>
                      {fieldErrors.birthDate && (
                        <p className="mt-2 text-sm text-red-600">{fieldErrors.birthDate}</p>
                      )}
                      {!canEditField('birthDate') && (
                        <p className="mt-2 text-xs text-gray-500">Dit veld kan niet worden bewerkt</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
                      <span>Opslaan</span>
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
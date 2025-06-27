'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { useError } from '@/contexts/ErrorContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { formatDate } from '@/utils/dateUtils';
import { Users, Search, Edit, Trash2, Eye, UserPlus, AlertTriangle, CheckCircle, Info, RefreshCcw, Shield } from 'lucide-react';
import { Employee, Role } from '@/types/auth';
import * as api from '@/lib/api';

export default function EmployeesPage() {
  usePageTitle('Dashboard - Medewerkers');

  const { user, isLoading, hasAccess, isManager, getRoleName } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const { showApiError } = useError();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Redirect to login if not authenticated or no access
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && !isManager()) {
      // Only Managers can access employee management
      router.push('/home');
    }
  }, [user, isLoading, router, isManager]);

  // Load employees data
  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user]);

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    try {
      // Use automatic error handling - errors will be shown in modal automatically
      const employeesData = await api.getAllEmployees({ showErrors: true });
      setEmployees(employeesData);
    } catch (error) {
      // Error is already handled by the error system, no need for manual handling
      console.error('Error loading employees:', error);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleDeleteEmployee = (employee: Employee) => {
    // Only managers can delete employees
    if (!isManager()) {
      showAlert({
        title: 'Onvoldoende rechten',
        message: 'Alleen managers kunnen medewerkers verwijderen.',
        confirmText: 'OK',
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />
      });
      return;
    }

    // Prevent deleting yourself
    if (employee.id === user?.id) {
      showAlert({
        title: 'Actie niet toegestaan',
        message: 'Je kunt jezelf niet verwijderen.',
        confirmText: 'OK',
        icon: <AlertTriangle className="h-6 w-6 text-orange-600" />
      });
      return;
    }

    showConfirm({
      title: 'Medewerker verwijderen',
      message: `Weet je zeker dat je "${employee.fullName}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
      confirmText: 'Ja, verwijderen',
      cancelText: 'Annuleren',
      variant: 'danger',
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      onConfirm: async () => {
        try {
          // Use automatic error handling for API call
          await api.deleteEmployee(employee.id, { showErrors: true });
          await loadEmployees();

          // Show success message
          showAlert({
            title: 'Medewerker verwijderd',
            message: `${employee.fullName} is succesvol verwijderd uit het systeem.`,
            confirmText: 'OK',
            icon: <CheckCircle className="h-6 w-6 text-green-600" />
          });
        } catch (error) {
          // Error is already handled by the error system
          console.error('Error deleting employee:', error);
        }
      }
    });
  };

  const handleViewEmployee = (employee: Employee) => {
    showAlert({
      title: `Medewerker: ${employee.fullName}`,
      message: `
        Gebruikersnaam: ${employee.username}
        Functie: ${getRoleName(employee.role)}
        In dienst sinds: ${formatDate(employee.hireDate)}
        Geboortedatum: ${formatDate(employee.birthDate)}
        Aangemaakt: ${formatDate(employee.createdAt)}
        Laatste update: ${formatDate(employee.updatedAt)}
      `,
      confirmText: 'Sluiten',
      icon: <Info className="h-6 w-6 text-blue-600" />
    });
  };

  const handleEditEmployee = (employee: Employee) => {
    // If user is editing themselves, go to profile edit
    if (employee.id === user?.id) {
      router.push('/profile/edit');
    } else {
      // Only managers can edit other employees
      if (!isManager()) {
        showAlert({
          title: 'Onvoldoende rechten',
          message: 'Je kunt alleen je eigen profiel bewerken.',
          confirmText: 'OK',
          icon: <AlertTriangle className="h-6 w-6 text-red-600" />
        });
        return;
      }
      router.push(`/employees/edit/${employee.id}`);
    }
  };

  const handleAddEmployee = () => {
    if (!isManager()) {
      showAlert({
        title: 'Onvoldoende rechten',
        message: 'Je hebt geen rechten om nieuwe medewerkers toe te voegen.',
        confirmText: 'OK',
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />
      });
      return;
    }
    router.push('/employees/create');
  };

  const handleRetryLoad = () => {
    loadEmployees();
  };

  if (isLoading) {
    return <LoadingScreen message="Medewerkers laden" />;
  }

  if (!user) {
    return null; // Will redirect to login
  }

  // Filter employees based on search term
  const filteredEmployees = employees.filter(employee =>
    employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)' }}>
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: 'linear-gradient(135deg, #d5896f, #e8eef2)' }}></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15" style={{ background: 'linear-gradient(45deg, #d5896f, #67697c)' }}></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Medewerkers beheren
                      </h1>
                      <p className="text-lg mt-1" style={{ color: '#67697c' }}>
                        Bekijk en beheer alle medewerkers in het systeem
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleAddEmployee}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Nieuwe medewerker</span>
                  </button>
                </div>

                {/* Search and Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5" style={{ color: '#67697c' }} />
                      </div>
                      <input
                        type="text"
                        placeholder="Zoek medewerkers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                        style={{ color: '#120309' }}
                        onFocus={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)';
                          target.style.borderColor = '#d5896f';
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = '';
                          target.style.borderColor = '#d1d5db';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold" style={{ color: '#120309' }}>
                    Medewerkers overzicht
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#67697c' }}>
                    {filteredEmployees.length} van {employees.length} medewerkers
                  </p>
                </div>
              </div>
            </div>

            {isLoadingEmployees ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#d5896f' }}></div>
                <p className="mt-4 font-medium" style={{ color: '#67697c' }}>Medewerkers laden...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead style={{ background: 'linear-gradient(135deg, #e8eef240, #e8eef220)' }}>
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#120309' }}>Naam</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#120309' }}>Gebruikersnaam</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#120309' }}>Functie</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#120309' }}>In dienst sinds</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold" style={{ color: '#120309' }}>Acties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-3">
                            <Users className="h-12 w-12" style={{ color: '#67697c' }} />
                            <p className="font-medium" style={{ color: '#67697c' }}>
                              {searchTerm ? 'Geen medewerkers gevonden met deze zoekterm' : 'Nog geen medewerkers'}
                            </p>
                            {searchTerm ? (
                              <button
                                onClick={() => setSearchTerm('')}
                                className="text-sm underline cursor-pointer"
                                style={{ color: '#d5896f' }}
                              >
                                Wis zoekterm
                              </button>
                            ) : (
                              isManager() && (
                                <button
                                  onClick={handleAddEmployee}
                                  className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 cursor-pointer"
                                  style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                                >
                                  <UserPlus className="h-4 w-4" />
                                  <span>Eerste medewerker toevoegen</span>
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((employee) => (
                        <tr
                          key={employee.id}
                          className="border-b border-gray-200/30 hover:bg-white/40 transition-all duration-200"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #d5896f20, #d5896f10)' }}>
                                <Users className="h-4 w-4" style={{ color: '#d5896f' }} />
                              </div>
                              <div>
                                <p className="font-semibold" style={{ color: '#120309' }}>{employee.fullName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium" style={{ color: '#120309' }}>{employee.username}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${employee.role === Role.Manager
                                ? 'bg-purple-100 text-purple-800'
                                : employee.role === Role.ShiftLeider
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                              <Shield className="h-3 w-3 mr-1" />
                              {getRoleName(employee.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span style={{ color: '#67697c' }}>
                              {formatDate(employee.hireDate)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleViewEmployee(employee)}
                                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors duration-200 cursor-pointer"
                                title="Bekijken"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </button>
                              {isManager() && (
                                <>
                                  <button
                                    onClick={() => handleEditEmployee(employee)}
                                    className="p-2 rounded-lg bg-orange-100 hover:bg-orange-200 transition-colors duration-200 cursor-pointer"
                                    title="Bewerken"
                                  >
                                    <Edit className="h-4 w-4 text-orange-600" />
                                  </button>
                                  {employee.id !== user?.id && (
                                    <button
                                      onClick={() => handleDeleteEmployee(employee)}
                                      className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors duration-200 cursor-pointer"
                                      title="Verwijderen"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import LoadingScreen from '@/components/LoadingScreen';
import { Users, Plus, Search, Edit, Trash2, Eye, UserPlus } from 'lucide-react';
import { Employee } from '@/types/auth';
import * as api from '@/lib/api';

export default function EmployeesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Set page title
  useEffect(() => {
    document.title = 'Jill Dashboard - Medewerkers';
  }, []);

  // Load employees data
  useEffect(() => {
    if (user) {
      loadEmployees();
    }
  }, [user]);

  const loadEmployees = async () => {
    setIsLoadingEmployees(true);
    setError(null);
    try {
      const employeesData = await api.getAllEmployees();
      setEmployees(employeesData);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      setError('Fout bij het laden van medewerkers. Probeer het opnieuw.');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleDeleteEmployee = async (id: number, name: string) => {
    if (confirm(`Weet je zeker dat je ${name} wilt verwijderen?`)) {
      try {
        await api.deleteEmployee(id);
        // Refresh the list
        await loadEmployees();
      } catch (error: any) {
        console.error('Error deleting employee:', error);
        alert('Fout bij het verwijderen van de medewerker. Probeer het opnieuw.');
      }
    }
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
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold" style={{ background: 'linear-gradient(135deg, #120309, #67697c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Medewerkers Beheren
                      </h1>
                      <p className="text-lg mt-1" style={{ color: '#67697c' }}>
                        Beheer je team en hun toegangsrechten
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push('/employees/create')}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                  >
                    <UserPlus className="h-5 w-5" />
                    <span>Nieuwe Medewerker</span>
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

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl text-red-700 text-center">
              {error}
              <button
                onClick={loadEmployees}
                className="ml-4 text-red-600 underline hover:text-red-800 cursor-pointer"
              >
                Opnieuw proberen
              </button>
            </div>
          )}

          {/* Employees Table */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold" style={{ color: '#120309' }}>
                    Medewerkers Overzicht
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#67697c' }}>
                    {filteredEmployees.length} van {employees.length} medewerkers
                  </p>
                </div>
                <button
                  onClick={loadEmployees}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                  style={{ color: '#67697c' }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Vernieuwen</span>
                </button>
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
                      <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#120309' }}>Aangemaakt</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#120309' }}>Laatste Update</th>
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
                              <button
                                onClick={() => router.push('/employees/create')}
                                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 cursor-pointer"
                                style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}
                              >
                                <UserPlus className="h-4 w-4" />
                                <span>Eerste medewerker toevoegen</span>
                              </button>
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
                                <p className="text-sm" style={{ color: '#67697c' }}>ID: {employee.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium" style={{ color: '#120309' }}>{employee.username}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span style={{ color: '#67697c' }}>
                              {new Date(employee.createdAt).toLocaleDateString('nl-NL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span style={{ color: '#67697c' }}>
                              {new Date(employee.updatedAt).toLocaleDateString('nl-NL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => console.log('View employee', employee.id)}
                                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors duration-200 cursor-pointer"
                                title="Bekijken"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => console.log('Edit employee', employee.id)}
                                className="p-2 rounded-lg bg-orange-100 hover:bg-orange-200 transition-colors duration-200 cursor-pointer"
                                title="Bewerken"
                              >
                                <Edit className="h-4 w-4 text-orange-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmployee(employee.id, employee.fullName)}
                                className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors duration-200 cursor-pointer"
                                title="Verwijderen"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
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

          {/* Quick Actions */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push('/employees/create')}
              className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #d5896f, #d5896f90)' }}>
                  <UserPlus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2" style={{ color: '#120309' }}>
                    Nieuwe Medewerker
                  </h4>
                  <p className="text-sm" style={{ color: '#67697c' }}>
                    Voeg een nieuwe medewerker toe aan het systeem
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => console.log('Export data')}
              className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2" style={{ color: '#120309' }}>
                    Exporteren
                  </h4>
                  <p className="text-sm" style={{ color: '#67697c' }}>
                    Download medewerker gegevens
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => console.log('Import data')}
              className="group p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-105 text-left cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <Plus className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2" style={{ color: '#120309' }}>
                    Importeren
                  </h4>
                  <p className="text-sm" style={{ color: '#67697c' }}>
                    Upload medewerker gegevens
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
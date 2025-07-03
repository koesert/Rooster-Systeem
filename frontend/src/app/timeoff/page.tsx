"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/ErrorContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useModal } from "@/contexts/ModalContext";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Trash2,
} from "lucide-react";
import {
  TimeOffRequest,
  CreateTimeOffRequestDto,
  TimeOffStatus,
  TimeOffRequestFilter,
  getTimeOffStatusText,
  getTimeOffStatusColor,
} from "@/types/timeoff";
import { Employee } from "@/types/auth";
import * as api from "@/lib/api";
import {
  formatDate,
  toInputDateFormat,
  fromInputDateFormat,
  formatDateRange,
} from "@/utils/dateUtils";

export default function TimeOffPage() {
  usePageTitle("Dashboard - Vrij aanvragen");

  const { user, isLoading, isManager } = useAuth();
  const { showApiError } = useError();
  const { showModal, showAlert, showConfirm, hideModal } = useModal();
  const router = useRouter();

  // State for requests
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<TimeOffRequest[]>(
    []
  );

  // State for employees (managers only)
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<number | null>(null);

  // Form state for new request
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateTimeOffRequestDto>({
    reason: "",
    startDate: "",
    endDate: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Load data
  useEffect(() => {
    if (user) {
      loadRequests();
      if (isManager()) {
        loadEmployees();
      }
    }
  }, [user, isManager]);

  // Filter requests based on search and filters
  useEffect(() => {
    let filtered = requests;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (request) =>
          request.employeeName.toLowerCase().includes(search) ||
          request.reason.toLowerCase().includes(search)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((request) => request.status === statusFilter);
    }

    if (employeeFilter) {
      filtered = filtered.filter(
        (request) => request.employeeId === employeeFilter
      );
    }

    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter, employeeFilter]);

  const loadRequests = async () => {
    try {
      setIsLoadingRequests(true);
      const filter: TimeOffRequestFilter = isManager()
        ? {}
        : { employeeId: user?.id };
      const data = await api.getAllTimeOffRequests(filter);
      setRequests(data);
    } catch (error) {
      showApiError(
        error,
        "Er is een fout opgetreden bij het laden van de aanvragen"
      );
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const loadEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const data = await api.getAllEmployees();
      setEmployees(data);
    } catch (error) {
      showApiError(
        error,
        "Er is een fout opgetreden bij het laden van medewerkers"
      );
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.reason.trim()) {
      errors.reason = "Reden is verplicht";
    } else if (formData.reason.length > 500) {
      errors.reason = "Reden mag maximaal 500 karakters zijn";
    }

    if (!formData.startDate) {
      errors.startDate = "Startdatum is verplicht";
    }

    if (!formData.endDate) {
      errors.endDate = "Einddatum is verplicht";
    }

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(fromInputDateFormat(formData.startDate));
      const endDate = new Date(fromInputDateFormat(formData.endDate));

      if (endDate < startDate) {
        errors.endDate = "Einddatum moet na of gelijk aan startdatum zijn";
      }

      // Check maximum 8 weeks (56 days)
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 56) {
        errors.endDate = "Maximaal 8 weken (56 dagen) aanvragen toegestaan";
      }

      // Check minimum 2 weeks in advance
      const today = new Date();
      const minStartDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      if (startDate < minStartDate) {
        errors.startDate =
          "Vrij moet minimaal 2 weken van tevoren worden aangevraagd";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: CreateTimeOffRequestDto = {
        reason: formData.reason.trim(),
        startDate: fromInputDateFormat(formData.startDate),
        endDate: fromInputDateFormat(formData.endDate),
      };

      await api.createTimeOffRequest(requestData);

      // Reset form and close
      setFormData({ reason: "", startDate: "", endDate: "" });
      setFormErrors({});
      setShowCreateForm(false);

      // Reload requests
      await loadRequests();

      showAlert({
        title: "Succes",
        message: "Aanvraag succesvol ingediend"
      });
    } catch (error) {
      showApiError(
        error,
        "Er is een fout opgetreden bij het indienen van de aanvraag"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRequest = (id: number) => {
    router.push(`/timeoff/${id}`);
  };

  const handleEditRequest = (request: TimeOffRequest) => {
    if (request.status === TimeOffStatus.Pending) {
      router.push(`/timeoff/edit/${request.id}`);
    }
  };

  const handleDeleteRequest = async (request: TimeOffRequest) => {
    const canDelete = 
      (isManager() && request.status === TimeOffStatus.Pending) || 
      (request.employeeId === user?.id && request.status === TimeOffStatus.Pending);
    
    if (!canDelete) return;

    showConfirm({
      title: "Aanvraag verwijderen",
      message: `Weet je zeker dat je de verlofaanvraag van ${request.employeeName} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
      confirmText: "Verwijderen",
      cancelText: "Annuleren",
      onConfirm: async () => {
        try {
          await api.deleteTimeOffRequest(request.id);
          showAlert({
            title: "Succes",
            message: "Aanvraag succesvol verwijderd"
          });
          await loadRequests();
        } catch (error) {
          showApiError(
            error,
            "Er is een fout opgetreden bij het verwijderen van de aanvraag"
          );
        }
      }
    });
  };

  const getStatusIcon = (status: TimeOffStatus) => {
    switch (status) {
      case TimeOffStatus.Pending:
        return <Clock className="h-4 w-4" />;
      case TimeOffStatus.Approved:
        return <CheckCircle className="h-4 w-4" />;
      case TimeOffStatus.Rejected:
        return <XCircle className="h-4 w-4" />;
      case TimeOffStatus.Cancelled:
        return <X className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Pagina laden" />;
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="flex min-h-screen"
      style={{
        background: "linear-gradient(135deg, #e8eef2 0%, #f5f7fa 100%)",
      }}
    >
      <Sidebar />

      <main className="layout-main-content overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 max-[500px]:p-4 relative overflow-hidden">
              {/* Decorative background elements */}
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
                style={{
                  background: "linear-gradient(135deg, #d5896f, #e8eef2)",
                }}
              ></div>
              <div
                className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15"
                style={{
                  background: "linear-gradient(45deg, #d5896f, #67697c)",
                }}
              ></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg, #d5896f, #d5896f90)",
                      }}
                    >
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1
                        className="text-4xl font-bold max-[500px]:text-2xl"
                        style={{
                          background:
                            "linear-gradient(135deg, #120309, #67697c)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Vrij vragen
                      </h1>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center space-x-2 max-[700px]:space-x-0 px-6 max-[700px]:px-3 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                    }}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="max-[700px]:hidden">Nieuw</span>
                  </button>
                </div>

                {/* Search and Filters */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-6">
                  {/* Search */}
                  <div className="lg:col-span-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search
                          className="h-5 w-5"
                          style={{ color: "#67697c", fill: "currentColor" }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Zoeken"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/90 backdrop-blur-sm"
                        style={{
                          color: "#120309",
                        }}
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div className="lg:col-span-3">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/90 backdrop-blur-sm cursor-pointer"
                      style={{
                        color: "#120309",
                      }}
                    >
                      <option value="">Alle statussen</option>
                      <option value={TimeOffStatus.Pending}>Aangevraagd</option>
                      <option value={TimeOffStatus.Approved}>
                        Goedgekeurd
                      </option>
                      <option value={TimeOffStatus.Rejected}>Afgekeurd</option>
                      <option value={TimeOffStatus.Cancelled}>
                        Geannuleerd
                      </option>
                    </select>
                  </div>

                  {/* Employee Filter (Managers only) */}
                  {isManager() && (
                    <div className="lg:col-span-3">
                      <select
                        value={employeeFilter || ""}
                        onChange={(e) =>
                          setEmployeeFilter(
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 bg-white/90 backdrop-blur-sm cursor-pointer"
                        style={{
                          color: "#120309",
                        }}
                      >
                        <option value="">Alle medewerkers</option>
                        {employees.map((employee) => (
                          <option key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Stats */}
                  <div
                    className={`${
                      isManager() ? "lg:col-span-2" : "lg:col-span-5"
                    } flex items-center justify-end`}
                  >
                    <div className="text-sm" style={{ color: "#67697c" }}>
                      {filteredRequests.length} van {requests.length} aanvragen
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20">
            {isLoadingRequests ? (
              <div className="p-8 text-center">
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
                  style={{ borderColor: "#d5896f" }}
                ></div>
                <p style={{ color: "#67697c" }}>Aanvragen laden...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 text-center">
                <Calendar
                  className="h-12 w-12 mx-auto mb-4 opacity-50"
                  style={{ color: "#67697c" }}
                />
                <p className="text-lg mb-2" style={{ color: "#120309" }}>
                  {requests.length === 0
                    ? "Geen vrij aanvragen"
                    : "Geen aanvragen gevonden"}
                </p>
                <p className="text-sm" style={{ color: "#67697c" }}>
                  {requests.length === 0
                    ? "Maak je eerste vrij aanvraag met de knop hierboven"
                    : "Probeer je zoekopdracht aan te passen"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th
                        className="text-left p-4 font-semibold"
                        style={{ color: "#120309" }}
                      >
                        {isManager() ? "Medewerker" : "Aanvraag"}
                      </th>
                      <th
                        className="text-left p-4 font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Periode
                      </th>
                      <th
                        className="text-left p-4 font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Status
                      </th>
                      <th
                        className="text-left p-4 font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Aangemaakt
                      </th>
                      <th
                        className="text-right p-4 font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const startDate = new Date(
                        fromInputDateFormat(request.startDate)
                      );
                      const endDate = new Date(
                        fromInputDateFormat(request.endDate)
                      );
                      const dayCount =
                        Math.ceil(
                          (endDate.getTime() - startDate.getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) + 1;
                      const canEdit =
                        request.status === TimeOffStatus.Pending &&
                        request.employeeId === user?.id;
                      
                      const canDelete = 
                        (isManager() && request.status === TimeOffStatus.Pending) || 
                        (request.employeeId === user?.id && request.status === TimeOffStatus.Pending);

                      return (
                        <tr
                          key={request.id}
                          onClick={() => handleViewRequest(request.id)}
                          className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer"
                        >
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              {isManager() && (
                                <div
                                  className="p-2 rounded-lg"
                                  style={{
                                    background:
                                      "linear-gradient(135deg, #d5896f, #d5896f90)",
                                  }}
                                >
                                  <User className="h-4 w-4 text-white" />
                                </div>
                              )}
                              <div>
                                <div
                                  className="font-medium"
                                  style={{ color: "#120309" }}
                                >
                                  {isManager()
                                    ? request.employeeName
                                    : request.reason}
                                </div>
                                {isManager() && (
                                  <div
                                    className="text-sm"
                                    style={{ color: "#67697c" }}
                                  >
                                    {request.reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div
                              className="text-sm"
                              style={{ color: "#120309" }}
                            >
                              {formatDateRange(request.startDate, request.endDate)}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <div
                                style={{
                                  color: getTimeOffStatusColor(
                                    request.status as TimeOffStatus
                                  ),
                                }}
                              >
                                {getStatusIcon(request.status as TimeOffStatus)}
                              </div>
                              <span
                                className="text-sm font-medium"
                                style={{
                                  color: getTimeOffStatusColor(
                                    request.status as TimeOffStatus
                                  ),
                                }}
                              >
                                {getTimeOffStatusText(
                                  request.status as TimeOffStatus
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div
                              className="text-sm"
                              style={{ color: "#67697c" }}
                            >
                              {request.createdAt}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewRequest(request.id);
                                }}
                                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors duration-200 cursor-pointer"
                                title="Bekijk details"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditRequest(request);
                                  }}
                                  className="p-2 rounded-lg bg-orange-100 hover:bg-orange-200 transition-colors duration-200 cursor-pointer"
                                  title="Bewerk aanvraag"
                                >
                                  <Edit className="h-4 w-4 text-orange-600" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteRequest(request);
                                  }}
                                  className="p-2 rounded-lg bg-red-100 hover:bg-red-200 transition-colors duration-200 cursor-pointer"
                                  title="Verwijder aanvraag"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Request Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold" style={{ color: "#120309" }}>
                  Nieuwe vrij aanvraag
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  disabled={isSubmitting}
                >
                  <X className="h-5 w-5" style={{ color: "#67697c" }} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Start Date */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#120309" }}
                  >
                    Startdatum
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                    style={{
                      color: "#120309",
                    }}
                    disabled={isSubmitting}
                  />
                  {formErrors.startDate && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.startDate}
                    </p>
                  )}
                </div>

                {/* End Date */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#120309" }}
                  >
                    Einddatum
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200"
                    style={{
                      color: "#120309",
                    }}
                    disabled={isSubmitting}
                  />
                  {formErrors.endDate && (
                    <p className="mt-1 text-sm text-red-500">
                      {formErrors.endDate}
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label
                    className="block text-sm font-medium mb-2"
                    style={{ color: "#120309" }}
                  >
                    Reden
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData({ ...formData, reason: e.target.value })
                    }
                    placeholder="Waarom vraag je vrij aan?"
                    rows={4}
                    maxLength={500}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 resize-none"
                    style={{
                      color: "#120309",
                    }}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {formErrors.reason && (
                      <p className="text-sm text-red-500">
                        {formErrors.reason}
                      </p>
                    )}
                    <div
                      className="ml-auto text-xs"
                      style={{ color: "#67697c" }}
                    >
                      {formData.reason.length}/500
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors duration-200 font-medium"
                    style={{ color: "#67697c" }}
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: isSubmitting
                        ? "#d5896f80"
                        : "linear-gradient(135deg, #d5896f, #d5896f90)",
                    }}
                  >
                    {isSubmitting ? "Indienen..." : "Indienen"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

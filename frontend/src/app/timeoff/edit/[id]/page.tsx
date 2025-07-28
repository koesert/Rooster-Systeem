"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/ErrorContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useValidation, ValidationConfigs } from "@/hooks/useValidation";
import { useModal } from "@/contexts/ModalContext";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import {
  ArrowLeft,
  Save,
  X,
  Calendar,
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  TimeOffRequest,
  CreateTimeOffRequestDto,
  TimeOffStatus,
} from "@/types/timeoff";
import * as api from "@/lib/api";
import { toInputDateFormat, fromInputDateFormat } from "@/utils/dateUtils";

export default function EditTimeOffPage() {
  const params = useParams();
  const requestId = parseInt(params.id as string);

  usePageTitle("Dashboard - Vrij aanvraag bewerken");

  const { user, isLoading, isManager } = useAuth();
  const { showApiError } = useError();
  const { showAlert, showConfirm } = useModal();
  const router = useRouter();

  // State
  const [request, setRequest] = useState<TimeOffRequest | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateTimeOffRequestDto>({
    reason: "",
    startDate: "",
    endDate: "",
  });
  const [selectedStatus, setSelectedStatus] = useState<TimeOffStatus>(
    TimeOffStatus.Pending
  );

  // Validation setup
  const { fieldErrors, setFieldErrors, validateForm, clearAllErrors } =
    useValidation({
      ...ValidationConfigs.timeoffCreate,
      validateOnChange: false, // Only validate on submit
    });

  // Redirect if not authenticated or not manager
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    } else if (!isLoading && user && !isManager()) {
      router.push("/timeoff");
    }
  }, [user, isLoading, router, isManager]);

  // Load request data
  useEffect(() => {
    if (user && requestId && isManager()) {
      loadRequest();
    }
  }, [user, requestId, isManager]);

  const loadRequest = async () => {
    try {
      setIsLoadingRequest(true);
      const data = await api.getTimeOffRequestById(requestId);

      setRequest(data);

      // Initialize form with existing data
      setFormData({
        reason: data.reason,
        startDate: toInputDateFormat(data.startDate),
        endDate: toInputDateFormat(data.endDate),
      });
      setSelectedStatus(data.status);
    } catch (error) {
      showApiError(
        error,
        "Er is een fout opgetreden bij het laden van de aanvraag"
      );
      router.push("/timeoff");
    } finally {
      setIsLoadingRequest(false);
    }
  };

  // Status utility functions
  const getStatusInfo = (status: TimeOffStatus) => {
    switch (status) {
      case TimeOffStatus.Approved:
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-700",
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          label: "Goedgekeurd",
        };
      case TimeOffStatus.Rejected:
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-700",
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          label: "Afgekeurd",
        };
      case TimeOffStatus.Cancelled:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-700",
          icon: <XCircle className="h-4 w-4 text-gray-500" />,
          label: "Geannuleerd",
        };
      case TimeOffStatus.Pending:
      default:
        return {
          bg: "bg-orange-50",
          border: "border-orange-200",
          text: "text-orange-700",
          icon: <Clock className="h-4 w-4 text-orange-500" />,
          label: "Aangevraagd",
        };
    }
  };

  const handleInputChange = (
    field: keyof CreateTimeOffRequestDto,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!request) {
      return;
    }

    // Add isManager to form data for validation
    const formDataWithManager = {
      ...formData,
      isManager: isManager(),
    };

    if (!validateForm(formDataWithManager)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Managers can update everything including status in one call
      const managerRequestData = {
        reason: formData.reason.trim(),
        startDate: fromInputDateFormat(formData.startDate),
        endDate: fromInputDateFormat(formData.endDate),
        status: selectedStatus as
          | "Pending"
          | "Approved"
          | "Rejected"
          | "Cancelled",
      };

      await api.updateTimeOffRequestAsManager(request.id, managerRequestData);
      router.push("/timeoff");
    } catch (error) {
      showApiError(
        error,
        "Er is een fout opgetreden bij het bijwerken van de aanvraag"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!request) return;

    showConfirm({
      title: "Aanvraag verwijderen",
      message:
        "Weet je zeker dat je deze verlofaanvraag wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.",
      confirmText: "Verwijderen",
      cancelText: "Annuleren",
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await api.deleteTimeOffRequest(request.id);
          router.push("/timeoff");
        } catch (error) {
          showApiError(
            error,
            "Er is een fout opgetreden bij het verwijderen van de aanvraag"
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  const handleCancel = () => {
    router.push("/timeoff");
  };

  if (isLoading || isLoadingRequest) {
    return <LoadingScreen message="Aanvraag laden" />;
  }

  if (!user || !isManager() || !request) {
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
        <div className="max-w-4xl mx-auto">
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
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push("/timeoff")}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
                      title="Terug naar vrij aanvragen"
                    >
                      <ArrowLeft
                        className="h-5 w-5"
                        style={{ color: "#67697c" }}
                      />
                    </button>
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
                        className="text-3xl font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, #120309, #67697c)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Vrij aanvraag bewerken
                      </h1>
                      <p className="text-sm mt-1" style={{ color: "#67697c" }}>
                        {request.employeeName}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const statusInfo = getStatusInfo(selectedStatus);
                      return (
                        <div
                          className={`px-4 py-2 rounded-xl border ${statusInfo.bg} ${statusInfo.border} flex items-center space-x-2`}
                        >
                          {statusInfo.icon}
                          <span className={`font-medium ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      handleInputChange("startDate", e.target.value)
                    }
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 ${
                      fieldErrors.startDate
                        ? "border-red-300"
                        : "border-gray-200"
                    }`}
                    style={{
                      color: "#120309",
                    }}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.startDate && (
                    <p className="mt-1 text-sm text-red-500">
                      {fieldErrors.startDate}
                    </p>
                  )}
                </div>

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
                      handleInputChange("endDate", e.target.value)
                    }
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 ${
                      fieldErrors.endDate ? "border-red-300" : "border-gray-200"
                    }`}
                    style={{
                      color: "#120309",
                    }}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.endDate && (
                    <p className="mt-1 text-sm text-red-500">
                      {fieldErrors.endDate}
                    </p>
                  )}
                </div>
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
                  onChange={(e) => handleInputChange("reason", e.target.value)}
                  placeholder="Geef een reden voor je vrij aanvraag..."
                  rows={4}
                  maxLength={500}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 resize-none ${
                    fieldErrors.reason ? "border-red-300" : "border-gray-200"
                  }`}
                  style={{ color: "#120309" }}
                  disabled={isSubmitting}
                />
                <div className="flex justify-between items-center mt-1">
                  {fieldErrors.reason && (
                    <p className="text-sm text-red-500 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      {fieldErrors.reason}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 ml-auto">
                    {formData.reason.length}/500
                  </p>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#120309" }}
                >
                  Status
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    TimeOffStatus.Pending,
                    TimeOffStatus.Approved,
                    TimeOffStatus.Rejected,
                    TimeOffStatus.Cancelled,
                  ].map((status) => {
                    const statusInfo = getStatusInfo(status);
                    const isSelected = selectedStatus === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setSelectedStatus(status)}
                        disabled={isSubmitting}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? `${statusInfo.border} ${statusInfo.bg} ring-2 ring-opacity-50`
                            : "border-gray-200 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {statusInfo.icon}
                          <span
                            className={`font-medium text-sm ${
                              isSelected ? statusInfo.text : "text-gray-700"
                            }`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between space-x-4 pt-6 border-t border-gray-200/50">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold transition-all duration-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                    <span>Annuleren</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 px-6 py-3 rounded-xl border border-red-300 text-red-700 font-semibold transition-all duration-300 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <AlertTriangle className="h-5 w-5" />
                    <span>Verwijderen</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-2 px-6 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                  }}
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

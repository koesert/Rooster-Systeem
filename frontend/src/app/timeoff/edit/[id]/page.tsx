"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useError } from "@/contexts/ErrorContext";
import { usePageTitle } from "@/hooks/usePageTitle";
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

  const { user, isLoading } = useAuth();
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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Load request data
  useEffect(() => {
    if (user && requestId) {
      loadRequest();
    }
  }, [user, requestId]);

  const loadRequest = async () => {
    try {
      setIsLoadingRequest(true);
      const data = await api.getTimeOffRequestById(requestId);

      // Check access: users can only edit their own pending requests
      if (data.employeeId !== user?.id) {
        router.push("/timeoff");
        return;
      }

      if (data.status !== TimeOffStatus.Pending) {
        showAlert({
          title: "Bewerken niet mogelijk",
          message: "Alleen aanvragen met status 'Aangevraagd' kunnen worden bewerkt"
        });
        router.push(`/timeoff/${requestId}`);
        return;
      }

      setRequest(data);

      // Initialize form with existing data
      setFormData({
        reason: data.reason,
        startDate: toInputDateFormat(data.startDate),
        endDate: toInputDateFormat(data.endDate),
      });
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

    if (!validateForm() || !request) {
      return;
    }

    try {
      setIsSubmitting(true);

      const requestData: CreateTimeOffRequestDto = {
        reason: formData.reason.trim(),
        startDate: fromInputDateFormat(formData.startDate),
        endDate: fromInputDateFormat(formData.endDate),
      };

      // Update the existing request
      await api.updateTimeOffRequest(request.id, requestData);

      showAlert({
        title: "Succes",
        message: "Aanvraag succesvol bijgewerkt"
      });
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
      message: "Weet je zeker dat je deze verlofaanvraag wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.",
      confirmText: "Verwijderen",
      cancelText: "Annuleren",
      onConfirm: async () => {
        try {
          setIsSubmitting(true);
          await api.deleteTimeOffRequest(request.id);
          
          showAlert({
            title: "Succes",
            message: "Aanvraag succesvol verwijderd"
          });
          router.push("/timeoff");
        } catch (error) {
          showApiError(
            error,
            "Er is een fout opgetreden bij het verwijderen van de aanvraag"
          );
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const handleCancel = () => {
    router.push(`/timeoff/${requestId}`);
  };

  if (isLoading || isLoadingRequest) {
    return <LoadingScreen message="Aanvraag laden" />;
  }

  if (!user || !request) {
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
                      onClick={handleCancel}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
                      title="Terug naar aanvraag details"
                      disabled={isSubmitting}
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
                        className="text-4xl font-bold max-[500px]:text-2xl"
                        style={{
                          background:
                            "linear-gradient(135deg, #120309, #67697c)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Aanvraag bewerken
                      </h1>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center space-x-2 max-[500px]:space-x-0 px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 max-[500px]:px-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700 max-[500px]:hidden">
                      Aangevraagd
                    </span>
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
                    <p className="text-sm text-red-500">{formErrors.reason}</p>
                  )}
                  <div className="ml-auto text-xs" style={{ color: "#67697c" }}>
                    {formData.reason.length}/500
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex items-center justify-center py-3 px-4 max-[500px]:py-2 max-[500px]:px-2 max-[500px]:space-x-0 space-x-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: "#67697c" }}
                >
                  <X className="h-5 w-5" />
                  <span className="max-[500px]:hidden">Annuleren</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSubmitting
                      ? "#d5896f80"
                      : "linear-gradient(135deg, #d5896f, #d5896f90)",
                  }}
                >
                  <Save className="h-5 w-5" />
                  <span>{isSubmitting ? "Opslaan..." : "Opslaan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

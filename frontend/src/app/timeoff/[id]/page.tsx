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
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  X,
  Edit,
  MessageSquare,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  TimeOffRequest,
  TimeOffStatus,
  UpdateTimeOffRequestStatusDto,
  getTimeOffStatusText,
  getTimeOffStatusColor,
} from "@/types/timeoff";
import * as api from "@/lib/api";
import { fromInputDateFormat } from "@/utils/dateUtils";

export default function TimeOffDetailPage() {
  const params = useParams();
  const requestId = parseInt(params.id as string);

  usePageTitle("Dashboard - Vrij aanvraag details");

  const { user, isLoading, isManager } = useAuth();
  const { showApiError } = useError();
  const { showModal, showAlert, showConfirm, hideModal } = useModal();
  const router = useRouter();

  // State
  const [request, setRequest] = useState<TimeOffRequest | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

      // Check access: non-managers can only view their own requests
      if (!isManager() && data.employeeId !== user?.id) {
        router.push("/timeoff");
        return;
      }

      setRequest(data);
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

  const handleUpdateStatus = async (newStatus: "Approved" | "Rejected") => {
    if (!request || !isManager()) return;

    const statusText = newStatus === "Approved" ? "goedkeuren" : "afkeuren";
    showConfirm({
      title: `Weet je zeker dat je deze aanvraag wilt ${statusText}?`,
      message: "Deze actie kan niet ongedaan worden gemaakt.",
      confirmText: `${newStatus === "Approved" ? "Goedkeuren" : "Afkeuren"}`,
      variant: newStatus === "Approved" ? "success" : "danger",
      onConfirm: async () => {
        try {
          setIsUpdatingStatus(true);

          const statusData: UpdateTimeOffRequestStatusDto = { status: newStatus };
          await api.updateTimeOffRequestStatus(request.id, statusData);

          // Reload request to get updated data
          await loadRequest();

          showAlert({
            title: "Succes",
            message: `Aanvraag ${newStatus === "Approved" ? "goedgekeurd" : "afgekeurd"}`
          });
        } catch (error) {
          showApiError(
            error,
            `Er is een fout opgetreden bij het ${statusText} van de aanvraag`
          );
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    });
  };

  const handleCancelRequest = async () => {
    if (!request || request.employeeId !== user?.id) return;

    showConfirm({
      title: "Weet je zeker dat je deze aanvraag wilt annuleren?",
      message: "Deze actie kan niet ongedaan worden gemaakt.",
      confirmText: "Annuleren",
      variant: "danger",
      onConfirm: async () => {
        try {
          setIsUpdatingStatus(true);
          await api.cancelTimeOffRequest(request.id);

          // Reload request to get updated data
          await loadRequest();

          showAlert({
            title: "Succes",
            message: "Aanvraag geannuleerd"
          });
        } catch (error) {
          showApiError(
            error,
            "Er is een fout opgetreden bij het annuleren van de aanvraag"
          );
        } finally {
          setIsUpdatingStatus(false);
        }
      }
    });
  };

  const handleEdit = () => {
    if (
      request &&
      request.status === TimeOffStatus.Pending &&
      request.employeeId === user?.id
    ) {
      router.push(`/timeoff/edit/${request.id}`);
    }
  };

  const getStatusIcon = (status: TimeOffStatus) => {
    switch (status) {
      case TimeOffStatus.Pending:
        return <Clock className="h-6 w-6" />;
      case TimeOffStatus.Approved:
        return <CheckCircle className="h-6 w-6" />;
      case TimeOffStatus.Rejected:
        return <XCircle className="h-6 w-6" />;
      case TimeOffStatus.Cancelled:
        return <X className="h-6 w-6" />;
      default:
        return <AlertTriangle className="h-6 w-6" />;
    }
  };

  if (isLoading || isLoadingRequest) {
    return <LoadingScreen message="Aanvraag laden" />;
  }

  if (!user || !request) {
    return null;
  }

  const startDate = new Date(fromInputDateFormat(request.startDate));
  const endDate = new Date(fromInputDateFormat(request.endDate));
  const dayCount =
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const canEdit =
    request.status === TimeOffStatus.Pending && request.employeeId === user?.id;
  const canCancel =
    request.status === TimeOffStatus.Pending && request.employeeId === user?.id;
  const canManage = isManager() && request.status === TimeOffStatus.Pending;

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
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => router.push("/timeoff")}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
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
                        className="text-4xl font-bold max-[500px]:text-2xl"
                        style={{
                          background:
                            "linear-gradient(135deg, #120309, #67697c)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Vrij aanvraag #{request.id}
                      </h1>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {canEdit && (
                      <button
                        onClick={handleEdit}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                        disabled={isUpdatingStatus}
                      >
                        <Edit
                          className="h-4 w-4"
                          style={{ color: "#d5896f" }}
                        />
                        <span
                          className="text-sm font-medium max-[700px]:hidden"
                          style={{ color: "#d5896f" }}
                        >
                          Bewerken
                        </span>
                      </button>
                    )}

                    {canCancel && (
                      <button
                        onClick={handleCancelRequest}
                        className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors duration-200"
                        disabled={isUpdatingStatus}
                      >
                        <X className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-500 max-[700px]:hidden">
                          Annuleren
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center space-x-3 mb-6">
                  <div
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl"
                    style={{
                      backgroundColor: `${getTimeOffStatusColor(
                        request.status as TimeOffStatus
                      )}20`,
                      border: `1px solid ${getTimeOffStatusColor(
                        request.status as TimeOffStatus
                      )}40`,
                    }}
                  >
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
                      className="font-semibold"
                      style={{
                        color: getTimeOffStatusColor(
                          request.status as TimeOffStatus
                        ),
                      }}
                    >
                      {getTimeOffStatusText(request.status as TimeOffStatus)}
                    </span>
                  </div>
                  {request.approverName && (
                    <div className="text-sm" style={{ color: "#67697c" }}>
                      door {request.approverName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Request Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Employee Info */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                    }}
                  >
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#120309" }}
                  >
                    Medewerker informatie
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium" style={{ color: "#67697c" }}>
                      Naam:
                    </span>
                    <span style={{ color: "#120309" }}>
                      {request.employeeName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium" style={{ color: "#67697c" }}>
                      Aangemaakt:
                    </span>
                    <span style={{ color: "#120309" }}>
                      {request.createdAt}
                    </span>
                  </div>
                  {request.updatedAt !== request.createdAt && (
                    <div className="flex justify-between">
                      <span
                        className="font-medium"
                        style={{ color: "#67697c" }}
                      >
                        Laatst bijgewerkt:
                      </span>
                      <span style={{ color: "#120309" }}>
                        {request.updatedAt}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Period Details */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                    }}
                  >
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#120309" }}
                  >
                    Periode details
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span
                        className="block text-sm font-medium mb-1"
                        style={{ color: "#67697c" }}
                      >
                        Startdatum
                      </span>
                      <div
                        className="text-lg font-semibold"
                        style={{ color: "#120309" }}
                      >
                        {request.startDate}
                      </div>
                    </div>
                    <div>
                      <span
                        className="block text-sm font-medium mb-1"
                        style={{ color: "#67697c" }}
                      >
                        Einddatum
                      </span>
                      <div
                        className="text-lg font-semibold"
                        style={{ color: "#120309" }}
                      >
                        {request.endDate}
                      </div>
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: "#d5896f10" }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="font-medium"
                        style={{ color: "#67697c" }}
                      >
                        Totaal aantal dagen:
                      </span>
                      <span
                        className="text-xl font-bold"
                        style={{ color: "#d5896f" }}
                      >
                        {dayCount} {dayCount === 1 ? "dag" : "dagen"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                    }}
                  >
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: "#120309" }}
                  >
                    Reden
                  </h3>
                </div>
                <div
                  className="p-4 rounded-xl bg-gray-50 whitespace-pre-wrap"
                  style={{ color: "#120309" }}
                >
                  {request.reason}
                </div>
              </div>
            </div>

            {/* Right Column - Manager Actions */}
            {canManage && (
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                  <h3
                    className="text-lg font-semibold mb-4"
                    style={{ color: "#120309" }}
                  >
                    Manager acties
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleUpdateStatus("Approved")}
                      disabled={isUpdatingStatus}
                      className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: isUpdatingStatus
                          ? "#10b98180"
                          : "linear-gradient(135deg, #10b981, #059669)",
                      }}
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>
                        {isUpdatingStatus ? "Verwerken..." : "Goedkeuren"}
                      </span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus("Rejected")}
                      disabled={isUpdatingStatus}
                      className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: isUpdatingStatus
                          ? "#ef444480"
                          : "linear-gradient(135deg, #ef4444, #dc2626)",
                      }}
                    >
                      <XCircle className="h-5 w-5" />
                      <span>
                        {isUpdatingStatus ? "Verwerken..." : "Afkeuren"}
                      </span>
                    </button>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-blue-50">
                    <p className="text-sm" style={{ color: "#1e40af" }}>
                      <strong>Let op:</strong> Deze actie kan niet ongedaan
                      worden gemaakt. De medewerker zal op de hoogte worden
                      gesteld van de beslissing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Info Panel for Non-Managers */}
            {!canManage && request.status === TimeOffStatus.Pending && (
              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                  <h3
                    className="text-lg font-semibold mb-4"
                    style={{ color: "#120309" }}
                  >
                    Status informatie
                  </h3>
                  <div className="p-4 rounded-xl bg-orange-50">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <span className="font-medium text-orange-800">
                        In behandeling
                      </span>
                    </div>
                    <p className="text-sm text-orange-700">
                      Je aanvraag wordt beoordeeld door een manager. Je krijgt
                      bericht zodra er een beslissing is genomen.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

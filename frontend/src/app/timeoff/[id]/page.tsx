"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import { formatDate } from "@/utils/dateUtils";
import {
  ArrowLeft,
  CalendarCheck,
  User,
  Calendar,
  Clock,
  FileText,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";
import * as api from "@/lib/api";

// Types voor vrij aanvragen
interface TimeOffRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  status: string;
  reason: string;
  startDate: string;
  endDate: string;
  approvedBy?: number;
  approverName?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TimeOffDetailPage() {
  const params = useParams();
  const requestId = parseInt(params.id as string);
  const { user, isLoading, isManager } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const router = useRouter();

  const [request, setRequest] = useState<TimeOffRequest | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(
    "Vrij aanvraag"
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Load request data
  useEffect(() => {
    if (user) {
      loadRequest();
    }
  }, [user, requestId]);

  const loadRequest = async () => {
    setIsLoadingRequest(true);
    setError(null);
    try {
      const requestData = await api.getTimeOffRequestById(requestId, {
        showErrors: false,
      });
      setRequest(requestData);
    } catch (error: any) {
      console.error("Error loading time off request:", error);
      if (error.status === 404) {
        setError("Vrij aanvraag niet gevonden");
      } else if (error.status === 403) {
        setError("Je hebt geen toegang tot deze vrij aanvraag");
      } else {
        setError(
          "Er is een fout opgetreden bij het laden van de vrij aanvraag"
        );
      }
    } finally {
      setIsLoadingRequest(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-800",
          icon: <CheckCircle className="h-5 w-5 text-green-600" />,
        };
      case "rejected":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          icon: <XCircle className="h-5 w-5 text-red-600" />,
        };
      case "pending":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-800",
          icon: <Clock className="h-5 w-5 text-yellow-600" />,
        };
      case "cancelled":
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-800",
          icon: <XCircle className="h-5 w-5 text-gray-600" />,
        };
      default:
        return {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-800",
          icon: <Clock className="h-5 w-5 text-gray-600" />,
        };
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "Goedgekeurd";
      case "rejected":
        return "Afgewezen";
      case "pending":
        return "In behandeling";
      case "cancelled":
        return "Geannuleerd";
      default:
        return status;
    }
  };

  const formatDateLong = (dateString: string): string => {
    const [day, month, year] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("nl-NL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleEdit = () => {
    // Managers can edit all requests, employees can only edit their own pending requests
    if (
      !isManager() &&
      (request?.employeeId !== user?.id || request?.status !== "Pending")
    ) {
      showAlert({
        title: "Bewerken niet mogelijk",
        message: isManager()
          ? "Alleen managers kunnen alle vrij aanvragen bewerken."
          : "Je kunt alleen je eigen aanvragen bewerken zolang ze nog niet behandeld zijn.",
        confirmText: "OK",
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      });
      return;
    }
    router.push(`/timeoff/edit/${requestId}`);
  };

  const handleDelete = () => {
    if (!request) return;

    // Managers can delete all requests, employees can only delete their own pending requests
    if (
      !isManager() &&
      (request?.employeeId !== user?.id || request?.status !== "Pending")
    ) {
      showAlert({
        title: "Verwijderen niet mogelijk",
        message: isManager()
          ? "Alleen managers kunnen alle vrij aanvragen verwijderen."
          : "Je kunt alleen je eigen aanvragen verwijderen zolang ze nog niet behandeld zijn.",
        confirmText: "OK",
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      });
      return;
    }

    showConfirm({
      title: "Vrij aanvraag verwijderen",
      message: `Weet je zeker dat je de vrij aanvraag van "${request.employeeName}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
      confirmText: "Ja, verwijderen",
      cancelText: "Annuleren",
      variant: "danger",
      icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      onConfirm: async () => {
        try {
          await api.deleteTimeOffRequest(request.id, { showErrors: true });

          showAlert({
            title: "Vrij aanvraag verwijderd",
            message: `De vrij aanvraag van ${request.employeeName} is succesvol verwijderd.`,
            confirmText: "OK",
            icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          });

          router.push("/timeoff");
        } catch (error) {
          console.error("Error deleting time off request:", error);
        }
      },
    });
  };

  if (isLoading || isLoadingRequest) {
    return <LoadingScreen message="Vrij aanvraag laden" />;
  }

  if (!user) {
    return null;
  }

  if (error || !request) {
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
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-600" />
              <h1 className="text-2xl font-bold mb-4 text-gray-900">
                {error || "Vrij aanvraag niet gevonden"}
              </h1>
              <button
                onClick={() => router.push("/timeoff")}
                className="px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Terug naar vrij aanvragen
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const statusInfo = getStatusColor(request.status);

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
                <div className="flex items-center justify-between">
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
                      <CalendarCheck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h1
                        className="text-4xl font-bold"
                        style={{
                          background:
                            "linear-gradient(135deg, #120309, #67697c)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Vrij aanvraag
                      </h1>
                    </div>
                  </div>

                  {(isManager() || (request?.employeeId === user?.id && request?.status === "Pending")) && (
                    <div className="flex flex-col space-y-2">
                      {(isManager() || (request?.employeeId === user?.id && request?.status === "Pending")) && (
                        <button
                          onClick={handleEdit}
                          className="flex items-center justify-center space-x-2 max-[500px]:space-x-0 px-4 max-[500px]:px-3 py-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="max-[500px]:hidden">Bewerken</span>
                        </button>
                      )}
                      {isManager() && (
                        <button
                          onClick={handleDelete}
                          className="flex items-center justify-center space-x-2 max-[500px]:space-x-0 px-4 max-[500px]:px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="max-[500px]:hidden">Verwijderen</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className="space-y-6">
            {/* Status Section */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center space-x-4">
                <div
                  className={`p-4 rounded-xl ${statusInfo.bg} ${statusInfo.border} border-2`}
                >
                  {statusInfo.icon}
                </div>
                <div>
                  <h2
                    className="text-xl font-semibold"
                    style={{ color: "#120309" }}
                  >
                    Status:{" "}
                    <span className={statusInfo.text}>
                      {getStatusText(request.status)}
                    </span>
                  </h2>
                  {request.approverName && (
                    <p className="text-sm mt-1" style={{ color: "#67697c" }}>
                      {request.status.toLowerCase() === "approved"
                        ? "Goedgekeurd"
                        : "Behandeld"}{" "}
                      door: {request.approverName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Request Information */}
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
              <h3
                className="text-xl font-semibold mb-6"
                style={{ color: "#120309" }}
              >
                Aanvraag informatie
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Info */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, #e8eef240, #e8eef220)",
                  }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="h-5 w-5" style={{ color: "#d5896f" }} />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#67697c" }}
                    >
                      Medewerker
                    </p>
                  </div>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "#120309" }}
                  >
                    {request.employeeName}
                  </p>
                </div>

                {/* Period Info */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, #e8eef240, #e8eef220)",
                  }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar
                      className="h-5 w-5"
                      style={{ color: "#d5896f" }}
                    />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#67697c" }}
                    >
                      Periode
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p
                      className="text-lg font-semibold"
                      style={{ color: "#120309" }}
                    >
                      {formatDateLong(request.startDate)}
                    </p>
                    <p className="text-sm" style={{ color: "#67697c" }}>
                      tot
                    </p>
                    <p
                      className="text-lg font-semibold"
                      style={{ color: "#120309" }}
                    >
                      {formatDateLong(request.endDate)}
                    </p>
                  </div>
                </div>

                {/* Created Date */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, #e8eef240, #e8eef220)",
                  }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="h-5 w-5" style={{ color: "#d5896f" }} />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#67697c" }}
                    >
                      Aangemaakt op
                    </p>
                  </div>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "#120309" }}
                  >
                    {formatDateLong(request.createdAt)}
                  </p>
                </div>

                {/* Last Updated */}
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, #e8eef240, #e8eef220)",
                  }}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <Clock className="h-5 w-5" style={{ color: "#d5896f" }} />
                    <p
                      className="text-sm font-medium"
                      style={{ color: "#67697c" }}
                    >
                      Laatst bijgewerkt
                    </p>
                  </div>
                  <p
                    className="text-lg font-semibold"
                    style={{ color: "#120309" }}
                  >
                    {formatDateLong(request.updatedAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            {request.reason && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <MessageSquare
                    className="h-6 w-6"
                    style={{ color: "#d5896f" }}
                  />
                  <h3
                    className="text-xl font-semibold"
                    style={{ color: "#120309" }}
                  >
                    Opmerkingen
                  </h3>
                </div>
                <div
                  className="p-4 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, #e8eef240, #e8eef220)",
                  }}
                >
                  <p
                    className="text-base leading-relaxed"
                    style={{ color: "#120309" }}
                  >
                    {request.reason}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

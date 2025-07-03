"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useModal } from "@/contexts/ModalContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/LoadingScreen";
import { formatDate } from "@/utils/dateUtils";
import {
  CalendarCheck,
  Search,
  Edit,
  Trash2,
  Eye,
  Plus,
  AlertTriangle,
  CheckCircle,
  User,
  Clock,
} from "lucide-react";
import * as api from "@/lib/api";

import TimeOffModal from "@/components/TimeOffModal";

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

interface TimeOffFilter {
  employeeId?: number;
  status?: string;
  fromDate?: string;
  toDate?: string;
}

export default function TimeOffPage() {
  usePageTitle("Dashboard - Vrij aanvragen");

  const { user, isLoading, isManager } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const router = useRouter();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  // Load requests data
  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user, statusFilter]);

  const loadRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const filter: TimeOffFilter = {};
      if (statusFilter !== "all") {
        filter.status = statusFilter;
      }

      const requestsData = await api.getTimeOffRequests(filter, {
        showErrors: true,
      });
      setRequests(requestsData);
    } catch (error) {
      console.error("Error loading time off requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const handleDeleteRequest = (request: TimeOffRequest) => {
    // Only managers can delete requests
    if (!isManager()) {
      showAlert({
        title: "Onvoldoende rechten",
        message: "Alleen managers kunnen vrij aanvragen verwijderen.",
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
          await loadRequests();

          showAlert({
            title: "Vrij aanvraag verwijderd",
            message: `De vrij aanvraag van ${request.employeeName} is succesvol verwijderd.`,
            confirmText: "OK",
            icon: <CheckCircle className="h-6 w-6 text-green-600" />,
          });
        } catch (error) {
          console.error("Error deleting time off request:", error);
        }
      },
    });
  };

  const handleViewRequest = (request: TimeOffRequest) => {
    router.push(`/timeoff/${request.id}`);
  };

  const handleEditRequest = (request: TimeOffRequest) => {
    // Managers can edit all requests, employees can only edit their own pending requests
    if (
      !isManager() &&
      (request.employeeId !== user?.id ||
        request.status.toLowerCase() !== "pending")
    ) {
      showAlert({
        title: "Bewerken niet mogelijk",
        message:
          "Je kunt alleen je eigen aanvragen bewerken zolang ze nog niet behandeld zijn.",
        confirmText: "OK",
        icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
      });
      return;
    }
    router.push(`/timeoff/edit/${request.id}`);
  };

  const handleAddRequest = () => {
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <LoadingScreen message="Vrij aanvragen laden" />;
  }

  if (!user) {
    return null;
  }

  // Filter requests based on search term
  const filteredRequests = requests.filter(
    (request) =>
      request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 relative overflow-hidden">
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
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-4">
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
                        Vrij aanvragen
                      </h1>
                    </div>
                  </div>

                  <button
                    onClick={handleAddRequest}
                    className="flex items-center space-x-2 max-[700px]:space-x-0 px-6 max-[700px]:px-3 py-3 rounded-xl text-white font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                    style={{
                      background: "linear-gradient(135deg, #d5896f, #d5896f90)",
                    }}
                  >
                    <Plus className="h-5 w-5" />
                    <span className="max-[700px]:hidden">Nieuwe aanvraag</span>
                  </button>
                </div>

                {/* Search and Filter */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search
                          className="h-5 w-5"
                          style={{ color: "#d5896f" }}
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Zoek vrij aanvragen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                        style={{ color: "#120309" }}
                        onFocus={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow =
                            "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                          target.style.borderColor = "#d5896f";
                        }}
                        onBlur={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.style.boxShadow = "";
                          target.style.borderColor = "#d1d5db";
                        }}
                      />
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 bg-white/60 hover:bg-white/80 focus:bg-white focus:shadow-lg"
                      style={{ color: "#120309" }}
                      onFocus={(e) => {
                        const target = e.target as HTMLSelectElement;
                        target.style.boxShadow =
                          "0 0 0 2px rgba(213, 137, 111, 0.5), 0 10px 25px rgba(213, 137, 111, 0.15)";
                        target.style.borderColor = "#d5896f";
                      }}
                      onBlur={(e) => {
                        const target = e.target as HTMLSelectElement;
                        target.style.boxShadow = "";
                        target.style.borderColor = "#d1d5db";
                      }}
                    >
                      <option value="all">Alle statussen</option>
                      <option value="Pending">In behandeling</option>
                      <option value="Approved">Goedgekeurd</option>
                      <option value="Rejected">Afgewezen</option>
                      <option value="Cancelled">Geannuleerd</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3
                    className="text-xl font-semibold"
                    style={{ color: "#120309" }}
                  >
                    Overzicht vrij aanvragen
                  </h3>
                  <p className="text-sm mt-1" style={{ color: "#67697c" }}>
                    {filteredRequests.length} van {requests.length} aanvragen
                  </p>
                </div>
              </div>
            </div>

            {isLoadingRequests ? (
              <div className="p-12 text-center">
                <div
                  className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                  style={{ borderColor: "#d5896f" }}
                ></div>
                <p className="mt-4 font-medium" style={{ color: "#67697c" }}>
                  Vrij aanvragen laden...
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead
                    style={{
                      background:
                        "linear-gradient(135deg, #e8eef240, #e8eef220)",
                    }}
                  >
                    <tr>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Medewerker
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Periode
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Status
                      </th>
                      <th
                        className="px-6 py-4 text-left text-sm font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Aangemaakt op
                      </th>
                      <th
                        className="px-6 py-4 text-center text-sm font-semibold"
                        style={{ color: "#120309" }}
                      >
                        Acties
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-3">
                            <CalendarCheck
                              className="h-12 w-12"
                              style={{ color: "#67697c" }}
                            />
                            <p
                              className="font-medium"
                              style={{ color: "#67697c" }}
                            >
                              {searchTerm
                                ? "Geen vrij aanvragen gevonden met deze zoekterm"
                                : "Nog geen vrij aanvragen"}
                            </p>
                            {searchTerm ? (
                              <button
                                onClick={() => setSearchTerm("")}
                                className="text-sm underline cursor-pointer"
                                style={{ color: "#d5896f" }}
                              >
                                Wis zoekterm
                              </button>
                            ) : (
                              <button
                                onClick={handleAddRequest}
                                className="flex items-center max-[500px]:space-x-0 space-x-2 px-4 max-[500px]:px-3 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 cursor-pointer"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #d5896f, #d5896f90)",
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                <span className="max-[500px]:hidden">
                                  Eerste aanvraag toevoegen
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((request) => (
                        <tr
                          key={request.id}
                          className="border-b border-gray-200/30 hover:bg-white/40 transition-all duration-200"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div
                                className="p-2 rounded-lg"
                                style={{
                                  background:
                                    "linear-gradient(135deg, #d5896f20, #d5896f10)",
                                }}
                              >
                                <User
                                  className="h-4 w-4"
                                  style={{ color: "#d5896f" }}
                                />
                              </div>
                              <div>
                                <p
                                  className="font-semibold"
                                  style={{ color: "#120309" }}
                                >
                                  {request.employeeName}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span
                                style={{ color: "#120309" }}
                                className="font-medium"
                              >
                                {formatDate(request.startDate)} -{" "}
                                {formatDate(request.endDate)}
                              </span>
                              <span
                                style={{ color: "#67697c" }}
                                className="text-sm"
                              >
                                {(() => {
                                  const start = new Date(
                                    request.startDate
                                      .split("-")
                                      .reverse()
                                      .join("-")
                                  );
                                  const end = new Date(
                                    request.endDate
                                      .split("-")
                                      .reverse()
                                      .join("-")
                                  );
                                  const diffTime = Math.abs(
                                    end.getTime() - start.getTime()
                                  );
                                  const diffDays =
                                    Math.ceil(
                                      diffTime / (1000 * 60 * 60 * 24)
                                    ) + 1;
                                  return `${diffDays} dag${
                                    diffDays !== 1 ? "en" : ""
                                  }`;
                                })()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                request.status
                              )}`}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {getStatusText(request.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span style={{ color: "#67697c" }}>
                              {formatDate(request.createdAt)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleViewRequest(request)}
                                className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors duration-200 cursor-pointer"
                                title="Bekijken"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </button>
                              {(isManager() ||
                                (request.employeeId === user?.id &&
                                  request.status.toLowerCase() ===
                                    "pending")) && (
                                <>
                                  <button
                                    onClick={() => handleEditRequest(request)}
                                    className="p-2 rounded-lg bg-orange-100 hover:bg-orange-200 transition-colors duration-200 cursor-pointer"
                                    title="Bewerken"
                                  >
                                    <Edit className="h-4 w-4 text-orange-600" />
                                  </button>
                                  {isManager() && (
                                    <button
                                      onClick={() =>
                                        handleDeleteRequest(request)
                                      }
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

      {/* Time Off Modal */}
      <TimeOffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          loadRequests(); // Reload the list
        }}
      />
    </div>
  );
}

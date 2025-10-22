import {
  LoginRequest,
  LoginResponse,
  Employee,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from "@/types/auth";
import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
} from "@/types/company";
import {
  Shift,
  CreateShiftRequest,
  UpdateShiftRequest,
  ShiftFilter,
  WeekSchedule,
  MonthSchedule,
} from "@/types/shift";
import {
  WeekAvailability,
  DateRangeInfo,
  UpdateWeekAvailability,
} from "@/types/availability";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://rooster-systeem-production.up.railway.app/api"
    : "http://localhost:5000/api");

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Error handler reference - will be set by ErrorProvider
let globalErrorHandler:
  | ((error: unknown, customMessage?: string) => void)
  | null = null;

export const setGlobalErrorHandler = (
  handler: (error: unknown, customMessage?: string) => void
) => {
  globalErrorHandler = handler;
};

// Options for API calls
interface ApiCallOptions {
  showErrors?: boolean;
  customErrorMessage?: string;
}

// Token management
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

export const getRefreshToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken");
  }
  return null;
};

export const setRefreshToken = (token: string | null) => {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("refreshToken", token);
    } else {
      localStorage.removeItem("refreshToken");
    }
  }
};

// API request wrapper with automatic token refresh and error handling
const apiRequest = async (
  url: string,
  options: RequestInit = {},
  apiOptions: ApiCallOptions = {}
): Promise<any> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Add access token if available
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // If token expired, try to refresh
  if (response.status === 401 && accessToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry the original request with new token
      headers["Authorization"] = `Bearer ${accessToken}`;
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    let errorMessage = "er is een fout opgetreden";

    try {
      const errorData = await response.text();
      if (errorData) {
        errorMessage = errorData;
      }
    } catch {
      // Use default error message if parsing fails
    }

    // Handle specific error cases
    if (response.status === 403) {
      errorMessage =
        "je hebt geen toegang tot deze functie. alleen managers kunnen medewerkers beheren.";
    } else if (response.status === 401) {
      errorMessage = "je sessie is verlopen. log opnieuw in.";
    }

    const apiError = new ApiError(response.status, errorMessage);

    // Show error automatically if requested
    if (apiOptions.showErrors && globalErrorHandler) {
      globalErrorHandler(apiError, apiOptions.customErrorMessage);
    }

    throw apiError;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
};

// Auth API functions
export const login = async (
  credentials: LoginRequest,
  options: ApiCallOptions = {}
): Promise<LoginResponse> => {
  const response = await apiRequest(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(credentials),
    },
    options
  );

  // Store tokens
  setAccessToken(response.accessToken);
  setRefreshToken(response.refreshToken);

  return response;
};

export const logout = async (options: ApiCallOptions = {}): Promise<void> => {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await apiRequest(
        "/auth/logout",
        {
          method: "POST",
          body: JSON.stringify({ refreshToken }),
        },
        options
      );
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("logout api call failed:", error);
    }
  }

  // Clear tokens
  setAccessToken(null);
  setRefreshToken(null);
};

export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data: LoginResponse = await response.json();
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      // Update stored user and company data
      localStorage.setItem("userData", JSON.stringify(data.user));
      if (data.company) {
        localStorage.setItem("companyData", JSON.stringify(data.company));
      }

      return true;
    }
  } catch (error) {
    console.error("token refresh failed:", error);
  }

  // Clear tokens if refresh failed
  setAccessToken(null);
  setRefreshToken(null);
  return false;
};

// Shift API functions
export const getAllShifts = async (
  filter?: ShiftFilter,
  options: ApiCallOptions = {}
): Promise<Shift[]> => {
  const params = new URLSearchParams();

  if (filter) {
    if (filter.startDate) params.append("startDate", filter.startDate);
    if (filter.endDate) params.append("endDate", filter.endDate);
    if (filter.employeeId !== undefined)
      params.append("employeeId", filter.employeeId.toString());
    if (filter.shiftType !== undefined)
      params.append("shiftType", filter.shiftType.toString());
    if (filter.isOpenEnded !== undefined)
      params.append("isOpenEnded", filter.isOpenEnded.toString());
  }

  const queryString = params.toString();
  const url = `/shift${queryString ? `?${queryString}` : ""}`;

  return apiRequest(url, {}, options);
};

export const getShiftById = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<Shift> => {
  return apiRequest(`/shift/${id}`, {}, options);
};

export const getShiftsByEmployee = async (
  employeeId: number,
  startDate?: string,
  endDate?: string,
  options: ApiCallOptions = {}
): Promise<Shift[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const queryString = params.toString();
  const url = `/shift/employee/${employeeId}${
    queryString ? `?${queryString}` : ""
  }`;

  return apiRequest(url, {}, options);
};

export const getMyShifts = async (
  startDate?: string,
  endDate?: string,
  options: ApiCallOptions = {}
): Promise<Shift[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const queryString = params.toString();
  const url = `/shift/my-shifts${queryString ? `?${queryString}` : ""}`;

  return apiRequest(url, {}, options);
};

export const getWeekSchedule = async (
  weekNumber: string,
  options: ApiCallOptions = {}
): Promise<WeekSchedule> => {
  return apiRequest(`/shift/schedule/week/${weekNumber}`, {}, options);
};

export const getMonthSchedule = async (
  monthYear: string,
  options: ApiCallOptions = {}
): Promise<MonthSchedule> => {
  return apiRequest(`/shift/schedule/month/${monthYear}`, {}, options);
};

export const getAvailableEmployees = async (
  date: string,
  startTime: string,
  endTime?: string,
  options: ApiCallOptions = {}
): Promise<Employee[]> => {
  const params = new URLSearchParams();
  params.append("date", date);
  params.append("startTime", startTime);
  if (endTime) params.append("endTime", endTime);

  return apiRequest(
    `/shift/available-employees?${params.toString()}`,
    {},
    options
  );
};

export const createShift = async (
  shiftData: CreateShiftRequest,
  options: ApiCallOptions = {}
): Promise<Shift> => {
  return apiRequest(
    "/shift",
    {
      method: "POST",
      body: JSON.stringify(shiftData),
    },
    options
  );
};

export const updateShift = async (
  id: number,
  shiftData: UpdateShiftRequest,
  options: ApiCallOptions = {}
): Promise<Shift> => {
  return apiRequest(
    `/shift/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(shiftData),
    },
    options
  );
};

export const deleteShift = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<void> => {
  return apiRequest(
    `/shift/${id}`,
    {
      method: "DELETE",
    },
    options
  );
};

export const checkShiftOverlap = async (
  shiftData: CreateShiftRequest,
  options: ApiCallOptions = {}
): Promise<{ hasOverlap: boolean }> => {
  return apiRequest(
    "/shift/check-overlap",
    {
      method: "POST",
      body: JSON.stringify(shiftData),
    },
    options
  );
};

// Employee API functions
export const getAllEmployees = async (
  options: ApiCallOptions = {}
): Promise<Employee[]> => {
  return apiRequest("/employee", {}, options);
};

// Alias for consistency with other parts of the codebase
export const getEmployees = getAllEmployees;

export const createEmployee = async (
  employeeData: CreateEmployeeRequest,
  options: ApiCallOptions = {}
): Promise<Employee> => {
  return apiRequest(
    "/employee",
    {
      method: "POST",
      body: JSON.stringify(employeeData),
    },
    options
  );
};

export const getEmployeeById = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<Employee> => {
  return apiRequest(`/employee/${id}`, {}, options);
};

export const updateEmployee = async (
  id: number,
  employeeData: UpdateEmployeeRequest,
  options: ApiCallOptions = {}
): Promise<Employee> => {
  return apiRequest(
    `/employee/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(employeeData),
    },
    options
  );
};

export const deleteEmployee = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<void> => {
  return apiRequest(
    `/employee/${id}`,
    {
      method: "DELETE",
    },
    options
  );
};

export const updateProfile = async (
  profileData: UpdateEmployeeRequest,
  options: ApiCallOptions = {}
): Promise<Employee> => {
  return apiRequest(
    "/employee/profile",
    {
      method: "PUT",
      body: JSON.stringify(profileData),
    },
    options
  );
};

export const getCurrentProfile = async (
  options: ApiCallOptions = {}
): Promise<Employee> => {
  return apiRequest("/employee/profile", {}, options);
};

// Availability API functions
export const getMyAvailability = async (
  startDate?: string,
  endDate?: string,
  options: ApiCallOptions = {}
): Promise<WeekAvailability[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const queryString = params.toString();
  const url = `/availability/my-availability${
    queryString ? `?${queryString}` : ""
  }`;

  return apiRequest(url, {}, options);
};

export const getEmployeeAvailability = async (
  employeeId: number,
  startDate?: string,
  endDate?: string,
  options: ApiCallOptions = {}
): Promise<WeekAvailability[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const queryString = params.toString();
  const url = `/availability/employee/${employeeId}${
    queryString ? `?${queryString}` : ""
  }`;

  return apiRequest(url, {}, options);
};

export const updateMyWeekAvailability = async (
  updateData: UpdateWeekAvailability,
  options: ApiCallOptions = {}
): Promise<WeekAvailability> => {
  return apiRequest(
    "/availability/my-availability/week",
    {
      method: "PUT",
      body: JSON.stringify(updateData),
    },
    options
  );
};

export const getMyWeekAvailability = async (
  weekStart: string,
  options: ApiCallOptions = {}
): Promise<WeekAvailability> => {
  return apiRequest(
    `/availability/my-availability/week/${weekStart}`,
    {},
    options
  );
};

export const getEmployeeWeekAvailability = async (
  employeeId: number,
  weekStart: string,
  options: ApiCallOptions = {}
): Promise<WeekAvailability> => {
  return apiRequest(
    `/availability/employee/${employeeId}/week/${weekStart}`,
    {},
    options
  );
};

export const getAvailabilityDateRange = async (
  options: ApiCallOptions = {}
): Promise<DateRangeInfo> => {
  return apiRequest("/availability/date-range", {}, options);
};

// Time Off Request API functions
import {
  TimeOffRequest,
  CreateTimeOffRequestDto,
  UpdateTimeOffRequestStatusDto,
  UpdateTimeOffRequestAsManagerDto,
  TimeOffRequestFilter,
  TimeOffStatus,
} from "../types/timeoff";

// Internal API interface that matches backend response
interface TimeOffRequestApiResponse {
  id: number;
  employeeId: number;
  employeeName: string;
  status: string; // Backend returns string, we'll convert to enum
  reason: string;
  startDate: string;
  endDate: string;
  approvedBy?: number;
  approverName?: string;
  createdAt: string;
  updatedAt: string;
}

// Convert API response to typed interface
const convertTimeOffRequest = (
  apiResponse: TimeOffRequestApiResponse
): TimeOffRequest => {
  return {
    ...apiResponse,
    status: apiResponse.status as TimeOffStatus,
  };
};

export const getTimeOffRequests = async (
  filter?: TimeOffRequestFilter,
  options: ApiCallOptions = {}
): Promise<TimeOffRequest[]> => {
  const params = new URLSearchParams();

  if (filter) {
    if (filter.employeeId !== undefined)
      params.append("employeeId", filter.employeeId.toString());
    if (filter.status) params.append("status", filter.status);
    if (filter.fromDate) params.append("fromDate", filter.fromDate);
    if (filter.toDate) params.append("toDate", filter.toDate);
  }

  const queryString = params.toString();
  const url = `/timeoffrequest${queryString ? `?${queryString}` : ""}`;

  const apiResponses: TimeOffRequestApiResponse[] = await apiRequest(
    url,
    {},
    options
  );
  return apiResponses.map(convertTimeOffRequest);
};

export const getTimeOffRequestById = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<TimeOffRequest> => {
  const apiResponse: TimeOffRequestApiResponse = await apiRequest(
    `/timeoffrequest/${id}`,
    {},
    options
  );
  return convertTimeOffRequest(apiResponse);
};

export const createTimeOffRequest = async (
  requestData: CreateTimeOffRequestDto,
  options: ApiCallOptions = {}
): Promise<TimeOffRequest> => {
  const apiResponse: TimeOffRequestApiResponse = await apiRequest(
    "/timeoffrequest",
    {
      method: "POST",
      body: JSON.stringify(requestData),
    },
    options
  );
  return convertTimeOffRequest(apiResponse);
};

export const updateTimeOffRequest = async (
  id: number,
  requestData: CreateTimeOffRequestDto,
  options: ApiCallOptions = {}
): Promise<TimeOffRequest> => {
  const apiResponse: TimeOffRequestApiResponse = await apiRequest(
    `/timeoffrequest/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(requestData),
    },
    options
  );
  return convertTimeOffRequest(apiResponse);
};

export const updateTimeOffRequestStatus = async (
  id: number,
  statusData: UpdateTimeOffRequestStatusDto,
  options: ApiCallOptions = {}
): Promise<void> => {
  return apiRequest(
    `/timeoffrequest/${id}/status`,
    {
      method: "PUT",
      body: JSON.stringify(statusData),
    },
    options
  );
};

export const cancelTimeOffRequest = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<void> => {
  return apiRequest(
    `/timeoffrequest/${id}/cancel`,
    {
      method: "POST",
    },
    options
  );
};

export const deleteTimeOffRequest = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<void> => {
  return apiRequest(
    `/timeoffrequest/${id}`,
    {
      method: "DELETE",
    },
    options
  );
};

export const updateTimeOffRequestAsManager = async (
  id: number,
  requestData: UpdateTimeOffRequestAsManagerDto,
  options: ApiCallOptions = {}
): Promise<TimeOffRequest> => {
  const apiResponse: TimeOffRequestApiResponse = await apiRequest(
    `/timeoffrequest/${id}/manager`,
    {
      method: "PUT",
      body: JSON.stringify(requestData),
    },
    options
  );
  return convertTimeOffRequest(apiResponse);
};

// Company API functions
export const getAllCompanies = async (
  options: ApiCallOptions = {}
): Promise<Company[]> => {
  return apiRequest("/company", {}, options);
};

export const getCompany = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<Company> => {
  return apiRequest(`/company/${id}`, {}, options);
};

export const createCompany = async (
  companyData: CreateCompanyRequest,
  options: ApiCallOptions = {}
): Promise<Company> => {
  return apiRequest(
    "/company",
    {
      method: "POST",
      body: JSON.stringify(companyData),
    },
    options
  );
};

export const updateCompany = async (
  id: number,
  companyData: UpdateCompanyRequest,
  options: ApiCallOptions = {}
): Promise<Company> => {
  return apiRequest(
    `/company/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(companyData),
    },
    options
  );
};

export const deleteCompany = async (
  id: number,
  options: ApiCallOptions = {}
): Promise<void> => {
  return apiRequest(
    `/company/${id}`,
    {
      method: "DELETE",
    },
    options
  );
};

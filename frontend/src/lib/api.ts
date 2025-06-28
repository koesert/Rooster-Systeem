import { LoginRequest, LoginResponse, Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/types/auth';
import { Shift, CreateShiftRequest, UpdateShiftRequest, ShiftFilter, WeekSchedule, MonthSchedule } from '@/types/shift';
import { WeekAvailability, DateRangeInfo, UpdateWeekAvailability } from '@/types/availability';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Error handler reference - will be set by ErrorProvider
let globalErrorHandler: ((error: any, customMessage?: string) => void) | null = null;

export const setGlobalErrorHandler = (handler: (error: any, customMessage?: string) => void) => {
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
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
};

export const setRefreshToken = (token: string | null) => {
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('refreshToken', token);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }
};

// API request wrapper with automatic token refresh and error handling
const apiRequest = async (url: string, options: RequestInit = {}, apiOptions: ApiCallOptions = {}): Promise<any> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Add access token if available
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
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
      headers['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    let errorMessage = 'Er is een fout opgetreden';

    try {
      const errorData = await response.text();
      if (errorData) {
        errorMessage = errorData;
      }
    } catch (e) {
      // Use default error message if parsing fails
    }

    // Handle specific error cases
    if (response.status === 403) {
      errorMessage = 'Je hebt geen toegang tot deze functie. Alleen managers kunnen medewerkers beheren.';
    } else if (response.status === 401) {
      errorMessage = 'Je sessie is verlopen. Log opnieuw in.';
    }

    const apiError = new ApiError(response.status, errorMessage);

    // Show error automatically if requested
    if (apiOptions.showErrors && globalErrorHandler) {
      globalErrorHandler(apiError, apiOptions.customErrorMessage);
    }

    throw apiError;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

// Auth API functions
export const login = async (credentials: LoginRequest, options: ApiCallOptions = {}): Promise<LoginResponse> => {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }, options);

  // Store tokens
  setAccessToken(response.accessToken);
  setRefreshToken(response.refreshToken);

  return response;
};

export const logout = async (options: ApiCallOptions = {}): Promise<void> => {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }, options);
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
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
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (response.ok) {
      const data: LoginResponse = await response.json();
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);

      // Update stored user data
      localStorage.setItem('userData', JSON.stringify(data.user));

      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }

  // Clear tokens if refresh failed
  setAccessToken(null);
  setRefreshToken(null);
  return false;
};

// Shift API functions
export const getAllShifts = async (filter?: ShiftFilter, options: ApiCallOptions = {}): Promise<Shift[]> => {
  const params = new URLSearchParams();

  if (filter) {
    if (filter.startDate) params.append('startDate', filter.startDate);
    if (filter.endDate) params.append('endDate', filter.endDate);
    if (filter.employeeId !== undefined) params.append('employeeId', filter.employeeId.toString());
    if (filter.shiftType !== undefined) params.append('shiftType', filter.shiftType.toString());
    if (filter.isOpenEnded !== undefined) params.append('isOpenEnded', filter.isOpenEnded.toString());
  }

  const queryString = params.toString();
  const url = `/shift${queryString ? `?${queryString}` : ''}`;

  return apiRequest(url, {}, options);
};

export const getShiftById = async (id: number, options: ApiCallOptions = {}): Promise<Shift> => {
  return apiRequest(`/shift/${id}`, {}, options);
};

export const getShiftsByEmployee = async (employeeId: number, startDate?: string, endDate?: string, options: ApiCallOptions = {}): Promise<Shift[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const queryString = params.toString();
  const url = `/shift/employee/${employeeId}${queryString ? `?${queryString}` : ''}`;

  return apiRequest(url, {}, options);
};

export const getMyShifts = async (startDate?: string, endDate?: string, options: ApiCallOptions = {}): Promise<Shift[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const queryString = params.toString();
  const url = `/shift/my-shifts${queryString ? `?${queryString}` : ''}`;

  return apiRequest(url, {}, options);
};

export const getWeekSchedule = async (weekNumber: string, options: ApiCallOptions = {}): Promise<WeekSchedule> => {
  return apiRequest(`/shift/schedule/week/${weekNumber}`, {}, options);
};

export const getMonthSchedule = async (monthYear: string, options: ApiCallOptions = {}): Promise<MonthSchedule> => {
  return apiRequest(`/shift/schedule/month/${monthYear}`, {}, options);
};

export const getAvailableEmployees = async (date: string, startTime: string, endTime?: string, options: ApiCallOptions = {}): Promise<Employee[]> => {
  const params = new URLSearchParams();
  params.append('date', date);
  params.append('startTime', startTime);
  if (endTime) params.append('endTime', endTime);

  return apiRequest(`/shift/available-employees?${params.toString()}`, {}, options);
};

export const createShift = async (shiftData: CreateShiftRequest, options: ApiCallOptions = {}): Promise<Shift> => {
  return apiRequest('/shift', {
    method: 'POST',
    body: JSON.stringify(shiftData),
  }, options);
};

export const updateShift = async (id: number, shiftData: UpdateShiftRequest, options: ApiCallOptions = {}): Promise<Shift> => {
  return apiRequest(`/shift/${id}`, {
    method: 'PUT',
    body: JSON.stringify(shiftData),
  }, options);
};

export const deleteShift = async (id: number, options: ApiCallOptions = {}): Promise<void> => {
  return apiRequest(`/shift/${id}`, {
    method: 'DELETE',
  }, options);
};

export const checkShiftOverlap = async (shiftData: CreateShiftRequest, options: ApiCallOptions = {}): Promise<{ hasOverlap: boolean }> => {
  return apiRequest('/shift/check-overlap', {
    method: 'POST',
    body: JSON.stringify(shiftData),
  }, options);
};

// Employee API functions
export const getAllEmployees = async (options: ApiCallOptions = {}): Promise<Employee[]> => {
  return apiRequest('/employee', {}, options);
};

export const createEmployee = async (employeeData: CreateEmployeeRequest, options: ApiCallOptions = {}): Promise<Employee> => {
  return apiRequest('/employee', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  }, options);
};

export const getEmployeeById = async (id: number, options: ApiCallOptions = {}): Promise<Employee> => {
  return apiRequest(`/employee/${id}`, {}, options);
};

export const updateEmployee = async (id: number, employeeData: UpdateEmployeeRequest, options: ApiCallOptions = {}): Promise<Employee> => {
  return apiRequest(`/employee/${id}`, {
    method: 'PUT',
    body: JSON.stringify(employeeData),
  }, options);
};

export const deleteEmployee = async (id: number, options: ApiCallOptions = {}): Promise<void> => {
  return apiRequest(`/employee/${id}`, {
    method: 'DELETE',
  }, options);
};

export const updateProfile = async (profileData: UpdateEmployeeRequest, options: ApiCallOptions = {}): Promise<Employee> => {
  return apiRequest('/employee/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  }, options);
};

export const getCurrentProfile = async (options: ApiCallOptions = {}): Promise<Employee> => {
  return apiRequest('/employee/profile', {}, options);
};

// Availability API functions
export const getMyAvailability = async (startDate?: string, endDate?: string, options: ApiCallOptions = {}): Promise<WeekAvailability[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const queryString = params.toString();
  const url = `/availability/my-availability${queryString ? `?${queryString}` : ''}`;

  return apiRequest(url, {}, options);
};

export const updateMyWeekAvailability = async (updateData: UpdateWeekAvailability, options: ApiCallOptions = {}): Promise<WeekAvailability> => {
  return apiRequest('/availability/my-availability/week', {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }, options);
};

export const getMyWeekAvailability = async (weekStart: string, options: ApiCallOptions = {}): Promise<WeekAvailability> => {
  return apiRequest(`/availability/my-availability/week/${weekStart}`, {}, options);
};

export const getAvailabilityDateRange = async (options: ApiCallOptions = {}): Promise<DateRangeInfo> => {
  return apiRequest('/availability/date-range', {}, options);
};
import { LoginRequest, LoginResponse, Employee, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/types/auth';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
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

// API request wrapper with automatic token refresh
const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
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

    throw new ApiError(response.status, errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
};

// Auth API functions
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  // Store tokens
  setAccessToken(response.accessToken);
  setRefreshToken(response.refreshToken);

  return response;
};

export const logout = async (): Promise<void> => {
  const refreshToken = getRefreshToken();

  if (refreshToken) {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
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

// Employee API functions
export const getAllEmployees = async (): Promise<Employee[]> => {
  return apiRequest('/employee');
};

export const createEmployee = async (employeeData: CreateEmployeeRequest): Promise<Employee> => {
  return apiRequest('/employee', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  });
};

export const getEmployeeById = async (id: number): Promise<Employee> => {
  return apiRequest(`/employee/${id}`);
};

export const updateEmployee = async (id: number, employeeData: UpdateEmployeeRequest): Promise<Employee> => {
  return apiRequest(`/employee/${id}`, {
    method: 'PUT',
    body: JSON.stringify(employeeData),
  });
};

export const deleteEmployee = async (id: number): Promise<void> => {
  return apiRequest(`/employee/${id}`, {
    method: 'DELETE',
  });
};

export const updateProfile = async (profileData: UpdateEmployeeRequest): Promise<Employee> => {
  return apiRequest('/employee/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const getCurrentProfile = async (): Promise<Employee> => {
  return apiRequest('/employee/profile');
};
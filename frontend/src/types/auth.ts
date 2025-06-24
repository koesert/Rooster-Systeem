export enum Role {
  Werknemer = 0,
  ShiftLeider = 1,
  Manager = 2
}

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  fullName: string;
  role: Role;
  hireDate: string;
  birthDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Employee;
  expiresAt: string;
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: Role;
  hireDate: string;
  birthDate: string;
}

export interface UpdateEmployeeRequest {
  firstName: string;
  lastName: string;
  username: string;
  password?: string;
  role: Role;
  hireDate: string;
  birthDate: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthContextType {
  user: Employee | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  justLoggedIn: boolean;
  clearJustLoggedIn: () => void;
  refreshUserData: () => Promise<boolean>;
  isManager: () => boolean;
  isManagerOrShiftLeider: () => boolean;
  hasAccess: (requiredRole: Role) => boolean;
  getRoleName: (role: Role) => string;
}
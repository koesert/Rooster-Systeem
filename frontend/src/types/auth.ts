export enum Role {
  Werknemer = 0,
  ShiftLeider = 1,
  Manager = 2,
  SuperAdmin = 3,
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

export interface CompanyColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface CompanyInfo {
  id: number;
  name: string;
  shortName: string;
  colors: CompanyColors;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Employee;
  company: CompanyInfo | null;
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
  company: CompanyInfo | null;
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
  justLoggedIn: boolean;
  clearJustLoggedIn: () => void;
  refreshUserData: () => Promise<boolean>;
  isSuperAdmin: () => boolean;
  isManager: () => boolean;
  isManagerOrShiftLeider: () => boolean;
  hasAccess: (requiredRole: Role) => boolean;
  getRoleName: (role: Role) => string;
}

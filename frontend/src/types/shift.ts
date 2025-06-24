// Shift type enum matching backend
export enum ShiftType {
  Schoonmaak = 0,
  Bedienen = 1,
  SchoonmaakBedienen = 2
}

// Shift interfaces
export interface Shift {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string | null;
  shiftType: ShiftType;
  shiftTypeName: string;
  isOpenEnded: boolean;
  notes: string | null;
  timeRange: string;
  durationInHours: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftRequest {
  employeeId: number;
  date: string;
  startTime: string;
  endTime: string | null;
  shiftType: ShiftType;
  isOpenEnded: boolean;
  notes?: string;
}

export interface UpdateShiftRequest {
  employeeId: number;
  date: string;
  startTime: string;
  endTime: string | null;
  shiftType: ShiftType;
  isOpenEnded: boolean;
  notes?: string;
}

export interface ShiftFilter {
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  shiftType?: ShiftType;
  isOpenEnded?: boolean;
}

export interface WeekSchedule {
  weekNumber: string;
  weekStart: string;
  weekEnd: string;
  shifts: Shift[];
}

export interface MonthSchedule {
  monthYear: string;
  monthStart: string;
  monthEnd: string;
  shifts: Shift[];
}
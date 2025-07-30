// Availability Status enum matching backend
export enum AvailabilityStatus {
  Available = 0,
  NotAvailable = 1,
  TimeOff = 2,
}

export interface DayAvailability {
  id?: number;
  date: string; // DD-MM-YYYY format
  dayOfWeek: string; // maandag, dinsdag, etc.
  isAvailable?: boolean | null; // null = not set yet - KEPT FOR BACKWARD COMPATIBILITY
  status?: AvailabilityStatus | null; // NEW: status field from backend
  notes?: string;
}

export interface WeekAvailability {
  weekStart: string; // DD-MM-YYYY format (Monday)
  employeeId: number;
  employeeName?: string; // For manager views
  days: DayAvailability[];
}

export interface UpdateDayAvailability {
  date: string; // DD-MM-YYYY format
  isAvailable?: boolean | null; // null = remove availability record - KEPT FOR BACKWARD COMPATIBILITY
  status?: AvailabilityStatus | null; // NEW: status field for backend
  notes?: string;
}

export interface UpdateWeekAvailability {
  weekStart: string; // DD-MM-YYYY format
  employeeId: number;
  days: UpdateDayAvailability[];
}

export interface DateRangeInfo {
  minDate: string;
  maxDate: string;
  currentWeekStart: string;
}

// Helper functions to work with both old and new formats
export const getAvailabilityStatusFromDay = (
  day: DayAvailability
): AvailabilityStatus | null => {
  // Use status field if available (from backend), otherwise convert from isAvailable
  if (day.status !== undefined) {
    return day.status;
  }

  // Fallback to isAvailable for backward compatibility
  if (day.isAvailable === true) {
    return AvailabilityStatus.Available;
  } else if (day.isAvailable === false) {
    return AvailabilityStatus.NotAvailable;
  }

  return null;
};

// Utility functions
export const getAvailabilityStatusText = (
  status: AvailabilityStatus | null
): string => {
  switch (status) {
    case AvailabilityStatus.Available:
      return "Beschikbaar";
    case AvailabilityStatus.NotAvailable:
      return "Niet beschikbaar";
    case AvailabilityStatus.TimeOff:
      return "Verlof";
    default:
      return "Niet opgegeven";
  }
};

export const getAvailabilityStatusColor = (
  status: AvailabilityStatus | null
): string => {
  switch (status) {
    case AvailabilityStatus.Available:
      return "bg-green-50 border-green-200";
    case AvailabilityStatus.NotAvailable:
      return "bg-red-50 border-red-200";
    case AvailabilityStatus.TimeOff:
      return "bg-purple-50 border-purple-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
};

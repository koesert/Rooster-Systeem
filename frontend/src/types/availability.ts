export interface DayAvailability {
  id?: number;
  date: string; // DD-MM-YYYY format
  dayOfWeek: string; // maandag, dinsdag, etc.
  isAvailable?: boolean | null; // null = not set yet
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
  isAvailable?: boolean | null; // null = remove availability record
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
import { ShiftType, Shift } from '@/types/shift';

// Time configuration constants
export const SCHEDULE_START_HOUR = 12; // 12:00
export const SCHEDULE_END_HOUR = 24; // 24:00 (midnight)
export const OPEN_END_HOUR = 22; // 22:00 (10 PM) - end time for open shifts visually
export const HOURS_IN_SCHEDULE = SCHEDULE_END_HOUR - SCHEDULE_START_HOUR;

/**
 * Get color scheme for different shift types
 */
export const getShiftColor = (shiftType: ShiftType): { bg: string; border: string; text: string } => {
  switch (shiftType) {
    case ShiftType.Schoonmaak: // Schoonmaak
      return { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900' };
    case ShiftType.Bedienen: // Bedienen
      return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900' };
    case ShiftType.SchoonmaakBedienen: // Schoonmaak & Bedienen
      return { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900' };
    default:
      return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900' };
  }
};

/**
 * Format time string from HH:MM:SS to HH:MM
 */
export const formatTime = (time: string): string => {
  return time.substring(0, 5);
};

/**
 * Convert time string to position percentage for timeline
 */
export const timeToPosition = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;

  // Handle midnight case (00:00 should be treated as 24:00 for positioning)
  if (hours === 0) {
    totalMinutes = 24 * 60 + minutes;
  }

  const scheduleStartMinutes = SCHEDULE_START_HOUR * 60;
  const minutesFromStart = totalMinutes - scheduleStartMinutes;
  return (minutesFromStart / (HOURS_IN_SCHEDULE * 60)) * 100;
};

/**
 * Calculate shift width as percentage for timeline display
 */
export const calculateShiftWidth = (startTime: string, endTime: string | null, isOpenEnded: boolean): number => {
  if (isOpenEnded || !endTime) {
    // Open ended shifts go until 22:00 (10 PM)
    const startPos = timeToPosition(startTime);
    const endPos = timeToPosition('22:00:00');
    return Math.max(endPos - startPos, 5); // Minimum 5% width
  }

  const startPos = timeToPosition(startTime);
  const endPos = timeToPosition(endTime);

  // Handle shifts that cross midnight or go beyond our schedule
  if (endPos <= startPos) {
    // If end time is before start time or at start time, extend to end of schedule
    return Math.max(timeToPosition('22:00:00') - startPos, 5); // Minimum 5% width for visibility
  }

  return Math.max(endPos - startPos, 5); // Minimum 5% width for visibility
};

/**
 * Get array of dates for a week starting from Monday
 */
export const getWeekDates = (date: Date): Date[] => {
  const week = [];
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
  startOfWeek.setDate(diff);

  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    week.push(day);
  }
  return week;
};

/**
 * Get array of all dates in a month
 */
export const getDaysInMonth = (date: Date): Date[] => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d));
  }
  return days;
};

/**
 * Calculate horizontal lanes for overlapping shifts
 */
export const calculateShiftLanes = (shifts: Shift[]): Array<Shift & { lane: number; totalLanes: number }> => {
  if (shifts.length === 0) return [];

  // Sort shifts by start time
  const sortedShifts = [...shifts].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const lanesData: Array<Shift & { lane: number; totalLanes: number }> = [];
  const lanes: Array<{ endTime: string; isOpenEnded: boolean; shiftId: number }> = [];

  sortedShifts.forEach(shift => {
    // Find the first available lane (check for time overlap)
    let assignedLane = -1;

    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];

      // Check if this lane is available (previous shift has ended or doesn't overlap)
      if (!lane.isOpenEnded && lane.endTime <= shift.startTime) {
        assignedLane = i;
        break;
      }
    }

    // If no lane is available, create a new one
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push({ endTime: '', isOpenEnded: false, shiftId: -1 });
    }

    // Update the lane with current shift info
    const endTime = shift.isOpenEnded ? '22:00:00' : (shift.endTime || '22:00:00');
    lanes[assignedLane] = {
      endTime: endTime,
      isOpenEnded: shift.isOpenEnded,
      shiftId: shift.id
    };

    lanesData.push({
      ...shift,
      lane: assignedLane,
      totalLanes: lanes.length
    });
  });

  // Update all shifts with the final total lanes count
  const maxLanes = lanes.length;
  return lanesData.map(shift => ({ ...shift, totalLanes: maxLanes }));
};

/**
 * Check if a shift should be rendered in a specific time slot
 */
export const shouldRenderShiftInTimeSlot = (shift: Shift, timeSlot: string): boolean => {
  const [timeHour, timeMinute] = timeSlot.split(':').map(Number);
  let timeSlotMinutes = timeHour * 60 + timeMinute;

  // Handle midnight (00:00) as 24:00 for comparison
  if (timeHour === 0) {
    timeSlotMinutes = 24 * 60;
  }

  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  let startMinutes = startHour * 60 + startMinute;

  // Handle midnight in start time
  if (startHour === 0) {
    startMinutes = 24 * 60 + startMinute;
  }

  let endMinutes: number;
  if (shift.isOpenEnded) {
    // Open ended shifts go until 22:00
    endMinutes = 22 * 60;
  } else if (shift.endTime) {
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    endMinutes = endHour * 60 + endMin;

    // Handle midnight in end time
    if (endHour === 0) {
      endMinutes = 24 * 60 + endMin;
    }
  } else {
    endMinutes = 22 * 60; // Default to 22:00 if no end time
  }

  // Check if this time slot is within the shift duration
  return timeSlotMinutes >= startMinutes && timeSlotMinutes < endMinutes;
};

/**
 * Calculate how many time slots a shift spans
 */
export const calculateShiftDurationInSlots = (shift: Shift): number => {
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  let startMinutes = startHour * 60 + startMinute;

  // Handle midnight in start time
  if (startHour === 0) {
    startMinutes = 24 * 60 + startMinute;
  }

  let endMinutes: number;
  if (shift.isOpenEnded) {
    // Open ended shifts go until 22:00
    endMinutes = 22 * 60;
  } else if (shift.endTime) {
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    endMinutes = endHour * 60 + endMin;

    // Handle midnight in end time
    if (endHour === 0) {
      endMinutes = 24 * 60 + endMin;
    }
  } else {
    endMinutes = 22 * 60; // Default to 22:00 if no end time
  }

  const durationInMinutes = endMinutes - startMinutes;
  return Math.ceil(durationInMinutes / 60); // Convert to hours and round up
};

/**
 * Calculate exact pixel position for shift start time within the schedule grid
 * @param startTime - Time in HH:MM:SS format
 * @param timeSlots - Array of time slots (e.g., ['12:00', '13:00', ...])
 * @returns Pixel position from top of the grid
 */
export const calculateShiftTopPosition = (startTime: string, timeSlots: string[]): number => {
  const [startHour, startMinute] = startTime.split(':').map(Number);

  // Find the time slot that contains this shift's start hour
  const shiftHourFormatted = `${startHour.toString().padStart(2, '0')}:00`;
  const startTimeIndex = timeSlots.findIndex(slot => slot === shiftHourFormatted);

  if (startTimeIndex === -1) return 0;

  // Calculate position: 50px per time slot + 1px border + exact minute position within the hour
  const basePosition = startTimeIndex * 51; // 50px + 1px border
  const minuteOffset = (startMinute / 60) * 50; // Position within the hour based on minutes

  return basePosition + minuteOffset + 1; // +1 for initial border
};

/**
 * Calculate exact pixel height for shift duration
 * @param shift - Shift object with start and end times
 * @returns Pixel height for the shift block
 */
export const calculateShiftHeight = (shift: Shift): number => {
  const [startHour, startMinute] = shift.startTime.split(':').map(Number);
  let startMinutes = startHour * 60 + startMinute;

  // Handle midnight in start time
  if (startHour === 0) {
    startMinutes = 24 * 60 + startMinute;
  }

  let endMinutes: number;
  if (shift.isOpenEnded) {
    // Open ended shifts go until 22:00
    endMinutes = 22 * 60;
  } else if (shift.endTime) {
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    endMinutes = endHour * 60 + endMin;

    // Handle midnight in end time
    if (endHour === 0) {
      endMinutes = 24 * 60 + endMin;
    }
  } else {
    endMinutes = 22 * 60; // Default to 22:00 if no end time
  }

  const durationInMinutes = endMinutes - startMinutes;

  // Convert duration to pixels: 50px per hour + proportional borders
  const durationInHours = durationInMinutes / 60;
  const pixelHeight = durationInHours * 50; // 50px per hour

  // Add borders proportionally (each hour slot has 1px border)
  const borderHeight = Math.floor(durationInHours) * 1;

  // Minimum height for visibility
  return Math.max(pixelHeight + borderHeight - 3, 36); // -3px for padding, minimum 36px
};

/**
 * Generate time slots array for schedule display
 */
export const generateTimeSlots = (): string[] => {
  const timeSlots: string[] = [];
  for (let hour = SCHEDULE_START_HOUR; hour < SCHEDULE_END_HOUR; hour++) {
    const displayHour = hour === 24 ? 0 : hour; // Convert 24 to 0 for display
    timeSlots.push(`${displayHour.toString().padStart(2, '0')}:00`);
  }
  // Add the final hour (00:00)
  timeSlots.push('00:00');
  return timeSlots;
};
/**
 * Utility functions for date formatting and parsing
 * Ensures consistent DD-MM-YYYY format throughout the application
 */

/**
 * Formats a Date object or date string to DD-MM-YYYY string
 */
export const formatDate = (date: Date | string): string => {
  if (!date) return "";

  let dateObj: Date;

  if (typeof date === "string") {
    // Check if it's already in DD-MM-YYYY format
    const ddmmyyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
    const match = date.match(ddmmyyyyRegex);

    if (match) {
      // Already in DD-MM-YYYY format, return as is
      return date;
    }

    // Try to parse as regular date string
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    return "";
  }

  const day = dateObj.getDate().toString().padStart(2, "0");
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const year = dateObj.getFullYear();

  return `${day}-${month}-${year}`;
};

/**
 * Parses a DD-MM-YYYY string to Date object
 */
export const parseDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  // Handle DD-MM-YYYY format
  const ddmmyyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateString.match(ddmmyyyyRegex);

  if (match) {
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Validate the date is correct (handles invalid dates like 31-02-2023)
    if (
      date.getDate() === parseInt(day) &&
      date.getMonth() === parseInt(month) - 1 &&
      date.getFullYear() === parseInt(year)
    ) {
      return date;
    }
  }

  // Fallback to standard Date parsing
  const fallbackDate = new Date(dateString);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};

/**
 * Converts a Date to YYYY-MM-DD format for HTML date inputs
 */
export const toInputDateFormat = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? parseDate(date) : date;

  if (!dateObj || isNaN(dateObj.getTime())) {
    return "";
  }

  const year = dateObj.getFullYear();
  const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
  const day = dateObj.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Converts YYYY-MM-DD format (from HTML date inputs) to DD-MM-YYYY
 */
export const fromInputDateFormat = (inputDate: string): string => {
  if (!inputDate) return "";

  const date = new Date(inputDate);
  if (isNaN(date.getTime())) return "";

  return formatDate(date);
};

/**
 * Gets current date in DD-MM-YYYY format
 */
export const getCurrentDate = (): string => {
  return formatDate(new Date());
};

/**
 * Validates if a string is in valid DD-MM-YYYY format
 */
export const isValidDateFormat = (dateString: string): boolean => {
  if (!dateString) return false;

  const ddmmyyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match = dateString.match(ddmmyyyyRegex);

  if (!match) return false;

  const [, day, month, year] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  return (
    date.getDate() === parseInt(day) &&
    date.getMonth() === parseInt(month) - 1 &&
    date.getFullYear() === parseInt(year)
  );
};

/**
 * Formats date range in Dutch readable format (e.g., "30 juli - 8 augustus")
 */
export const formatDateRange = (startDateStr: string, endDateStr: string): string => {
  const startDate = parseDate(startDateStr);
  const endDate = parseDate(endDateStr);

  if (!startDate || !endDate) return "";

  const months = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];

  const startDay = startDate.getDate();
  const startMonth = months[startDate.getMonth()];
  const endDay = endDate.getDate();
  const endMonth = months[endDate.getMonth()];

  if (startDateStr === endDateStr) {
    return `${startDay} ${startMonth}`;
  }

  if (
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getFullYear() === endDate.getFullYear()
  ) {
    // Same month: "30 - 31 juli"
    return `${startDay} - ${endDay} ${startMonth}`;
  } else {
    // Different months: "30 juli - 8 augustus"
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }
};

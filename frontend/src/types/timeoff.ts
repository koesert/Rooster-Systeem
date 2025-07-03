export interface TimeOffRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  status: TimeOffStatus;
  reason: string;
  startDate: string; // DD-MM-YYYY format
  endDate: string; // DD-MM-YYYY format
  approvedBy?: number;
  approverName?: string;
  createdAt: string; // DD-MM-YYYY format
  updatedAt: string; // DD-MM-YYYY format
}

export enum TimeOffStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
  Cancelled = "Cancelled",
}

export interface CreateTimeOffRequestDto {
  reason: string;
  startDate: string; // DD-MM-YYYY format
  endDate: string; // DD-MM-YYYY format
}

export interface UpdateTimeOffRequestStatusDto {
  status: "Approved" | "Rejected";
}

export interface UpdateTimeOffRequestAsManagerDto {
  reason: string;
  startDate: string; // DD-MM-YYYY format
  endDate: string; // DD-MM-YYYY format
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
}

export interface TimeOffRequestFilter {
  employeeId?: number;
  status?: string;
  fromDate?: string; // DD-MM-YYYY format
  toDate?: string; // DD-MM-YYYY format
}

// Utility function to get status display text in Dutch
export const getTimeOffStatusText = (status: TimeOffStatus): string => {
  switch (status) {
    case TimeOffStatus.Pending:
      return "Aangevraagd";
    case TimeOffStatus.Approved:
      return "Goedgekeurd";
    case TimeOffStatus.Rejected:
      return "Afgekeurd";
    case TimeOffStatus.Cancelled:
      return "Geannuleerd";
    default:
      return "Onbekend";
  }
};

// Utility function to get status color
export const getTimeOffStatusColor = (status: TimeOffStatus): string => {
  switch (status) {
    case TimeOffStatus.Pending:
      return "#d5896f"; // Orange
    case TimeOffStatus.Approved:
      return "#10b981"; // Green
    case TimeOffStatus.Rejected:
      return "#ef4444"; // Red
    case TimeOffStatus.Cancelled:
      return "#6b7280"; // Gray
    default:
      return "#6b7280";
  }
};

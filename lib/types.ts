export type Role = "admin" | "employee";
export type EmployeeStatus = "active" | "inactive";

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department: string;
  phone?: string;
  status: EmployeeStatus;
  createdAt: number;
  workplaceAddress?: string;
  workplaceLat?: number;
  workplaceLng?: number;
  workplaceRadius?: number;
}

export type TimeEntryType = "in" | "out";

export interface TimeEntry {
  id: string;
  userId: string;
  type: TimeEntryType;
  timestamp: number;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

export type LeaveType = "vacances" | "maladie" | "personnel" | "autre";
export type LeaveStatus = "pending" | "approved" | "rejected";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacances: "Vacances",
  maladie: "Maladie",
  personnel: "Personnel",
  autre: "Autre",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
};

export interface LeaveRequest {
  id: string;
  userId: string;
  type: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string;
  status: LeaveStatus;
  createdAt: number;
  reviewedBy: string | null;
  reviewedAt: number | null;
  adminComment: string | null;
}

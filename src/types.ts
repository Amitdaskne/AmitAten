export type UserRole = 'admin' | 'user';

export interface User {
  id: string; // Firebase node key, e.g., custom generated or auto ID
  username: string;
  password?: string; // Stored in database, sanitized during client exports
  name: string;
  email: string;
  phone: string;
  address: string;
  photoUrl: string;
  role: UserRole;
  department: string;
  designation: string;
  employeeId: string;
  joiningDate: string; // YYYY-MM-DD
  shiftTiming: string; // e.g. "09:00 - 17:00"
  officeLocation: string; // e.g., "HQ Office"
  status: 'enabled' | 'disabled';
  qrCodeData: string; // Unique QR string for login
  emergencyContact: string;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string; // userId_YYYY-MM-DD
  userId: string;
  userName: string;
  userEmployeeId: string;
  userDepartment: string;
  date: string; // YYYY-MM-DD
  tapInTime: number; // Server timestamp (as ms)
  tapOutTime: number | null; // Server timestamp (as ms)
  workingHours: number; // calculated working hours (decimal)
  breakDuration: number; // in minutes, if any
  totalWorkingTime: string; // formatted e.g., "08h 15m"
  status: 'present' | 'absent' | 'late' | 'early_exit' | 'half_day' | 'weekend' | 'holiday';
  isLate: boolean;
  isEarlyExit: boolean;
}

export interface CompanySettings {
  companyName: string;
  companyLogo: string;
  officeAddress: string;
  officeTimingStart: string; // "09:00"
  officeTimingEnd: string; // "17:00"
  lateGraceMinutes: number; // e.g., 15 minutes
  halfDayHours: number; // e.g. 4 hours
  fullDayHours: number; // e.g. 8 hours
  weekendDays: number[]; // e.g. [0, 6] (Sunday, Saturday)
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

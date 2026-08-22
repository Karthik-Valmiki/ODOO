export type UserRole = "ADMIN" | "EMPLOYEE";

export interface UserBasic {
  id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  profile_picture_url?: string;
  company_name?: string;
  company_logo_url?: string;
}

export interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserBasic | null;
  forcePasswordChange: boolean;
}

export interface Employee {
  id: string;
  employee_id: string;
  email: string;
  role: UserRole;
  is_verified: boolean;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  address?: string;
  profile_picture_url?: string;
  status_dot: "GREEN" | "BLUE" | "YELLOW";
  salary_structure?: Record<string, any>;
  created_at?: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  color: string;
  folderColor: "orange" | "green" | "purple" | "slate";
  totalHours: number;
}

export interface TimeBlock {
  id: string;
  projectId: string;
  projectName: string;
  color: string;
  day: number; // Day of the month (1-31)
  startHour: number; // 1-10
  duration: number; // in hours (1-10)
}

export interface AbsenceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeTitle: string;
  avatarColor: string;
  avatarIcon?: string;
  type: "VACATION" | "SICK" | "UNPAID";
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startDay: number;
  endDay: number;
  label: string;
  upcomingAbsences?: { dateRange: string; type: string }[];
}

export interface PunchStatus {
  is_punched_in: boolean;
  record_date?: string;
  check_in?: string;
  check_out?: string;
  work_hours: number;
  extra_hours: number;
  status?: string;
}

export interface Payslip {
  month: number;
  year: number;
  month_name: string;
  user_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  designation: string;
  bank_name?: string;
  account_number?: string;
  pan_number?: string;
  uan_number?: string;
  total_working_days: number;
  present_days: number;
  half_days: number;
  leave_days: number;
  absent_days: number;
  paid_days: number;
  payable_ratio: number;
  overtime_hours: number;
  hourly_rate: number;
  overtime_pay: number;
  base_wage: number;
  base_basic: number;
  base_hra: number;
  base_standard_allowance: number;
  base_performance_bonus: number;
  base_lta: number;
  base_fixed_allowance: number;
  earned_basic: number;
  earned_hra: number;
  earned_standard_allowance: number;
  earned_performance_bonus: number;
  earned_lta: number;
  earned_fixed_allowance: number;
  gross_earnings: number;
  pf_deduction: number;
  prof_tax_deduction: number;
  total_deductions: number;
  net_payout: number;
}

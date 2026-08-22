import uuid
from datetime import date, datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field
from ninja import Schema, ModelSchema
from core.models import User, LeaveRequest, Attendance, Profile


# ==========================================
# Auth Schemas
# ==========================================

class AdminSignupIn(Schema):
    company_name: str = Field(..., min_length=2, example="Odoo Technologies")
    company_logo_url: Optional[str] = Field(None, example="https://placehold.co/100x100?text=Odoo")
    first_name: str = Field(..., min_length=1, example="Admin")
    last_name: str = Field(..., min_length=1, example="User")
    email: EmailStr = Field(..., example="admin@odoo.com")
    phone: Optional[str] = Field(None, example="+91 9876543210")
    password: str = Field(..., min_length=6, example="Admin@12345")
    confirm_password: str = Field(..., min_length=6, example="Admin@12345")


class LoginIn(Schema):
    login_id_or_email: str = Field(..., example="admin@odoo.com")
    password: str = Field(..., example="Admin@12345")


class UserBasicOut(Schema):
    id: uuid.UUID
    employee_id: str
    email: str
    role: str
    is_verified: bool
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str] = None
    profile_picture_url: Optional[str] = None
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None


class LoginOut(Schema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    force_password_change: bool
    user: UserBasicOut


class TokenRefreshIn(Schema):
    refresh_token: str


class TokenRefreshOut(Schema):
    access_token: str
    token_type: str = "bearer"


class ChangePasswordIn(Schema):
    old_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


class ForcePasswordChangeIn(Schema):
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)


# ==========================================
# Employee Schemas
# ==========================================

class EmployeeCreateIn(Schema):
    first_name: str = Field(..., min_length=1, example="Roshan")
    last_name: str = Field(..., min_length=1, example="Sharma")
    email: EmailStr = Field(..., example="roshan.sharma@odoo.com")
    role: str = Field("EMPLOYEE", example="EMPLOYEE")
    phone: Optional[str] = Field(None, example="+91 9876543211")
    address: Optional[str] = Field(None, example="123 MG Road, Bengaluru")
    profile_picture_url: Optional[str] = None
    department: Optional[str] = Field(None, example="Engineering")
    designation: Optional[str] = Field(None, example="Senior Developer")
    date_of_joining: Optional[str] = Field(None, example="2026-01-15")
    dob: Optional[str] = Field(None, example="1995-08-20")
    gender: Optional[str] = Field(None, example="Male")
    nationality: Optional[str] = Field(None, example="Indian")
    marital_status: Optional[str] = Field(None, example="Single")
    personal_email: Optional[str] = Field(None, example="roshan.personal@gmail.com")
    bank_name: Optional[str] = Field(None, example="HDFC Bank")
    account_number: Optional[str] = Field(None, example="50100234567890")
    ifsc_code: Optional[str] = Field(None, example="HDFC0001234")
    pan_number: Optional[str] = Field(None, example="ABCDE1234F")
    uan_number: Optional[str] = Field(None, example="100900800700")
    monthly_wage: Optional[float] = Field(50000.0, example=50000.0)


class EmployeeCreateOut(Schema):
    message: str
    user_id: uuid.UUID
    employee_id: str
    temporary_password: str
    email: str
    full_name: str
    role: str


class EmployeeUpdateIn(Schema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    date_of_joining: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    nationality: Optional[str] = None
    marital_status: Optional[str] = None
    personal_email: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    pan_number: Optional[str] = None
    uan_number: Optional[str] = None
    monthly_wage: Optional[float] = None


class EmployeeOut(Schema):
    id: uuid.UUID
    employee_id: str
    email: str
    role: str
    is_verified: bool
    first_name: str
    last_name: str
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None
    status_dot: str  # "GREEN", "BLUE", "YELLOW"
    salary_structure: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class CompanyStatsOut(Schema):
    company_name: str
    company_logo_url: Optional[str] = None
    total_employees: int
    present_count: int
    on_leave_count: int
    absent_count: int


# ==========================================
# Attendance Schemas (Phase 5)
# ==========================================

class PunchStatusOut(Schema):
    is_punched_in: bool
    record_date: Optional[date] = None
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    work_hours: float = 0.0
    extra_hours: float = 0.0
    status: Optional[str] = None


class AttendanceRecordOut(Schema):
    id: uuid.UUID
    user_id: uuid.UUID
    employee_id: str
    employee_name: str
    profile_picture_url: Optional[str] = None
    record_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    work_hours: float = 0.0
    extra_hours: float = 0.0
    status: str


class AttendanceSummaryOut(Schema):
    total_present: int
    total_half_days: int
    total_absent: int
    total_leaves: int
    total_work_hours: float
    total_overtime_hours: float
    working_days_in_month: int


class AttendanceOverrideIn(Schema):
    user_id: uuid.UUID
    record_date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: str = Field("PRESENT", example="PRESENT")


class AttendanceSchema(ModelSchema):
    class Meta:
        model = Attendance
        fields = ["id", "record_date", "check_in", "check_out", "status", "created_at"]


# ==========================================
# Leave Schemas (Phase 6)
# ==========================================

class LeaveApplyIn(Schema):
    leave_type: str = Field(..., example="PAID")  # PAID, SICK, UNPAID
    start_date: date = Field(..., example="2026-08-25")
    end_date: date = Field(..., example="2026-08-27")
    description: Optional[str] = Field(None, example="Family function")


class LeaveOut(Schema):
    id: uuid.UUID
    user_id: uuid.UUID
    employee_id: str
    employee_name: str
    profile_picture_url: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    total_days: int
    status: str
    description: Optional[str] = None
    admin_comments: Optional[str] = None
    created_at: Optional[datetime] = None


class LeaveActionIn(Schema):
    admin_comments: Optional[str] = Field(None, example="Approved. Have a good break!")


class LeaveBalanceOut(Schema):
    paid_total: int
    paid_used: int
    paid_remaining: int
    sick_total: int
    sick_used: int
    sick_remaining: int
    unpaid_used: int


class LeaveRequestSchema(ModelSchema):
    class Meta:
        model = LeaveRequest
        fields = ["id", "leave_type", "start_date", "end_date", "status", "description", "admin_comments", "created_at"]


class LeaveRequestIn(Schema):
    leave_type: str = Field(..., example="PAID")
    start_date: date = Field(..., example="2026-08-25")
    end_date: date = Field(..., example="2026-08-27")
    description: Optional[str] = Field(None, example="Family function")

import uuid
import calendar
from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from django.db.models import Q
from ninja import NinjaAPI, Query
from ninja.errors import HttpError

from core.models import User, Profile, Attendance, LeaveRequest
from core.auth import (
    jwt_auth,
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_temp_password,
    require_admin,
)
from core.utils import (
    generate_employee_id,
    resolve_employee_status_dot,
    calculate_salary_components,
    calculate_work_hours,
    auto_close_previous_attendances,
    compute_monthly_payroll,
)
from core.schemas import (
    AdminSignupIn,
    LoginIn,
    LoginOut,
    UserBasicOut,
    TokenRefreshIn,
    TokenRefreshOut,
    ChangePasswordIn,
    ForcePasswordChangeIn,
    EmployeeCreateIn,
    EmployeeCreateOut,
    EmployeeUpdateIn,
    EmployeeOut,
    CompanyStatsOut,
    PunchStatusOut,
    AttendanceRecordOut,
    AttendanceSummaryOut,
    AttendanceOverrideIn,
    LeaveApplyIn,
    LeaveOut,
    LeaveActionIn,
    LeaveBalanceOut,
    LeaveRequestSchema,
    LeaveRequestIn,
    SalaryStructureIn,
    SalaryStructureOut,
    PayslipOut,
    PayrollCompanySummaryOut,
)

api = NinjaAPI(
    title="Dayflow HRMS API",
    version="1.0.0",
    description="Every workday, perfectly aligned. Comprehensive HRMS Backend API.",
)


# ==========================================
# System / Health Check
# ==========================================

@api.get("/db-check", tags=["Health"])
def db_check(request):
    try:
        user_count = User.objects.count()
        return {
            "status": "success",
            "message": f"Database connected successfully. Found {user_count} users.",
            "database": "PostgreSQL 16",
        }
    except Exception as e:
        return {"status": "error", "message": f"Database connection failed: {str(e)}"}


# ==========================================
# Authentication Endpoints
# ==========================================

@api.post("/auth/signup", response={200: LoginOut, 400: dict}, tags=["Authentication"])
def admin_signup(request, payload: AdminSignupIn):
    """
    Sign Up endpoint for the initial Admin and Company creation.
    Only accessible for Admin setup as shown in wireframe.
    """
    if payload.password != payload.confirm_password:
        return 400, {"error": "Passwords do not match"}

    if User.objects.filter(email=payload.email).exists():
        return 400, {"error": "An account with this email already exists"}

    employee_id = generate_employee_id(
        company_name=payload.company_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    hashed_pwd = hash_password(payload.password)
    user = User.objects.create(
        employee_id=employee_id,
        email=payload.email,
        password_hash=hashed_pwd,
        role="ADMIN",
        is_verified=True,
    )

    company_data = {
        "company_name": payload.company_name,
        "company_logo_url": payload.company_logo_url,
        "department": "Administration",
        "designation": "Administrator",
        "date_of_joining": date.today().isoformat(),
    }

    profile = Profile.objects.create(
        user=user,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        address="",
        profile_picture_url=payload.company_logo_url,
        salary_structure=company_data,
    )

    access_token = create_access_token(user_id=str(user.id), role=user.role)
    refresh_token = create_refresh_token(user_id=str(user.id), role=user.role)

    user_out = UserBasicOut(
        id=user.id,
        employee_id=user.employee_id,
        email=user.email,
        role=user.role,
        is_verified=user.is_verified,
        first_name=profile.first_name,
        last_name=profile.last_name,
        full_name=profile.full_name,
        phone=profile.phone,
        profile_picture_url=profile.profile_picture_url,
        company_name=payload.company_name,
        company_logo_url=payload.company_logo_url,
    )

    return 200, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "force_password_change": False,
        "user": user_out,
    }


@api.post("/auth/login", response={200: LoginOut, 400: dict, 401: dict}, tags=["Authentication"])
def login(request, payload: LoginIn):
    """
    Login with Email OR auto-generated Employee ID + Password.
    Returns JWT tokens and user profile.
    """
    identifier = payload.login_id_or_email.strip()
    user = User.objects.select_related("profile").filter(
        Q(email__iexact=identifier) | Q(employee_id__iexact=identifier)
    ).first()

    if not user or not verify_password(payload.password, user.password_hash):
        return 401, {"error": "Invalid login credentials (email/ID or password)"}

    profile = getattr(user, "profile", None)
    company_name = None
    company_logo = None
    first_name = "User"
    last_name = ""
    phone = None
    pic = None

    if profile:
        first_name = profile.first_name
        last_name = profile.last_name
        phone = profile.phone
        pic = profile.profile_picture_url
        if isinstance(profile.salary_structure, dict):
            company_name = profile.salary_structure.get("company_name")
            company_logo = profile.salary_structure.get("company_logo_url")

    if not company_name:
        admin_profile = Profile.objects.filter(user__role="ADMIN").first()
        if admin_profile and isinstance(admin_profile.salary_structure, dict):
            company_name = admin_profile.salary_structure.get("company_name", "Dayflow")
            company_logo = admin_profile.salary_structure.get("company_logo_url")

    access_token = create_access_token(user_id=str(user.id), role=user.role)
    refresh_token = create_refresh_token(user_id=str(user.id), role=user.role)

    user_out = UserBasicOut(
        id=user.id,
        employee_id=user.employee_id,
        email=user.email,
        role=user.role,
        is_verified=user.is_verified,
        first_name=first_name,
        last_name=last_name,
        full_name=f"{first_name} {last_name}".strip(),
        phone=phone,
        profile_picture_url=pic,
        company_name=company_name,
        company_logo_url=company_logo,
    )

    return 200, {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "force_password_change": not user.is_verified,
        "user": user_out,
    }


@api.post("/auth/refresh", response={200: TokenRefreshOut, 401: dict}, tags=["Authentication"])
def refresh_token_endpoint(request, payload: TokenRefreshIn):
    """Generate a new access token from a valid refresh token."""
    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            return 401, {"error": "Invalid refresh token type"}
        user_id = decoded.get("sub")
        user = User.objects.get(id=user_id)
        new_access_token = create_access_token(user_id=str(user.id), role=user.role)
        return 200, {"access_token": new_access_token, "token_type": "bearer"}
    except Exception as e:
        return 401, {"error": f"Failed to refresh token: {str(e)}"}


@api.post("/auth/change-password", auth=jwt_auth, response={200: dict, 400: dict}, tags=["Authentication"])
def change_password(request, payload: ChangePasswordIn):
    """Change password for the currently logged-in user."""
    user: User = request.auth
    if not verify_password(payload.old_password, user.password_hash):
        return 400, {"error": "Incorrect old password"}
    if payload.new_password != payload.confirm_password:
        return 400, {"error": "New passwords do not match"}

    user.password_hash = hash_password(payload.new_password)
    user.is_verified = True
    user.save(update_fields=["password_hash", "is_verified", "updated_at"])
    return 200, {"message": "Password changed successfully"}


@api.post("/auth/force-change-password", auth=jwt_auth, response={200: dict, 400: dict}, tags=["Authentication"])
def force_change_password(request, payload: ForcePasswordChangeIn):
    """
    Forced password change on first-time login for onboarded employees.
    Clears the temporary password and activates the account (is_verified = True).
    """
    user: User = request.auth
    if payload.new_password != payload.confirm_password:
        return 400, {"error": "Passwords do not match"}

    user.password_hash = hash_password(payload.new_password)
    user.is_verified = True
    user.save(update_fields=["password_hash", "is_verified", "updated_at"])
    return 200, {"message": "Account activated and password updated successfully"}


@api.get("/auth/me", auth=jwt_auth, response=EmployeeOut, tags=["Authentication"])
def get_current_user_profile(request):
    """Get full profile and live status dot of the currently authenticated user."""
    user: User = request.auth
    profile = Profile.objects.filter(user=user).first()
    status_dot = resolve_employee_status_dot(user)

    salary_data = None
    first_name = ""
    last_name = ""
    phone = None
    address = None
    pic = None

    if profile:
        first_name = profile.first_name
        last_name = profile.last_name
        phone = profile.phone
        address = profile.address
        pic = profile.profile_picture_url
        salary_data = profile.salary_structure

    return EmployeeOut(
        id=user.id,
        employee_id=user.employee_id,
        email=user.email,
        role=user.role,
        is_verified=user.is_verified,
        first_name=first_name,
        last_name=last_name,
        full_name=f"{first_name} {last_name}".strip(),
        phone=phone,
        address=address,
        profile_picture_url=pic,
        status_dot=status_dot,
        salary_structure=salary_data,
        created_at=user.created_at,
    )


# ==========================================
# Employee Management Endpoints (Phase 4)
# ==========================================

@api.get("/employees", auth=jwt_auth, response=List[EmployeeOut], tags=["Employees"])
def list_employees(
    request,
    search: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    List all employees for the dashboard grid/table.
    Includes real-time color status dot (🟢 Green / 🔵 Blue / 🟡 Yellow).
    """
    current_user: User = request.auth
    users = User.objects.select_related("profile").order_by("-created_at")

    if search:
        search_clean = search.strip()
        users = users.filter(
            Q(employee_id__icontains=search_clean)
            | Q(email__icontains=search_clean)
            | Q(profile__first_name__icontains=search_clean)
            | Q(profile__last_name__icontains=search_clean)
        )

    results = []
    today = date.today()

    for u in users:
        p = getattr(u, "profile", None)
        dot = resolve_employee_status_dot(u, today)

        if status and dot.upper() != status.upper():
            continue

        salary_data = p.salary_structure if (p and isinstance(p.salary_structure, dict)) else {}

        if department:
            emp_dept = salary_data.get("department", "")
            if emp_dept.lower() != department.lower():
                continue

        visible_salary = salary_data
        if not current_user.is_admin and u.id != current_user.id:
            visible_salary = {
                k: v for k, v in salary_data.items()
                if k not in ("monthly_wage", "yearly_wage", "basic", "hra", "fixed_allowance", "pf_employee", "pf_employer", "performance_bonus", "lta")
            }

        first_name = p.first_name if p else ""
        last_name = p.last_name if p else ""
        full_name = f"{first_name} {last_name}".strip()

        results.append(
            EmployeeOut(
                id=u.id,
                employee_id=u.employee_id,
                email=u.email,
                role=u.role,
                is_verified=u.is_verified,
                first_name=first_name,
                last_name=last_name,
                full_name=full_name,
                phone=p.phone if p else None,
                address=p.address if p else None,
                profile_picture_url=p.profile_picture_url if p else None,
                status_dot=dot,
                salary_structure=visible_salary,
                created_at=u.created_at,
            )
        )

    return results


@api.post("/employees", auth=jwt_auth, response={201: EmployeeCreateOut, 400: dict, 403: dict}, tags=["Employees"])
def create_employee(request, payload: EmployeeCreateIn):
    """Admin onboards a new employee."""
    admin_user = require_admin(request)

    if User.objects.filter(email=payload.email).exists():
        return 400, {"error": f"An employee with email '{payload.email}' already exists"}

    admin_profile = Profile.objects.filter(user=admin_user).first()
    company_name = "Dayflow"
    company_logo = None
    if admin_profile and isinstance(admin_profile.salary_structure, dict):
        company_name = admin_profile.salary_structure.get("company_name", "Dayflow")
        company_logo = admin_profile.salary_structure.get("company_logo_url")

    employee_id = generate_employee_id(
        company_name=company_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    temp_password = generate_temp_password()
    hashed_pwd = hash_password(temp_password)

    role = payload.role.upper() if payload.role in ("ADMIN", "EMPLOYEE") else "EMPLOYEE"
    user = User.objects.create(
        employee_id=employee_id,
        email=payload.email,
        password_hash=hashed_pwd,
        role=role,
        is_verified=False,
    )

    salary_breakdown = calculate_salary_components(payload.monthly_wage or 50000.0)

    extended_data = {
        "company_name": company_name,
        "company_logo_url": company_logo,
        "department": payload.department or "General",
        "designation": payload.designation or "Employee",
        "date_of_joining": payload.date_of_joining or date.today().isoformat(),
        "dob": payload.dob,
        "gender": payload.gender,
        "nationality": payload.nationality,
        "marital_status": payload.marital_status,
        "personal_email": payload.personal_email,
        "bank_name": payload.bank_name,
        "account_number": payload.account_number,
        "ifsc_code": payload.ifsc_code,
        "pan_number": payload.pan_number,
        "uan_number": payload.uan_number,
        **salary_breakdown,
    }

    profile = Profile.objects.create(
        user=user,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        address=payload.address,
        profile_picture_url=payload.profile_picture_url,
        salary_structure=extended_data,
    )

    return 201, {
        "message": "Employee created successfully with auto-generated ID and temporary password",
        "user_id": user.id,
        "employee_id": user.employee_id,
        "temporary_password": temp_password,
        "email": user.email,
        "full_name": profile.full_name,
        "role": user.role,
    }


@api.get("/employees/{user_id}", auth=jwt_auth, response={200: EmployeeOut, 404: dict}, tags=["Employees"])
def get_employee(request, user_id: uuid.UUID):
    """Get detailed profile of a specific employee."""
    current_user: User = request.auth
    target_user = User.objects.select_related("profile").filter(id=user_id).first()

    if not target_user:
        return 404, {"error": "Employee not found"}

    p = getattr(target_user, "profile", None)
    salary_data = p.salary_structure if (p and isinstance(p.salary_structure, dict)) else {}

    if not current_user.is_admin and current_user.id != target_user.id:
        salary_data = {
            k: v for k, v in salary_data.items()
            if k not in ("monthly_wage", "yearly_wage", "basic", "hra", "fixed_allowance", "pf_employee", "pf_employer", "performance_bonus", "lta", "professional_tax")
        }

    status_dot = resolve_employee_status_dot(target_user)
    first_name = p.first_name if p else ""
    last_name = p.last_name if p else ""

    return 200, EmployeeOut(
        id=target_user.id,
        employee_id=target_user.employee_id,
        email=target_user.email,
        role=target_user.role,
        is_verified=target_user.is_verified,
        first_name=first_name,
        last_name=last_name,
        full_name=f"{first_name} {last_name}".strip(),
        phone=p.phone if p else None,
        address=p.address if p else None,
        profile_picture_url=p.profile_picture_url if p else None,
        status_dot=status_dot,
        salary_structure=salary_data,
        created_at=target_user.created_at,
    )


@api.put("/employees/{user_id}", auth=jwt_auth, response={200: EmployeeOut, 400: dict, 403: dict, 404: dict}, tags=["Employees"])
def update_employee(request, user_id: uuid.UUID, payload: EmployeeUpdateIn):
    """Update employee profile."""
    current_user: User = request.auth
    target_user = User.objects.select_related("profile").filter(id=user_id).first()

    if not target_user:
        return 404, {"error": "Employee not found"}

    if not current_user.is_admin and current_user.id != target_user.id:
        return 403, {"error": "You are not authorized to update another employee's profile"}

    profile, _ = Profile.objects.get_or_create(user=target_user)
    curr_salary = profile.salary_structure if isinstance(profile.salary_structure, dict) else {}

    if payload.first_name is not None:
        profile.first_name = payload.first_name
    if payload.last_name is not None:
        profile.last_name = payload.last_name
    if payload.phone is not None:
        profile.phone = payload.phone
    if payload.address is not None:
        profile.address = payload.address
    if payload.profile_picture_url is not None:
        profile.profile_picture_url = payload.profile_picture_url

    extended_fields = [
        "department", "designation", "date_of_joining", "dob",
        "gender", "nationality", "marital_status", "personal_email",
        "bank_name", "account_number", "ifsc_code", "pan_number", "uan_number"
    ]
    for field in extended_fields:
        val = getattr(payload, field, None)
        if val is not None:
            curr_salary[field] = val

    if payload.monthly_wage is not None:
        if not current_user.is_admin:
            return 403, {"error": "Only Admins can modify salary information"}
        calc = calculate_salary_components(payload.monthly_wage)
        curr_salary.update(calc)

    profile.salary_structure = curr_salary
    profile.save()

    status_dot = resolve_employee_status_dot(target_user)

    return 200, EmployeeOut(
        id=target_user.id,
        employee_id=target_user.employee_id,
        email=target_user.email,
        role=target_user.role,
        is_verified=target_user.is_verified,
        first_name=profile.first_name,
        last_name=profile.last_name,
        full_name=profile.full_name,
        phone=profile.phone,
        address=profile.address,
        profile_picture_url=profile.profile_picture_url,
        status_dot=status_dot,
        salary_structure=profile.salary_structure,
        created_at=target_user.created_at,
    )


@api.delete("/employees/{user_id}", auth=jwt_auth, response={200: dict, 403: dict, 404: dict}, tags=["Employees"])
def delete_employee(request, user_id: uuid.UUID):
    """Admin deletes an employee."""
    require_admin(request)
    target_user = User.objects.filter(id=user_id).first()
    if not target_user:
        return 404, {"error": "Employee not found"}
    if target_user.id == request.auth.id:
        return 400, {"error": "You cannot delete your own admin account"}

    target_user.delete()
    return 200, {"message": f"Employee {target_user.employee_id} deleted successfully"}


@api.get("/company/stats", auth=jwt_auth, response=CompanyStatsOut, tags=["Company"])
def get_company_stats(request):
    """Get dashboard stats: total count, present, on leave, and absent."""
    admin_profile = Profile.objects.filter(user__role="ADMIN").first()
    company_name = "Dayflow HRMS"
    company_logo = None
    if admin_profile and isinstance(admin_profile.salary_structure, dict):
        company_name = admin_profile.salary_structure.get("company_name", "Dayflow HRMS")
        company_logo = admin_profile.salary_structure.get("company_logo_url")

    today = date.today()
    all_users = User.objects.all()
    total = all_users.count()

    present_count = 0
    on_leave_count = 0
    absent_count = 0

    for u in all_users:
        dot = resolve_employee_status_dot(u, today)
        if dot == "GREEN":
            present_count += 1
        elif dot == "BLUE":
            on_leave_count += 1
        else:
            absent_count += 1

    return CompanyStatsOut(
        company_name=company_name,
        company_logo_url=company_logo,
        total_employees=total,
        present_count=present_count,
        on_leave_count=on_leave_count,
        absent_count=absent_count,
    )


# ==========================================
# Phase 5: Attendance & Overtime Endpoints
# ==========================================

@api.post("/attendance/punch-in", auth=jwt_auth, response={200: PunchStatusOut, 400: dict}, tags=["Attendance"])
def punch_in(request):
    """
    Punch In for work.
    Auto-closes previous open check-ins from earlier dates.
    Sets check_in time and marks status as PRESENT.
    """
    user: User = request.auth
    today = date.today()
    now_time = datetime.now(timezone.utc)

    auto_close_previous_attendances(user, today)

    attendance = Attendance.objects.filter(user=user, record_date=today).first()
    if attendance:
        if attendance.check_in and attendance.check_out is None:
            return 400, {"error": "You are already punched in today"}
        attendance.check_in = now_time
        attendance.check_out = None
        attendance.status = "PRESENT"
        attendance.save()
    else:
        attendance = Attendance.objects.create(
            user=user,
            record_date=today,
            check_in=now_time,
            check_out=None,
            status="PRESENT",
        )

    return 200, PunchStatusOut(
        is_punched_in=True,
        record_date=attendance.record_date,
        check_in=attendance.check_in,
        check_out=attendance.check_out,
        work_hours=0.0,
        extra_hours=0.0,
        status=attendance.status,
    )


@api.post("/attendance/punch-out", auth=jwt_auth, response={200: PunchStatusOut, 400: dict}, tags=["Attendance"])
def punch_out(request):
    """
    Punch Out from work.
    Calculates standard work hours (<=8h) and extra/overtime hours (>8h).
    Updates attendance status (PRESENT / HALF_DAY / ABSENT).
    """
    user: User = request.auth
    today = date.today()
    now_time = datetime.now(timezone.utc)

    attendance = Attendance.objects.filter(user=user, record_date=today).first()
    if not attendance or not attendance.check_in:
        return 400, {"error": "You have not punched in today"}

    if attendance.check_out is not None:
        return 400, {"error": "You have already punched out today"}

    attendance.check_out = now_time
    work_hrs, extra_hrs, status = calculate_work_hours(attendance.check_in, now_time)
    attendance.status = status
    attendance.save()

    return 200, PunchStatusOut(
        is_punched_in=False,
        record_date=attendance.record_date,
        check_in=attendance.check_in,
        check_out=attendance.check_out,
        work_hours=work_hrs,
        extra_hours=extra_hrs,
        status=attendance.status,
    )


@api.get("/attendance/today", auth=jwt_auth, response=PunchStatusOut, tags=["Attendance"])
def get_today_punch_status(request):
    """Get current user's punch in/out status for today."""
    user: User = request.auth
    today = date.today()
    attendance = Attendance.objects.filter(user=user, record_date=today).first()

    if not attendance or not attendance.check_in:
        return PunchStatusOut(
            is_punched_in=False,
            record_date=today,
            check_in=None,
            check_out=None,
            work_hours=0.0,
            extra_hours=0.0,
            status="ABSENT",
        )

    is_punched_in = attendance.check_in is not None and attendance.check_out is None
    work_hrs = 0.0
    extra_hrs = 0.0

    if attendance.check_out:
        work_hrs, extra_hrs, _ = calculate_work_hours(attendance.check_in, attendance.check_out)
    elif attendance.check_in:
        work_hrs, extra_hrs, _ = calculate_work_hours(attendance.check_in, datetime.now(timezone.utc))

    return PunchStatusOut(
        is_punched_in=is_punched_in,
        record_date=attendance.record_date,
        check_in=attendance.check_in,
        check_out=attendance.check_out,
        work_hours=work_hrs,
        extra_hours=extra_hrs,
        status=attendance.status,
    )


@api.get("/attendance", auth=jwt_auth, response=List[AttendanceRecordOut], tags=["Attendance"])
def list_attendance_records(
    request,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    employee_id: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    List attendance records with work hours and overtime calculations.
    Admin sees all employees; Employees see their own records.
    """
    user: User = request.auth
    qs = Attendance.objects.select_related("user", "user__profile").order_by("-record_date", "-check_in")

    if not user.is_admin:
        qs = qs.filter(user=user)
    else:
        if employee_id:
            qs = qs.filter(user__employee_id__icontains=employee_id.strip())

    if date_from:
        qs = qs.filter(record_date__gte=date_from)
    if date_to:
        qs = qs.filter(record_date__lte=date_to)
    if status:
        qs = qs.filter(status__iexact=status.strip())

    results = []
    for att in qs:
        u = att.user
        p = getattr(u, "profile", None)
        emp_name = p.full_name if p else u.employee_id
        pic = p.profile_picture_url if p else None

        work_hrs, extra_hrs, _ = calculate_work_hours(att.check_in, att.check_out)

        results.append(
            AttendanceRecordOut(
                id=att.id,
                user_id=u.id,
                employee_id=u.employee_id,
                employee_name=emp_name,
                profile_picture_url=pic,
                record_date=att.record_date,
                check_in=att.check_in,
                check_out=att.check_out,
                work_hours=work_hrs,
                extra_hours=extra_hrs,
                status=att.status,
            )
        )

    return results


@api.get("/attendance/summary", auth=jwt_auth, response=AttendanceSummaryOut, tags=["Attendance"])
def get_attendance_summary(
    request,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user_id: Optional[uuid.UUID] = None,
):
    """
    Get monthly attendance statistics:
    Total present days, half days, absences, approved leaves, total work hours & overtime hours.
    """
    current_user: User = request.auth
    target_user = current_user
    if user_id and current_user.is_admin:
        target_user = User.objects.filter(id=user_id).first() or current_user

    now = date.today()
    m = month or now.month
    y = year or now.year

    num_days = calendar.monthrange(y, m)[1]
    working_days = sum(1 for d in range(1, num_days + 1) if date(y, m, d).weekday() < 5)

    records = Attendance.objects.filter(
        user=target_user,
        record_date__year=y,
        record_date__month=m,
    )

    present_count = 0
    half_day_count = 0
    absent_count = 0
    leave_count = 0
    total_work_hrs = 0.0
    total_ot_hrs = 0.0

    for r in records:
        if r.status == "PRESENT":
            present_count += 1
        elif r.status == "HALF_DAY":
            half_day_count += 1
        elif r.status == "LEAVE":
            leave_count += 1
        elif r.status == "ABSENT":
            absent_count += 1

        w_hrs, ot_hrs, _ = calculate_work_hours(r.check_in, r.check_out)
        total_work_hrs += w_hrs
        total_ot_hrs += ot_hrs

    return AttendanceSummaryOut(
        total_present=present_count,
        total_half_days=half_day_count,
        total_absent=absent_count,
        total_leaves=leave_count,
        total_work_hours=round(total_work_hrs, 2),
        total_overtime_hours=round(total_ot_hrs, 2),
        working_days_in_month=working_days,
    )


@api.post("/attendance/override", auth=jwt_auth, response={200: AttendanceRecordOut, 400: dict, 403: dict}, tags=["Attendance"])
def override_attendance(request, payload: AttendanceOverrideIn):
    """Admin manual override or creation of employee attendance."""
    require_admin(request)
    target_user = User.objects.select_related("profile").filter(id=payload.user_id).first()
    if not target_user:
        return 400, {"error": "Target user does not exist"}

    att, _ = Attendance.objects.get_or_create(
        user=target_user,
        record_date=payload.record_date,
        defaults={"status": payload.status},
    )

    if payload.check_in is not None:
        att.check_in = payload.check_in
    if payload.check_out is not None:
        att.check_out = payload.check_out
    att.status = payload.status
    att.save()

    w_hrs, ot_hrs, _ = calculate_work_hours(att.check_in, att.check_out)
    p = getattr(target_user, "profile", None)

    return 200, AttendanceRecordOut(
        id=att.id,
        user_id=target_user.id,
        employee_id=target_user.employee_id,
        employee_name=p.full_name if p else target_user.employee_id,
        profile_picture_url=p.profile_picture_url if p else None,
        record_date=att.record_date,
        check_in=att.check_in,
        check_out=att.check_out,
        work_hours=w_hrs,
        extra_hours=ot_hrs,
        status=att.status,
    )


# ==========================================
# Phase 6: Leave Management & Overlap Endpoints
# ==========================================

@api.post("/leaves/apply", auth=jwt_auth, response={201: LeaveOut, 400: dict}, tags=["Leaves"])
def apply_leave(request, payload: LeaveApplyIn):
    """Apply for time off with overlap validation."""
    user: User = request.auth

    if payload.end_date < payload.start_date:
        return 400, {"error": "End date must be on or after start date"}

    leave_type = payload.leave_type.upper()
    if leave_type not in ("PAID", "SICK", "UNPAID"):
        return 400, {"error": "Invalid leave type. Choose from: PAID, SICK, UNPAID"}

    has_overlap = LeaveRequest.objects.filter(
        user=user,
        status__in=["PENDING", "APPROVED"],
        start_date__lte=payload.end_date,
        end_date__gte=payload.start_date,
    ).exists()

    if has_overlap:
        return 400, {"error": "You already have a Pending or Approved leave overlapping with these dates"}

    leave = LeaveRequest.objects.create(
        user=user,
        leave_type=leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        description=payload.description,
        status="PENDING",
    )

    total_days = (leave.end_date - leave.start_date).days + 1
    p = Profile.objects.filter(user=user).first()

    return 201, LeaveOut(
        id=leave.id,
        user_id=user.id,
        employee_id=user.employee_id,
        employee_name=p.full_name if p else user.employee_id,
        profile_picture_url=p.profile_picture_url if p else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=total_days,
        status=leave.status,
        description=leave.description,
        admin_comments=leave.admin_comments,
        created_at=leave.created_at,
    )


@api.get("/leaves", auth=jwt_auth, response=List[LeaveOut], tags=["Leaves"])
def list_leaves(
    request,
    status: Optional[str] = None,
    leave_type: Optional[str] = None,
    employee_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
):
    """List all leave requests."""
    user: User = request.auth
    qs = LeaveRequest.objects.select_related("user", "user__profile").order_by("-created_at")

    if not user.is_admin:
        qs = qs.filter(user=user)
    else:
        if employee_id:
            qs = qs.filter(user__employee_id__icontains=employee_id.strip())

    if status:
        qs = qs.filter(status__iexact=status.strip())
    if leave_type:
        qs = qs.filter(leave_type__iexact=leave_type.strip())
    if date_from:
        qs = qs.filter(end_date__gte=date_from)
    if date_to:
        qs = qs.filter(start_date__lte=date_to)

    results = []
    for l in qs:
        u = l.user
        p = getattr(u, "profile", None)
        total_days = (l.end_date - l.start_date).days + 1

        results.append(
            LeaveOut(
                id=l.id,
                user_id=u.id,
                employee_id=u.employee_id,
                employee_name=p.full_name if p else u.employee_id,
                profile_picture_url=p.profile_picture_url if p else None,
                leave_type=l.leave_type,
                start_date=l.start_date,
                end_date=l.end_date,
                total_days=total_days,
                status=l.status,
                description=l.description,
                admin_comments=l.admin_comments,
                created_at=l.created_at,
            )
        )

    return results


@api.post("/leaves/{leave_id}/approve", auth=jwt_auth, response={200: LeaveOut, 400: dict, 403: dict, 404: dict}, tags=["Leaves"])
def approve_leave(request, leave_id: uuid.UUID, payload: LeaveActionIn):
    """Admin approves leave request and triggers retroactive attendance sync."""
    require_admin(request)
    leave = LeaveRequest.objects.select_related("user", "user__profile").filter(id=leave_id).first()
    if not leave:
        return 404, {"error": "Leave request not found"}

    leave.status = "APPROVED"
    if payload.admin_comments:
        leave.admin_comments = payload.admin_comments
    leave.save()

    curr_date = leave.start_date
    while curr_date <= leave.end_date:
        att = Attendance.objects.filter(user=leave.user, record_date=curr_date).first()
        if att:
            if att.status in ("ABSENT", "HALF_DAY") or not att.check_in:
                att.status = "LEAVE"
                att.save(update_fields=["status", "updated_at"])
        else:
            Attendance.objects.create(
                user=leave.user,
                record_date=curr_date,
                check_in=None,
                check_out=None,
                status="LEAVE",
            )
        curr_date += timedelta(days=1)

    total_days = (leave.end_date - leave.start_date).days + 1
    p = getattr(leave.user, "profile", None)

    return 200, LeaveOut(
        id=leave.id,
        user_id=leave.user.id,
        employee_id=leave.user.employee_id,
        employee_name=p.full_name if p else leave.user.employee_id,
        profile_picture_url=p.profile_picture_url if p else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=total_days,
        status=leave.status,
        description=leave.description,
        admin_comments=leave.admin_comments,
        created_at=leave.created_at,
    )


@api.post("/leaves/{leave_id}/reject", auth=jwt_auth, response={200: LeaveOut, 400: dict, 403: dict, 404: dict}, tags=["Leaves"])
def reject_leave(request, leave_id: uuid.UUID, payload: LeaveActionIn):
    """Admin rejects a leave request."""
    require_admin(request)
    leave = LeaveRequest.objects.select_related("user", "user__profile").filter(id=leave_id).first()
    if not leave:
        return 404, {"error": "Leave request not found"}

    leave.status = "REJECTED"
    if payload.admin_comments:
        leave.admin_comments = payload.admin_comments
    leave.save()

    total_days = (leave.end_date - leave.start_date).days + 1
    p = getattr(leave.user, "profile", None)

    return 200, LeaveOut(
        id=leave.id,
        user_id=leave.user.id,
        employee_id=leave.user.employee_id,
        employee_name=p.full_name if p else leave.user.employee_id,
        profile_picture_url=p.profile_picture_url if p else None,
        leave_type=leave.leave_type,
        start_date=leave.start_date,
        end_date=leave.end_date,
        total_days=total_days,
        status=leave.status,
        description=leave.description,
        admin_comments=leave.admin_comments,
        created_at=leave.created_at,
    )


@api.delete("/leaves/{leave_id}/cancel", auth=jwt_auth, response={200: dict, 400: dict, 403: dict, 404: dict}, tags=["Leaves"])
def cancel_leave(request, leave_id: uuid.UUID):
    """Employee cancels their own pending leave request."""
    current_user: User = request.auth
    leave = LeaveRequest.objects.filter(id=leave_id).first()
    if not leave:
        return 404, {"error": "Leave request not found"}

    if not current_user.is_admin and leave.user_id != current_user.id:
        return 403, {"error": "You are not authorized to cancel this leave request"}

    if leave.status != "PENDING":
        return 400, {"error": "Only pending leave requests can be cancelled"}

    leave.delete()
    return 200, {"message": "Leave request cancelled successfully"}


@api.get("/leaves/balance", auth=jwt_auth, response=LeaveBalanceOut, tags=["Leaves"])
def get_leave_balance(request, user_id: Optional[uuid.UUID] = None):
    """Get annual leave allowance quotas and consumed days."""
    current_user: User = request.auth
    target_user = current_user
    if user_id and current_user.is_admin:
        target_user = User.objects.filter(id=user_id).first() or current_user

    current_year = date.today().year
    approved_leaves = LeaveRequest.objects.filter(
        user=target_user,
        status="APPROVED",
        start_date__year=current_year,
    )

    paid_total = 18
    sick_total = 12
    paid_used = 0
    sick_used = 0
    unpaid_used = 0

    for l in approved_leaves:
        days = (l.end_date - l.start_date).days + 1
        if l.leave_type == "PAID":
            paid_used += days
        elif l.leave_type == "SICK":
            sick_used += days
        elif l.leave_type == "UNPAID":
            unpaid_used += days

    paid_remaining = max(0, paid_total - paid_used)
    sick_remaining = max(0, sick_total - sick_used)

    return LeaveBalanceOut(
        paid_total=paid_total,
        paid_used=paid_used,
        paid_remaining=paid_remaining,
        sick_total=sick_total,
        sick_used=sick_used,
        sick_remaining=sick_remaining,
        unpaid_used=unpaid_used,
    )


# ==========================================
# Phase 7: Payroll & Salary Structure Endpoints
# ==========================================

@api.get("/salary/structure/{user_id}", auth=jwt_auth, response={200: SalaryStructureOut, 403: dict, 404: dict}, tags=["Salary"])
def get_salary_structure(request, user_id: uuid.UUID):
    """
    Get the 6-component salary structure for an employee.
    Admin can view any employee; Employees can view their own.
    """
    current_user: User = request.auth
    if not current_user.is_admin and current_user.id != user_id:
        return 403, {"error": "You are not authorized to view this salary structure"}

    target_user = User.objects.select_related("profile").filter(id=user_id).first()
    if not target_user:
        return 404, {"error": "Employee not found"}

    p = getattr(target_user, "profile", None)
    salary_data = p.salary_structure if (p and isinstance(p.salary_structure, dict)) else {}

    wage = float(salary_data.get("monthly_wage", 50000.0))
    comp = calculate_salary_components(
        monthly_wage=wage,
        performance_bonus_pct=float(salary_data.get("performance_bonus_pct", 8.333)),
        lta_pct=float(salary_data.get("lta_pct", 8.333)),
        working_days_per_week=int(salary_data.get("working_days_per_week", 5)),
        break_time_hours=float(salary_data.get("break_time_hours", 1.0)),
        pf_rate=float(salary_data.get("pf_rate", 12.0)),
        prof_tax=float(salary_data.get("professional_tax", 200.0)),
    )

    return 200, SalaryStructureOut(**comp)


@api.put("/salary/structure/{user_id}", auth=jwt_auth, response={200: SalaryStructureOut, 400: dict, 403: dict, 404: dict}, tags=["Salary"])
def update_salary_structure(request, user_id: uuid.UUID, payload: SalaryStructureIn):
    """
    Admin updates salary structure components and wage.
    Automatically re-calculates all 6 components and statutory PF/tax.
    """
    require_admin(request)
    target_user = User.objects.select_related("profile").filter(id=user_id).first()
    if not target_user:
        return 404, {"error": "Employee not found"}

    profile, _ = Profile.objects.get_or_create(user=target_user)
    curr_data = profile.salary_structure if isinstance(profile.salary_structure, dict) else {}

    comp = calculate_salary_components(
        monthly_wage=payload.monthly_wage,
        performance_bonus_pct=payload.performance_bonus_pct or 8.333,
        lta_pct=payload.lta_pct or 8.333,
        working_days_per_week=payload.working_days_per_week or 5,
        break_time_hours=payload.break_time_hours or 1.0,
        pf_rate=payload.pf_rate or 12.0,
        prof_tax=payload.professional_tax or 200.0,
    )

    curr_data.update(comp)
    profile.salary_structure = curr_data
    profile.save(update_fields=["salary_structure", "updated_at"])

    return 200, SalaryStructureOut(**comp)


@api.get("/payroll/payslip", auth=jwt_auth, response={200: PayslipOut, 403: dict, 404: dict}, tags=["Payroll"])
def get_monthly_payslip(
    request,
    month: Optional[int] = None,
    year: Optional[int] = None,
    user_id: Optional[uuid.UUID] = None,
):
    """
    Get detailed itemized monthly payslip.
    Admin can specify any `user_id`; Employees receive their own payslip.
    """
    current_user: User = request.auth
    target_user = current_user

    if user_id:
        if not current_user.is_admin and current_user.id != user_id:
            return 403, {"error": "You are not authorized to view another employee's payslip"}
        target_user = User.objects.select_related("profile").filter(id=user_id).first()
        if not target_user:
            return 404, {"error": "Employee not found"}

    now = date.today()
    m = month or now.month
    y = year or now.year

    payroll_data = compute_monthly_payroll(user=target_user, month=m, year=y)
    return 200, PayslipOut(**payroll_data)


@api.get("/payroll/company-summary", auth=jwt_auth, response={200: PayrollCompanySummaryOut, 403: dict}, tags=["Payroll"])
def get_company_payroll_summary(
    request,
    month: Optional[int] = None,
    year: Optional[int] = None,
):
    """
    Admin company-wide payroll summary for a given month.
    Aggregates total gross payout, net payout, PF, and tax deductions.
    """
    require_admin(request)
    now = date.today()
    m = month or now.month
    y = year or now.year

    all_employees = User.objects.select_related("profile").filter(role="EMPLOYEE").order_by("created_at")
    payslips = []

    total_gross = 0.0
    total_net = 0.0
    total_pf = 0.0
    total_tax = 0.0

    for emp in all_employees:
        p_data = compute_monthly_payroll(user=emp, month=m, year=y)
        payslip_obj = PayslipOut(**p_data)
        payslips.append(payslip_obj)

        total_gross += payslip_obj.gross_earnings
        total_net += payslip_obj.net_payout
        total_pf += payslip_obj.pf_deduction
        total_tax += payslip_obj.prof_tax_deduction

    return 200, PayrollCompanySummaryOut(
        month=m,
        year=y,
        month_name=calendar.month_name[m],
        total_employees_paid=len(payslips),
        total_gross_payout=round(total_gross, 2),
        total_net_payout=round(total_net, 2),
        total_pf_contributions=round(total_pf, 2),
        total_tax_deductions=round(total_tax, 2),
        payslips=payslips,
    )

import uuid
from datetime import date
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
    AttendanceSchema,
    LeaveRequestSchema,
    LeaveRequestIn,
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

    # Generate Admin Employee ID (e.g. ODADMI2026001 or using initials)
    employee_id = generate_employee_id(
        company_name=payload.company_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    # Create Admin User
    hashed_pwd = hash_password(payload.password)
    user = User.objects.create(
        employee_id=employee_id,
        email=payload.email,
        password_hash=hashed_pwd,
        role="ADMIN",
        is_verified=True,  # Admin sets their own password, verified immediately
    )

    # Create Admin Profile with company details in salary_structure JSONB
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

    # Generate JWT Tokens
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

    # Extract company info if available
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

    # If employee's profile doesn't have company_name, look up the Admin's company
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
# Employee Onboarding & Management (Phase 4)
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

        # Filter by status dot if requested ("GREEN", "BLUE", "YELLOW")
        if status and dot.upper() != status.upper():
            continue

        salary_data = p.salary_structure if (p and isinstance(p.salary_structure, dict)) else {}

        if department:
            emp_dept = salary_data.get("department", "")
            if emp_dept.lower() != department.lower():
                continue

        # Hide sensitive salary figures if requester is a regular employee viewing someone else
        visible_salary = salary_data
        if not current_user.is_admin and u.id != current_user.id:
            # Mask salary numbers for privacy
            visible_salary = {
                k: v for k, v in salary_data.items()
                if k not in ("monthly_wage", "yearly_wage", "basic", "hra", "fixed_allowance", "pf_employee", "pf_employer")
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
    """
    Admin onboards a new employee.
    Auto-generates:
      1. Employee ID per formula: [CompanyPrefix][NameInitials][Year][Sequence] (e.g. ODROSH2026001)
      2. Secure temporary password.
      3. Sets is_verified = False so employee is forced to change password on first login.
      4. Auto-calculates standard salary components based on monthly wage.
    """
    admin_user = require_admin(request)

    if User.objects.filter(email=payload.email).exists():
        return 400, {"error": f"An employee with email '{payload.email}' already exists"}

    # Fetch company name from admin profile
    admin_profile = Profile.objects.filter(user=admin_user).first()
    company_name = "Dayflow"
    company_logo = None
    if admin_profile and isinstance(admin_profile.salary_structure, dict):
        company_name = admin_profile.salary_structure.get("company_name", "Dayflow")
        company_logo = admin_profile.salary_structure.get("company_logo_url")

    # 1. Generate Employee ID
    employee_id = generate_employee_id(
        company_name=company_name,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )

    # 2. Generate temporary password
    temp_password = generate_temp_password()
    hashed_pwd = hash_password(temp_password)

    # 3. Create User account
    role = payload.role.upper() if payload.role in ("ADMIN", "EMPLOYEE") else "EMPLOYEE"
    user = User.objects.create(
        employee_id=employee_id,
        email=payload.email,
        password_hash=hashed_pwd,
        role=role,
        is_verified=False,  # Forces password change on first login
    )

    # 4. Compute 6 salary components
    salary_breakdown = calculate_salary_components(payload.monthly_wage or 0.0)

    # Build full structured profile data
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

    # 5. Create Profile
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
    """
    Get detailed profile of a specific employee.
    Admins can view all tabs (Resume, Private Info, Salary Info).
    Regular employees cannot view other employees' salary info.
    """
    current_user: User = request.auth
    target_user = User.objects.select_related("profile").filter(id=user_id).first()

    if not target_user:
        return 404, {"error": "Employee not found"}

    p = getattr(target_user, "profile", None)
    salary_data = p.salary_structure if (p and isinstance(p.salary_structure, dict)) else {}

    # Privacy check: mask salary if regular employee is viewing another employee
    if not current_user.is_admin and current_user.id != target_user.id:
        salary_data = {
            k: v for k, v in salary_data.items()
            if k not in ("monthly_wage", "yearly_wage", "basic", "hra", "fixed_allowance", "pf_employee", "pf_employer", "professional_tax")
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
    """
    Update employee profile.
    Admins can update everything including salary.
    Employees can update their own personal info.
    """
    current_user: User = request.auth
    target_user = User.objects.select_related("profile").filter(id=user_id).first()

    if not target_user:
        return 404, {"error": "Employee not found"}

    # Authorization check
    if not current_user.is_admin and current_user.id != target_user.id:
        return 403, {"error": "You are not authorized to update another employee's profile"}

    profile, _ = Profile.objects.get_or_create(user=target_user)
    curr_salary = profile.salary_structure if isinstance(profile.salary_structure, dict) else {}

    # Basic profile updates
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

    # Extended info updates in JSONB
    extended_fields = [
        "department", "designation", "date_of_joining", "dob",
        "gender", "nationality", "marital_status", "personal_email",
        "bank_name", "account_number", "ifsc_code", "pan_number", "uan_number"
    ]
    for field in extended_fields:
        val = getattr(payload, field, None)
        if val is not None:
            curr_salary[field] = val

    # Salary update (Admin only)
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
# Leave Requests (Basic endpoints)
# ==========================================

@api.get("/leave-requests", auth=jwt_auth, response=List[LeaveRequestSchema], tags=["Leaves"])
def list_leave_requests(request):
    user: User = request.auth
    if user.is_admin:
        return LeaveRequest.objects.all().order_by("-created_at")
    return LeaveRequest.objects.filter(user=user).order_by("-created_at")


@api.post("/leave-requests", auth=jwt_auth, response={201: LeaveRequestSchema, 400: dict}, tags=["Leaves"])
def create_leave_request(request, payload: LeaveRequestIn):
    user: User = request.auth
    if payload.end_date < payload.start_date:
        return 400, {"error": "End date must be after or on start date"}

    leave = LeaveRequest.objects.create(
        user=user,
        leave_type=payload.leave_type,
        start_date=payload.start_date,
        end_date=payload.end_date,
        description=payload.description,
        status="PENDING",
    )
    return 201, leave

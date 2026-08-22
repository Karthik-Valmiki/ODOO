import re
from datetime import date, datetime
from typing import Optional, Dict, Any
from core.models import User, Attendance, LeaveRequest

def clean_alpha(text: str) -> str:
    """Strip all non-alphanumeric characters and uppercase."""
    return re.sub(r"[^A-Za-z0-9]", "", text or "").upper()


def generate_employee_id(company_name: str, first_name: str, last_name: str, year: Optional[int] = None) -> str:
    """
    Auto-generate Employee ID per Dayflow specification:
    Format: [CompanyPrefix][NameInitials][Year][Sequence]
    Example: ODROSH2026001
    """
    if not year:
        year = datetime.now().year

    # 1. Company Prefix: 2 characters (padded with X if needed)
    comp_clean = clean_alpha(company_name)
    if len(comp_clean) >= 2:
        comp_prefix = comp_clean[:2]
    elif len(comp_clean) == 1:
        comp_prefix = comp_clean + "X"
    else:
        comp_prefix = "DF"  # Dayflow default

    # 2. Name Initials: 2 of first_name + 2 of last_name
    fn_clean = clean_alpha(first_name)
    ln_clean = clean_alpha(last_name)

    if len(fn_clean) >= 2:
        fn_part = fn_clean[:2]
    elif len(fn_clean) == 1:
        fn_part = fn_clean + "X"
    else:
        fn_part = "XX"

    if len(ln_clean) >= 2:
        ln_part = ln_clean[:2]
    elif len(ln_clean) == 1:
        ln_part = ln_clean + "X"
    else:
        ln_part = "XX"

    name_initials = f"{fn_part}{ln_part}"

    # 3. Base prefix for query
    base_id = f"{comp_prefix}{name_initials}{year}"

    # 4. Find next available sequence for this company/year
    # Count all users with matching company prefix + year pattern
    pattern = f"^{comp_prefix}.*{year}(\\d+)$"
    existing_users = User.objects.filter(employee_id__startswith=comp_prefix, employee_id__contains=str(year))
    
    seq = 1
    # Try finding an unused sequence ID
    while True:
        candidate = f"{base_id}{seq:03d}"
        if not User.objects.filter(employee_id=candidate).exists():
            return candidate
        seq += 1


def resolve_employee_status_dot(user: User, check_date: Optional[date] = None) -> str:
    """
    Resolves the live status indicator dot for the employee card / dashboard:
    🟢 "GREEN"  = Checked in today / Present
    🔵 "BLUE"   = On approved leave today
    🟡 "YELLOW" = Absent (not checked in and not on leave)
    """
    if not check_date:
        check_date = date.today()

    # 1. Check attendance record for check_date
    attendance = Attendance.objects.filter(user=user, record_date=check_date).first()
    if attendance:
        if attendance.check_in and attendance.check_out is None:
            return "GREEN"
        if attendance.status in ("PRESENT", "HALF_DAY"):
            return "GREEN"
        if attendance.status == "LEAVE":
            return "BLUE"
        if attendance.status == "ABSENT":
            return "YELLOW"

    # 2. Check if user is on an approved leave covering check_date
    has_approved_leave = LeaveRequest.objects.filter(
        user=user,
        status="APPROVED",
        start_date__lte=check_date,
        end_date__gte=check_date,
    ).exists()

    if has_approved_leave:
        return "BLUE"

    return "YELLOW"


def calculate_salary_components(monthly_wage: float) -> Dict[str, Any]:
    """
    Calculate 6 salary components and statutory deductions based on Monthly Wage:
    - Basic: 50% of Monthly Wage
    - HRA: 50% of Basic (25% of Monthly Wage)
    - Standard Allowance: 4,167 fixed
    - Performance Allowance: 0 (default)
    - LTA: 0 (default)
    - Fixed Allowance: Residual (monthly_wage - sum of above)
    - PF Employee: 12% of Basic
    - PF Employer: 12% of Basic
    - Professional Tax: 200/month
    - Yearly Wage: monthly_wage * 12
    """
    wage = float(monthly_wage or 0.0)
    basic = round(wage * 0.50, 2)
    hra = round(basic * 0.50, 2)
    standard_allowance = 4167.0
    performance_allowance = 0.0
    lta = 0.0

    allocated = basic + hra + standard_allowance + performance_allowance + lta
    fixed_allowance = max(0.0, round(wage - allocated, 2))

    pf_employee = round(basic * 0.12, 2)
    pf_employer = round(basic * 0.12, 2)
    professional_tax = 200.0 if wage > 15000 else 0.0
    yearly_wage = round(wage * 12, 2)

    return {
        "monthly_wage": wage,
        "yearly_wage": yearly_wage,
        "basic": basic,
        "hra": hra,
        "standard_allowance": standard_allowance,
        "performance_allowance": performance_allowance,
        "lta": lta,
        "fixed_allowance": fixed_allowance,
        "pf_employee": pf_employee,
        "pf_employer": pf_employer,
        "professional_tax": professional_tax,
    }

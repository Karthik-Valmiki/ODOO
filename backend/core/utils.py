import re
import calendar
from datetime import date, datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from core.models import User, Profile, Attendance, LeaveRequest

def clean_alpha(text: str) -> str:
    """Strip all non-alphanumeric characters and uppercase."""
    return re.sub(r"[^A-Za-z0-9]", "", text or "").upper()


def generate_employee_id(company_name: str, first_name: str, last_name: str, year: Optional[int] = None) -> str:
    """
    Auto-generate Employee ID per WorkDesk specification:
    Format: [Comp Prefix][Initials][Year][000-Sequence]
    Example: WDROSH2026001
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
        comp_prefix = "WD"  # WorkDesk default

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
    seq = 1
    while True:
        candidate = f"{base_id}{seq:03d}"
        if not User.objects.filter(employee_id=candidate).exists():
            return candidate
        seq += 1


def calculate_work_hours(check_in: Optional[datetime], check_out: Optional[datetime]) -> Tuple[float, float, str]:
    """
    Calculate work hours, extra/overtime hours, and attendance status:
    - H_elapsed = (check_out - check_in) in hours
    - H_work    = min(H_elapsed, 8.0)
    - H_extra   = max(0.0, H_elapsed - 8.0)
    
    Status Resolution:
    - >= 7.5h  -> PRESENT
    - 4.0h - 7.5h -> HALF_DAY
    - < 4.0h   -> ABSENT
    """
    if not check_in:
        return 0.0, 0.0, "ABSENT"

    if not check_out:
        return 0.0, 0.0, "PRESENT"

    elapsed_seconds = (check_out - check_in).total_seconds()
    if elapsed_seconds < 0:
        elapsed_seconds = 0

    elapsed_hours = round(elapsed_seconds / 3600.0, 2)
    work_hours = min(elapsed_hours, 8.0)
    extra_hours = max(0.0, round(elapsed_hours - 8.0, 2))

    if elapsed_hours >= 7.5:
        status = "PRESENT"
    elif elapsed_hours >= 4.0:
        status = "HALF_DAY"
    else:
        status = "ABSENT"

    return work_hours, extra_hours, status


def auto_close_previous_attendances(user: User, current_date: Optional[date] = None) -> int:
    """
    Edge case handler: 'Forgot to check out'.
    Auto-close any open attendance records from prior dates.
    Sets check_out = check_in + 8 hours and status = 'PRESENT'.
    """
    if not current_date:
        current_date = date.today()

    open_records = Attendance.objects.filter(
        user=user,
        record_date__lt=current_date,
        check_out__isnull=True,
    )

    closed_count = 0
    for record in open_records:
        if record.check_in:
            record.check_out = record.check_in + timedelta(hours=8)
            record.status = "PRESENT"
            record.save(update_fields=["check_out", "status", "updated_at"])
            closed_count += 1

    return closed_count


def resolve_employee_status_dot(user: User, check_date: Optional[date] = None) -> str:
    """
    Resolves the live status indicator dot for the employee card / dashboard:
    🟢 "GREEN"  = Checked in today / Present
    🔵 "BLUE"   = On approved leave today
    🟡 "YELLOW" = Absent (not checked in and not on leave)
    """
    if not check_date:
        check_date = date.today()

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

    has_approved_leave = LeaveRequest.objects.filter(
        user=user,
        status="APPROVED",
        start_date__lte=check_date,
        end_date__gte=check_date,
    ).exists()

    if has_approved_leave:
        return "BLUE"

    return "YELLOW"


def calculate_salary_components(
    monthly_wage: float,
    performance_bonus_pct: float = 8.333,
    lta_pct: float = 8.333,
    working_days_per_week: int = 5,
    break_time_hours: float = 1.0,
    pf_rate: float = 12.0,
    prof_tax: float = 200.0,
) -> Dict[str, Any]:
    """
    Calculate 6 salary components and statutory deductions based on Monthly Wage
    matching the exact wireframe and 'Important' specification note:
    
    Components:
    - Basic Salary: 50% of Monthly Wage
    - House Rent Allowance (HRA): 50% of Basic (25% of Monthly Wage)
    - Standard Allowance: 4,167 fixed
    - Performance Bonus: 8.333% of Basic (or configurable %)
    - Leave Travel Allowance (LTA): 8.333% of Basic (or configurable %)
    - Fixed Allowance: Residual = Monthly Wage - Sum(all other 5 components)
    
    Contributions & Deductions:
    - PF Employee: 12% of Basic
    - PF Employer: 12% of Basic
    - Professional Tax: 200/month (if wage > 15,000)
    - Yearly Wage: Monthly Wage * 12
    """
    wage = float(monthly_wage or 0.0)
    basic = round(wage * 0.50, 2)
    hra = round(basic * 0.50, 2)
    standard_allowance = 4167.0
    performance_bonus = round(basic * (performance_bonus_pct / 100.0), 2)
    lta = round(basic * (lta_pct / 100.0), 2)

    allocated = basic + hra + standard_allowance + performance_bonus + lta
    fixed_allowance = max(0.0, round(wage - allocated, 2))

    pf_employee = round(basic * (pf_rate / 100.0), 2)
    pf_employer = round(basic * (pf_rate / 100.0), 2)
    professional_tax = prof_tax if wage > 15000 else 0.0
    yearly_wage = round(wage * 12, 2)

    return {
        "monthly_wage": wage,
        "yearly_wage": yearly_wage,
        "working_days_per_week": working_days_per_week,
        "break_time_hours": break_time_hours,
        "basic": basic,
        "basic_pct": 50.0,
        "hra": hra,
        "hra_pct": 25.0,  # 50% of Basic
        "standard_allowance": standard_allowance,
        "performance_bonus": performance_bonus,
        "performance_bonus_pct": performance_bonus_pct,
        "lta": lta,
        "lta_pct": lta_pct,
        "fixed_allowance": fixed_allowance,
        "pf_employee": pf_employee,
        "pf_employer": pf_employer,
        "pf_rate": pf_rate,
        "professional_tax": professional_tax,
    }


def compute_monthly_payroll(user: User, month: int, year: int) -> Dict[str, Any]:
    """
    Comprehensive attendance and leave driven monthly payroll computation engine:
    1. Determines total standard working days in the month (Monday to Friday).
    2. Gathers actual attendance (Present, Half Days, Approved Paid/Sick Leaves, Absences, Overtime).
    3. Calculates Payable Ratio.
    4. Computes itemized earned salary components, overtime pay, statutory deductions, and net payout.
    """
    profile = Profile.objects.filter(user=user).first()
    salary_data = profile.salary_structure if (profile and isinstance(profile.salary_structure, dict)) else {}
    
    monthly_wage = float(salary_data.get("monthly_wage", 0.0))
    if monthly_wage <= 0:
        # Fallback to standard recalculation if not explicitly saved
        monthly_wage = 50000.0

    # Ensure all 6 component values are available
    comp = calculate_salary_components(
        monthly_wage=monthly_wage,
        performance_bonus_pct=float(salary_data.get("performance_bonus_pct", 8.333)),
        lta_pct=float(salary_data.get("lta_pct", 8.333)),
        working_days_per_week=int(salary_data.get("working_days_per_week", 5)),
        break_time_hours=float(salary_data.get("break_time_hours", 1.0)),
        pf_rate=float(salary_data.get("pf_rate", 12.0)),
        prof_tax=float(salary_data.get("professional_tax", 200.0)),
    )

    # 1. Total business days in month (Mon-Fri)
    num_days = calendar.monthrange(year, month)[1]
    total_working_days = sum(1 for d in range(1, num_days + 1) if date(year, month, d).weekday() < 5)

    # 2. Query actual attendance in month
    attendance_records = Attendance.objects.filter(
        user=user,
        record_date__year=year,
        record_date__month=month,
    )

    present_count = 0
    half_day_count = 0
    leave_count = 0
    absent_count = 0
    total_overtime_hours = 0.0
    recorded_dates = set()

    for att in attendance_records:
        recorded_dates.add(att.record_date)
        if att.status == "PRESENT":
            present_count += 1
        elif att.status == "HALF_DAY":
            half_day_count += 1
        elif att.status == "LEAVE":
            leave_count += 1
        elif att.status == "ABSENT":
            absent_count += 1

        w_hrs, ot_hrs, _ = calculate_work_hours(att.check_in, att.check_out)
        total_overtime_hours += ot_hrs

    # 3. Check approved leaves in this month not already in attendance
    approved_leaves = LeaveRequest.objects.filter(
        user=user,
        status="APPROVED",
        start_date__lte=date(year, month, num_days),
        end_date__gte=date(year, month, 1),
    )
    for leave in approved_leaves:
        curr = max(leave.start_date, date(year, month, 1))
        end = min(leave.end_date, date(year, month, num_days))
        while curr <= end:
            if curr.weekday() < 5 and curr not in recorded_dates:
                leave_count += 1
                recorded_dates.add(curr)
            curr += timedelta(days=1)

    # Calculate remaining unrecorded working days as absent
    unrecorded_working_days = max(0, total_working_days - (present_count + half_day_count + leave_count + absent_count))
    total_absent_days = absent_count + unrecorded_working_days

    # 4. Payable Ratio
    # Days with pay = Present + Paid Leaves + 0.5 * Half Days
    paid_days = present_count + leave_count + (0.5 * half_day_count)
    if total_working_days > 0:
        payable_ratio = min(1.0, max(0.0, round(paid_days / total_working_days, 4)))
    else:
        payable_ratio = 1.0

    # 5. Overtime Earnings
    # Hourly rate = Monthly Wage / (Working Days * 8 hours)
    hourly_rate = round(monthly_wage / (total_working_days * 8.0), 2) if total_working_days > 0 else 0.0
    overtime_pay = round(total_overtime_hours * hourly_rate * 1.5, 2)

    # 6. Itemized Earned Salary Components
    earned_basic = round(comp["basic"] * payable_ratio, 2)
    earned_hra = round(comp["hra"] * payable_ratio, 2)
    earned_standard = round(comp["standard_allowance"] * payable_ratio, 2)
    earned_performance = round(comp["performance_bonus"] * payable_ratio, 2)
    earned_lta = round(comp["lta"] * payable_ratio, 2)
    earned_fixed = round(comp["fixed_allowance"] * payable_ratio, 2)

    gross_earnings = round(
        earned_basic + earned_hra + earned_standard + earned_performance + earned_lta + earned_fixed + overtime_pay,
        2,
    )

    # 7. Deductions
    pf_deduction = round(earned_basic * (comp["pf_rate"] / 100.0), 2)
    prof_tax_deduction = comp["professional_tax"] if (payable_ratio > 0 and monthly_wage > 15000) else 0.0
    total_deductions = round(pf_deduction + prof_tax_deduction, 2)

    # 8. Net Payout
    net_payout = max(0.0, round(gross_earnings - total_deductions, 2))

    return {
        "month": month,
        "year": year,
        "month_name": calendar.month_name[month],
        "user_id": user.id,
        "employee_id": user.employee_id,
        "employee_name": profile.full_name if profile else user.employee_id,
        "department": salary_data.get("department", "General"),
        "designation": salary_data.get("designation", "Employee"),
        "bank_name": salary_data.get("bank_name"),
        "account_number": salary_data.get("account_number"),
        "pan_number": salary_data.get("pan_number"),
        "uan_number": salary_data.get("uan_number"),
        "total_working_days": total_working_days,
        "present_days": present_count,
        "half_days": half_day_count,
        "leave_days": leave_count,
        "absent_days": total_absent_days,
        "paid_days": paid_days,
        "payable_ratio": payable_ratio,
        "overtime_hours": round(total_overtime_hours, 2),
        "hourly_rate": hourly_rate,
        "overtime_pay": overtime_pay,
        # Base Salary Structure
        "base_wage": monthly_wage,
        "base_basic": comp["basic"],
        "base_hra": comp["hra"],
        "base_standard_allowance": comp["standard_allowance"],
        "base_performance_bonus": comp["performance_bonus"],
        "base_lta": comp["lta"],
        "base_fixed_allowance": comp["fixed_allowance"],
        # Itemized Earned Earnings
        "earned_basic": earned_basic,
        "earned_hra": earned_hra,
        "earned_standard_allowance": earned_standard,
        "earned_performance_bonus": earned_performance,
        "earned_lta": earned_lta,
        "earned_fixed_allowance": earned_fixed,
        "gross_earnings": gross_earnings,
        # Deductions
        "pf_deduction": pf_deduction,
        "prof_tax_deduction": prof_tax_deduction,
        "total_deductions": total_deductions,
        # Net Payout
        "net_payout": net_payout,
    }

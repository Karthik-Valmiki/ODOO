import os
import sys
import django
from datetime import date, datetime, timezone

# Ensure utf-8 stdout
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Configure Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "dayflow.settings")
django.setup()

from django.test import Client
from core.models import User, Profile, Attendance, LeaveRequest

def run_tests():
    print("=" * 60)
    print("[*] Running Phase 3 (JWT Auth) & Phase 4 (Employees) End-to-End Tests")
    print("=" * 60)

    # Clear test data from previous runs if any
    User.objects.all().delete()
    print("[+] Cleaned test database.")

    client = Client()

    # ----------------------------------------------------
    # Test 1: DB Check
    # ----------------------------------------------------
    print("\n--- [Test 1] Health & DB Check ---")
    resp = client.get("/api/db-check")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.content}"
    data = resp.json()
    print(f"[SUCCESS] DB Check Passed: {data['message']}")

    # ----------------------------------------------------
    # Test 2: Admin Signup
    # ----------------------------------------------------
    print("\n--- [Test 2] Admin Signup ---")
    signup_payload = {
        "company_name": "Odoo Technologies",
        "company_logo_url": "https://example.com/odoo-logo.png",
        "first_name": "Karthik",
        "last_name": "Valmiki",
        "email": "admin@odoo.com",
        "phone": "+91 9988776655",
        "password": "AdminPassword@2026",
        "confirm_password": "AdminPassword@2026",
    }
    resp = client.post("/api/auth/signup", data=signup_payload, content_type="application/json")
    assert resp.status_code == 200, f"Admin signup failed: {resp.content}"
    signup_data = resp.json()
    admin_token = signup_data["access_token"]
    admin_refresh = signup_data["refresh_token"]
    admin_emp_id = signup_data["user"]["employee_id"]
    admin_user_id = signup_data["user"]["id"]
    print(f"[SUCCESS] Admin Signup Successful! Generated Employee ID: {admin_emp_id}")
    print(f"          Company: {signup_data['user']['company_name']}")
    assert admin_emp_id.startswith("OD"), f"Employee ID should start with OD, got {admin_emp_id}"
    assert signup_data["user"]["role"] == "ADMIN"
    assert signup_data["force_password_change"] is False

    # ----------------------------------------------------
    # Test 3: Sign In with Email & Sign In with Employee ID
    # ----------------------------------------------------
    print("\n--- [Test 3] Sign In via Email & Employee ID ---")
    # Email login
    resp = client.post(
        "/api/auth/login",
        data={"login_id_or_email": "admin@odoo.com", "password": "AdminPassword@2026"},
        content_type="application/json",
    )
    assert resp.status_code == 200, f"Email login failed: {resp.content}"
    print("[SUCCESS] Email login successful.")

    # Employee ID login
    resp = client.post(
        "/api/auth/login",
        data={"login_id_or_email": admin_emp_id, "password": "AdminPassword@2026"},
        content_type="application/json",
    )
    assert resp.status_code == 200, f"Employee ID login failed: {resp.content}"
    print(f"[SUCCESS] Employee ID ({admin_emp_id}) login successful.")

    # Invalid password check
    resp = client.post(
        "/api/auth/login",
        data={"login_id_or_email": admin_emp_id, "password": "WrongPassword"},
        content_type="application/json",
    )
    assert resp.status_code == 401, "Expected 401 for bad password"
    print("[SUCCESS] Invalid password correctly rejected with 401.")

    # ----------------------------------------------------
    # Test 4: Token Refresh
    # ----------------------------------------------------
    print("\n--- [Test 4] Token Refresh ---")
    resp = client.post(
        "/api/auth/refresh",
        data={"refresh_token": admin_refresh},
        content_type="application/json",
    )
    assert resp.status_code == 200, f"Refresh failed: {resp.content}"
    new_access = resp.json()["access_token"]
    assert new_access, "Did not receive new access token"
    print("[SUCCESS] Token refresh successful.")

    # ----------------------------------------------------
    # Test 5: Admin Onboards Employee 1 (Roshan Sharma)
    # ----------------------------------------------------
    print("\n--- [Test 5] Admin Onboards Employee 1 (Roshan Sharma) ---")
    emp1_payload = {
        "first_name": "Roshan",
        "last_name": "Sharma",
        "email": "roshan.sharma@odoo.com",
        "role": "EMPLOYEE",
        "phone": "+91 9123456780",
        "department": "Engineering",
        "designation": "Backend Engineer",
        "monthly_wage": 60000.0,
        "dob": "1996-05-12",
        "gender": "Male",
        "nationality": "Indian",
        "bank_name": "HDFC Bank",
        "account_number": "50100987654321",
    }
    admin_auth_header = {"HTTP_AUTHORIZATION": f"Bearer {admin_token}"}
    resp = client.post(
        "/api/employees",
        data=emp1_payload,
        content_type="application/json",
        **admin_auth_header,
    )
    assert resp.status_code == 201, f"Employee creation failed: {resp.content}"
    emp1_data = resp.json()
    emp1_id = emp1_data["employee_id"]
    emp1_temp_pass = emp1_data["temporary_password"]
    emp1_uuid = emp1_data["user_id"]
    print(f"[SUCCESS] Employee 1 Created!")
    print(f"          Generated ID: {emp1_id}")
    print(f"          Temporary Password: {emp1_temp_pass}")
    assert emp1_id.startswith("ODROSH2026"), f"Expected ODROSH2026..., got {emp1_id}"

    # Verify salary breakdown auto-calculated
    emp1_profile = Profile.objects.get(user_id=emp1_uuid)
    sal = emp1_profile.salary_structure
    print(f"          Auto-calculated Salary Components for Rs. 60,000/mo:")
    print(f"          - Basic (50%): Rs. {sal['basic']}")
    print(f"          - HRA (50% of Basic): Rs. {sal['hra']}")
    print(f"          - Standard Allowance: Rs. {sal['standard_allowance']}")
    print(f"          - Fixed Allowance (Residual): Rs. {sal['fixed_allowance']}")
    print(f"          - PF (Employee 12%): Rs. {sal['pf_employee']}")
    print(f"          - Professional Tax: Rs. {sal['professional_tax']}")
    print(f"          - Yearly Wage: Rs. {sal['yearly_wage']}")
    assert sal["basic"] == 30000.0
    assert sal["hra"] == 15000.0
    assert sal["standard_allowance"] == 4167.0
    assert sal["pf_employee"] == 3600.0
    assert sal["yearly_wage"] == 720000.0

    # ----------------------------------------------------
    # Test 6: Admin Onboards Employee 2 (Sequence Counter Test)
    # ----------------------------------------------------
    print("\n--- [Test 6] Sequence Counter Test (Employee 2) ---")
    emp2_payload = {
        "first_name": "Rohan",
        "last_name": "Shukla",
        "email": "rohan.shukla@odoo.com",
        "role": "EMPLOYEE",
        "monthly_wage": 75000.0,
    }
    resp = client.post(
        "/api/employees",
        data=emp2_payload,
        content_type="application/json",
        **admin_auth_header,
    )
    assert resp.status_code == 201, f"Employee 2 creation failed: {resp.content}"
    emp2_id = resp.json()["employee_id"]
    print(f"[SUCCESS] Employee 2 Generated ID: {emp2_id}")
    assert emp2_id.startswith("ODROSH2026"), f"Expected ODROSH2026..., got {emp2_id}"
    assert emp2_id != emp1_id, "Sequence IDs should be distinct"

    # ----------------------------------------------------
    # Test 7: Employee First Login (Force Password Change)
    # ----------------------------------------------------
    print("\n--- [Test 7] Employee 1 First Login & Force Password Change ---")
    resp = client.post(
        "/api/auth/login",
        data={"login_id_or_email": emp1_id, "password": emp1_temp_pass},
        content_type="application/json",
    )
    assert resp.status_code == 200, f"Employee temp login failed: {resp.content}"
    emp1_login_data = resp.json()
    emp1_token = emp1_login_data["access_token"]
    assert emp1_login_data["force_password_change"] is True, "force_password_change must be TRUE for temp password"
    print("[SUCCESS] Employee 1 logged in with temp password -> force_password_change is TRUE.")

    # Execute force password change
    emp1_auth_header = {"HTTP_AUTHORIZATION": f"Bearer {emp1_token}"}
    resp = client.post(
        "/api/auth/force-change-password",
        data={"new_password": "NewRoshanPass@2026", "confirm_password": "NewRoshanPass@2026"},
        content_type="application/json",
        **emp1_auth_header,
    )
    assert resp.status_code == 200, f"Force change password failed: {resp.content}"
    print("[SUCCESS] Employee 1 successfully updated password via force-change-password.")

    # Verify subsequent login has force_password_change == False
    resp = client.post(
        "/api/auth/login",
        data={"login_id_or_email": emp1_id, "password": "NewRoshanPass@2026"},
        content_type="application/json",
    )
    assert resp.status_code == 200
    assert resp.json()["force_password_change"] is False, "force_password_change should now be FALSE"
    print("[SUCCESS] Employee 1 logged in with permanent password -> force_password_change is FALSE.")

    # ----------------------------------------------------
    # Test 8: Security & Role Permissions
    # ----------------------------------------------------
    print("\n--- [Test 8] Security & Role Restrictions ---")
    # Regular employee trying to create an employee -> 403 Forbidden
    resp = client.post(
        "/api/employees",
        data={"first_name": "Hacker", "last_name": "Guy", "email": "hacker@test.com"},
        content_type="application/json",
        **emp1_auth_header,
    )
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
    print("[SUCCESS] Regular employee blocked from creating employees (403 Forbidden).")

    # Regular employee trying to delete user -> 403 Forbidden
    resp = client.delete(f"/api/employees/{admin_user_id}", **emp1_auth_header)
    assert resp.status_code == 403, f"Expected 403 Forbidden, got {resp.status_code}"
    print("[SUCCESS] Regular employee blocked from deleting users (403 Forbidden).")

    # ----------------------------------------------------
    # Test 9: Employee List & Live Status Dot Resolution
    # ----------------------------------------------------
    print("\n--- [Test 9] Live Status Dot Resolution (GREEN / BLUE / YELLOW) ---")
    today = date.today()
    
    # Check default status dot (should be YELLOW since no attendance recorded yet)
    resp = client.get("/api/employees", **admin_auth_header)
    assert resp.status_code == 200
    emps = resp.json()
    emp1_card = next(e for e in emps if e["employee_id"] == emp1_id)
    assert emp1_card["status_dot"] == "YELLOW", f"Expected YELLOW, got {emp1_card['status_dot']}"
    print("[SUCCESS] Status dot is YELLOW (Absent / Not checked in) before punching in.")

    # Simulate Punch In for Roshan Sharma (Attendance record with check_in)
    emp1_user = User.objects.get(id=emp1_uuid)
    Attendance.objects.create(
        user=emp1_user,
        record_date=today,
        check_in=datetime.now(timezone.utc),
        status="PRESENT",
    )
    
    # Check status dot after punching in -> should be GREEN
    resp = client.get("/api/employees", **admin_auth_header)
    emps = resp.json()
    emp1_card = next(e for e in emps if e["employee_id"] == emp1_id)
    assert emp1_card["status_dot"] == "GREEN", f"Expected GREEN, got {emp1_card['status_dot']}"
    print("[SUCCESS] Status dot dynamically updated to GREEN after punch-in!")

    # ----------------------------------------------------
    # Test 10: Company Stats Endpoint
    # ----------------------------------------------------
    print("\n--- [Test 10] Company Dashboard Stats ---")
    resp = client.get("/api/company/stats", **admin_auth_header)
    assert resp.status_code == 200
    stats = resp.json()
    print(f"[SUCCESS] Company Stats: {stats}")
    assert stats["total_employees"] == 3
    assert stats["present_count"] >= 1  # Roshan is punched in

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL PHASE 3 & PHASE 4 TESTS PASSED FLAWLESSLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

# Odoo System Requirements

A simple overview of the system features, user roles, and core tools for the platform.

## User Roles & Authorization

* **Employee:** 
  * Access restricted to personal data.
  * Can read and write personal information.
* **Admin / HR Officer:** 
  * Full write privileges.
  * Full approval privileges across the system.

## Authentication & Dashboard Routing

* **Sign-Up:** Register using Employee ID, Email, Password, and Role selection with email verification.
* **Sign-In:** Secure login that routes users directly to their specific dashboard.
* **Employee Dashboard:** Direct access to personal profile, attendance records, leave requests, and activity alerts.
* **Admin/HR Dashboard:** Consolidated view to manage employee lists, global attendance records, and pending leaves.

## Core Domains

### Profile Management
* **Employees:** Update basic details like address, phone number, and photo.
* **Admins:** Full CRUD (Create, Read, Update, Delete) capabilities for all profile fields, documents, and salary structures.

### Attendance
* Supports daily and weekly views.
* Explicit status tracking: *Present*, *Absent*, *Half-day*, and *Leave*.
* Direct check-in and check-out functionality.

### Leave Engine
* Request workflow for tracking time off.
* Status tracking states: *Pending*, *Approved*, and *Rejected*.
* Real-time state synchronization immediately upon Admin action.

### Payroll
* **Employees:** Read-only access to personal pay stubs.
* **Admins:** Complete control over salary structures and payroll overrides.

## Future Enhancements

* Automated email and system notification triggers.
* Analytics module for generating deep payslips and attendance reports.

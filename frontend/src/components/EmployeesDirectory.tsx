import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  DollarSign,
  Shield,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Folder,
} from "lucide-react";
import type { Employee, UserBasic } from "../types";
import { apiClient } from "../api/client";

interface EmployeesDirectoryProps {
  currentUser: UserBasic | null;
}

export const EmployeesDirectory: React.FC<EmployeesDirectoryProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "private" | "salary" | "security">("resume");

  // Onboard Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDept, setNewDept] = useState("Engineering");
  const [newDesignation, setNewDesignation] = useState("Software Engineer");
  const [newWage, setNewWage] = useState(50000);
  const [createdResult, setCreatedResult] = useState<any>(null);

  // Salary Edit State (Admin Only)
  const [salaryStructure, setSalaryStructure] = useState<any>(null);
  const [editWage, setEditWage] = useState<number>(50000);
  const [savingSalary, setSavingSalary] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await apiClient.get("/employees");
      setEmployees(res.data);
    } catch (err) {
      console.error("Failed to load employees:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Fetch salary structure when opening salary tab
  useEffect(() => {
    if (selectedEmployee && activeTab === "salary" && currentUser?.role === "ADMIN") {
      apiClient
        .get(`/salary/structure/${selectedEmployee.id}`)
        .then((res) => {
          setSalaryStructure(res.data);
          setEditWage(res.data.monthly_wage);
        })
        .catch((err) => console.error("Failed to fetch salary structure:", err));
    }
  }, [selectedEmployee, activeTab, currentUser]);

  const handleUpdateSalary = async () => {
    if (!selectedEmployee) return;
    try {
      setSavingSalary(true);
      const res = await apiClient.put(`/salary/structure/${selectedEmployee.id}`, {
        monthly_wage: editWage,
      });
      setSalaryStructure(res.data);
      alert("Salary structure updated successfully!");
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update salary");
    } finally {
      setSavingSalary(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/employees", {
        first_name: newFirstName,
        last_name: newLastName,
        email: newEmail,
        department: newDept,
        designation: newDesignation,
        monthly_wage: newWage,
      });
      setCreatedResult(res.data);
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to onboard employee");
    }
  };

  // Grouping by department
  const departments = Array.from(
    new Set(
      employees.map((e) => e.salary_structure?.department || "General")
    )
  );

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    const empDept = emp.salary_structure?.department || "General";
    const matchesDept = selectedDept === "ALL" || empDept === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Employees Directory</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage workforce, profiles, and salary structures</p>
        </div>

        {currentUser?.role === "ADMIN" && (
          <button
            onClick={() => {
              setCreatedResult(null);
              setShowOnboardModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2F65F6] hover:bg-[#2555D8] rounded-xl shadow-xs transition-colors"
          >
            <Plus size={16} />
            Onboard Employee
          </button>
        )}
      </div>

      {/* Main Split Layout: Department Folders + Employee Cards */}
      <div className="flex flex-1 overflow-hidden p-8 gap-8">
        {/* Left: Department Hierarchical Folders */}
        <div className="w-[260px] flex flex-col gap-3 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs h-fit">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Departments</span>

          <button
            onClick={() => setSelectedDept("ALL")}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              selectedDept === "ALL"
                ? "bg-[#2F65F6] text-white shadow-xs"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Users size={16} />
              <span>All Employees</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${selectedDept === "ALL" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
              {employees.length}
            </span>
          </button>

          {departments.map((dept) => {
            const count = employees.filter(
              (e) => (e.salary_structure?.department || "General") === dept
            ).length;
            const isSelected = selectedDept === dept;

            return (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-[#2F65F6] text-white shadow-xs"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Folder size={16} />
                  <span className="truncate">{dept}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] flex-shrink-0 ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Search & Cards Grid */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, employee ID, or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => {
              const dotColor =
                emp.status_dot === "GREEN"
                  ? "bg-emerald-500"
                  : emp.status_dot === "BLUE"
                  ? "bg-blue-500"
                  : "bg-amber-400";

              const dept = emp.salary_structure?.department || "General";
              const designation = emp.salary_structure?.designation || "Employee";

              return (
                <div
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee(emp);
                    setActiveTab("resume");
                  }}
                  className="bg-white border border-gray-200/80 hover:border-blue-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-xl shadow-xs">
                          {emp.profile_picture_url ? (
                            <img
                              src={emp.profile_picture_url}
                              alt={emp.full_name}
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            "🎃"
                          )}
                        </div>
                        {/* Live Status Indicator Dot */}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${dotColor}`}
                          title={`Status: ${emp.status_dot}`}
                        />
                      </div>

                      <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {emp.full_name}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium">{designation}</p>
                        <span className="text-[11px] font-mono text-gray-400">{emp.employee_id}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-semibold">
                      {dept}
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-3 flex flex-col gap-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-gray-400" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabbed Employee Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header with Profile Info */}
            <div className="p-6 bg-[#F8F9FA] border-b border-gray-200 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-2xl shadow-xs">
                  🎃
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedEmployee.full_name}</h2>
                  <p className="text-xs text-gray-500 font-medium">
                    {selectedEmployee.salary_structure?.designation || "Employee"} •{" "}
                    <span className="font-mono text-blue-600">{selectedEmployee.employee_id}</span>
                  </p>
                  <p className="text-xs text-gray-400">{selectedEmployee.email}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-gray-200 px-6 gap-6 bg-white">
              {[
                { id: "resume", label: "Resume / Job", icon: Briefcase },
                { id: "private", label: "Private Info", icon: FileText },
                { id: "salary", label: "Salary Info (Admin)", icon: DollarSign },
                { id: "security", label: "Security", icon: Shield },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-3.5 text-xs font-semibold border-b-2 transition-all ${
                      isActive
                        ? "border-[#2F65F6] text-[#2F65F6]"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              {/* Tab 1: Resume */}
              {activeTab === "resume" && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Department</span>
                    <span className="font-bold text-gray-900">
                      {selectedEmployee.salary_structure?.department || "Engineering"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Designation</span>
                    <span className="font-bold text-gray-900">
                      {selectedEmployee.salary_structure?.designation || "Developer"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Date of Joining</span>
                    <span className="font-bold text-gray-900">
                      {selectedEmployee.salary_structure?.date_of_joining || "2026-01-15"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Account Status</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Active / Verified
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Private Info */}
              {activeTab === "private" && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Bank Name</span>
                    <span className="font-bold text-gray-900">
                      {selectedEmployee.salary_structure?.bank_name || "HDFC Bank"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">Account Number</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {selectedEmployee.salary_structure?.account_number || "50100234567890"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">PAN Number</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {selectedEmployee.salary_structure?.pan_number || "ABCDE1234F"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-1">
                    <span className="text-gray-400 font-medium">UAN Number</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {selectedEmployee.salary_structure?.uan_number || "100900800700"}
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 3: Salary Info (Admin-Only Wireframe Structure) */}
              {activeTab === "salary" && (
                <div className="flex flex-col gap-4">
                  {currentUser?.role !== "ADMIN" ? (
                    <div className="p-6 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3 text-xs font-semibold">
                      <AlertCircle size={18} />
                      Salary configuration is restricted to Administrators only.
                    </div>
                  ) : salaryStructure ? (
                    <div className="flex flex-col gap-4">
                      {/* Wage Setup Row */}
                      <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-blue-950">Monthly Wage</p>
                          <p className="text-[11px] text-blue-700">Wage Type: Fixed Wage (5 days/week, 1 hr break)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editWage}
                            onChange={(e) => setEditWage(parseFloat(e.target.value) || 0)}
                            className="w-32 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-sm font-bold text-blue-900"
                          />
                          <button
                            onClick={handleUpdateSalary}
                            disabled={savingSalary}
                            className="px-3.5 py-1.5 bg-[#2F65F6] text-white text-xs font-semibold rounded-xl hover:bg-[#2555D8]"
                          >
                            {savingSalary ? "Updating..." : "Recalculate"}
                          </button>
                        </div>
                      </div>

                      {/* 6 Components Breakdown Matrix */}
                      <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs">
                        <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-700 flex justify-between">
                          <span>Salary Component</span>
                          <span>Monthly Amount (₹)</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">1. Basic Salary (50.00%)</span>
                          <span className="font-bold text-gray-900">₹{salaryStructure.basic?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">2. House Rent Allowance (HRA - 50% of Basic)</span>
                          <span className="font-bold text-gray-900">₹{salaryStructure.hra?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">3. Standard Allowance</span>
                          <span className="font-bold text-gray-900">₹{salaryStructure.standard_allowance?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">4. Performance Bonus (8.333% of Basic)</span>
                          <span className="font-bold text-gray-900">₹{salaryStructure.performance_bonus?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">5. Leave Travel Allowance (LTA - 8.333% of Basic)</span>
                          <span className="font-bold text-gray-900">₹{salaryStructure.lta?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between bg-blue-50/30">
                          <span className="text-gray-700 font-semibold">6. Fixed Allowance (Residual)</span>
                          <span className="font-bold text-blue-600">₹{salaryStructure.fixed_allowance?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 bg-gray-50 flex justify-between font-bold text-gray-900">
                          <span>Total Monthly Wage</span>
                          <span>₹{salaryStructure.monthly_wage?.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Statutory Deductions */}
                      <div className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-2 text-xs">
                        <span className="font-bold text-gray-800">Statutory Deductions & Contributions</span>
                        <div className="grid grid-cols-3 gap-2 text-gray-600">
                          <div>PF Employee: <b className="text-gray-900">₹{salaryStructure.pf_employee}</b></div>
                          <div>PF Employer: <b className="text-gray-900">₹{salaryStructure.pf_employer}</b></div>
                          <div>Prof. Tax: <b className="text-gray-900">₹{salaryStructure.professional_tax}</b></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Loading salary information...</div>
                  )}
                </div>
              )}

              {/* Tab 4: Security */}
              {activeTab === "security" && (
                <div className="p-6 bg-gray-50 rounded-2xl flex flex-col gap-3 text-xs">
                  <span className="font-bold text-gray-900">Account Access & Security</span>
                  <p className="text-gray-500">
                    Employee can log in using either their registered email (<code>{selectedEmployee.email}</code>) or auto-generated Employee ID (<code>{selectedEmployee.employee_id}</code>).
                  </p>
                  <button className="w-fit px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors">
                    Trigger Password Reset
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Onboard New Employee</h3>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {createdResult ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 size={18} /> Employee Created Successfully!
                </div>
                <div className="flex flex-col gap-1 text-emerald-900">
                  <div>Employee ID: <b className="font-mono">{createdResult.employee_id}</b></div>
                  <div>Temporary Password: <b className="font-mono bg-white px-2 py-0.5 rounded border">{createdResult.temporary_password}</b></div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    The employee will be prompted to change their password upon their first login.
                  </p>
                </div>
                <button
                  onClick={() => setShowOnboardModal(false)}
                  className="mt-2 w-full py-2 bg-[#2F65F6] text-white font-semibold rounded-xl text-center"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateEmployee} className="flex flex-col gap-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">First Name</label>
                    <input
                      type="text"
                      value={newFirstName}
                      onChange={(e) => setNewFirstName(e.target.value)}
                      required
                      placeholder="e.g. Roshan"
                      className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={newLastName}
                      onChange={(e) => setNewLastName(e.target.value)}
                      required
                      placeholder="e.g. Sharma"
                      className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    placeholder="e.g. roshan@odoo.com"
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Department</label>
                    <input
                      type="text"
                      value={newDept}
                      onChange={(e) => setNewDept(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Designation</label>
                    <input
                      type="text"
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Monthly Starting Wage (₹)</label>
                  <input
                    type="number"
                    value={newWage}
                    onChange={(e) => setNewWage(parseFloat(e.target.value) || 0)}
                    required
                    className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
                    className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-semibold text-white bg-[#2F65F6] hover:bg-[#2555D8] rounded-xl shadow-xs"
                  >
                    Generate ID & Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Briefcase,
  FileText,
  DollarSign,
  Shield,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { Employee, UserBasic } from "../types";
import { apiClient } from "../api/client";

interface EmployeesViewProps {
  currentUser: UserBasic | null;
  selectedUserForModal?: Employee | null;
  onCloseModal?: () => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({
  currentUser,
  selectedUserForModal,
  onCloseModal,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<"resume" | "private" | "salary" | "security">("resume");

  // Onboard Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [designation, setDesignation] = useState("Developer");
  const [monthlyWage, setMonthlyWage] = useState(50000);
  const [onboardResult, setOnboardResult] = useState<any>(null);

  // Salary Edit State (Admin Only)
  const [salaryData, setSalaryData] = useState<any>(null);
  const [editMonthlyWage, setEditMonthlyWage] = useState<number>(50000);
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

  useEffect(() => {
    if (selectedUserForModal) {
      setActiveEmployee(selectedUserForModal);
      setActiveTab("resume");
    }
  }, [selectedUserForModal]);

  // Load salary structure for target employee
  useEffect(() => {
    if (activeEmployee && activeTab === "salary" && currentUser?.role === "ADMIN") {
      apiClient
        .get(`/salary/structure/${activeEmployee.id}`)
        .then((res) => {
          setSalaryData(res.data);
          setEditMonthlyWage(res.data.monthly_wage);
        })
        .catch((err) => console.error("Failed to fetch salary data:", err));
    }
  }, [activeEmployee, activeTab, currentUser]);

  const handleUpdateSalary = async () => {
    if (!activeEmployee) return;
    try {
      setSavingSalary(true);
      const res = await apiClient.put(`/salary/structure/${activeEmployee.id}`, {
        monthly_wage: editMonthlyWage,
      });
      setSalaryData(res.data);
      alert("Salary structure updated successfully!");
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update salary");
    } finally {
      setSavingSalary(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiClient.post("/employees", {
        first_name: firstName,
        last_name: lastName,
        email,
        department,
        designation,
        monthly_wage: monthlyWage,
      });
      setOnboardResult(res.data);
      fetchEmployees();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to onboard employee");
    }
  };

  const departments = Array.from(
    new Set(employees.map((e) => e.salary_structure?.department || "General"))
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

  const getAvatarBg = (index: number) => {
    const colors = ["bg-[#E8F5E9] text-[#2E7D32]", "bg-[#FFF3E0] text-[#E65100]", "bg-[#F3E5F5] text-[#7B1FA2]", "bg-[#E1F5FE] text-[#0277BD]"];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col flex-1 bg-[#F5F5F5] text-gray-800 min-h-[calc(100vh-56px)] px-6 py-5 gap-4">
      {/* Top Search & Actions Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 w-full">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name or ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F65F6] shadow-xs"
          />
        </div>

        {/* Department Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedDept("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedDept === "ALL"
                ? "bg-gray-900 text-white shadow-xs"
                : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
            }`}
          >
            All ({employees.length})
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDept === dept
                  ? "bg-gray-900 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {currentUser?.role === "ADMIN" && (
          <button
            onClick={() => {
              setOnboardResult(null);
              setShowOnboardModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2F65F6] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all flex-shrink-0"
          >
            <Plus size={16} /> Onboard Employee
          </button>
        )}
      </div>

      {/* Status Dot Legend */}
      <div className="w-full flex items-center gap-5 text-xs text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-xl">
        <span className="font-semibold text-gray-600">Status:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>On Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Absent</span>
        </div>
      </div>

      {/* Employee Cards Grid — 3 columns matching wireframe */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
        {filteredEmployees.map((emp, idx) => {
          const dotColor =
            emp.status_dot === "GREEN"
              ? "bg-[#10B981]"
              : emp.status_dot === "BLUE"
              ? "bg-[#3B82F6]"
              : "bg-[#F59E0B]";

          const designation = emp.salary_structure?.designation || "Developer";
          const dept = emp.salary_structure?.department || "Engineering";

          return (
            <div
              key={emp.id}
              onClick={() => {
                setActiveEmployee(emp);
                setActiveTab("resume");
              }}
              className="relative bg-white border border-gray-200 hover:border-[#2F65F6] hover:shadow-md rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col items-center justify-between text-center group aspect-square"
            >
              {/* Real-time Status Dot in Top-Right Corner */}
              <div
                className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white`}
                title={`Live Status: ${emp.status_dot}`}
              />

              {/* Profile Avatar */}
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold mt-1 ${getAvatarBg(idx)}`}>
                {emp.profile_picture_url ? (
                  <img
                    src={emp.profile_picture_url}
                    alt={emp.full_name}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  <span>{emp.full_name.charAt(0)}</span>
                )}
              </div>

              {/* Employee Information */}
              <div className="flex flex-col items-center gap-0.5 w-full">
                <h3 className="font-bold text-sm text-gray-900 group-hover:text-[#2F65F6] transition-colors truncate max-w-full">
                  {emp.full_name}
                </h3>
                <p className="text-[11px] text-gray-500">{designation}</p>
                <span className="text-[10px] font-mono text-[#2F65F6] bg-blue-50 px-2 py-0.5 rounded-md mt-0.5 border border-blue-100 font-semibold">
                  {emp.employee_id}
                </span>
              </div>

              <div className="w-full border-t border-gray-100 pt-2 flex items-center justify-between text-[10px] text-gray-400">
                <span className="truncate max-w-[60%]">{emp.email}</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-semibold">
                  {dept}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabbed Employee Profile Modal */}
      {activeEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header Banner */}
            <div className="p-6 bg-gray-50 border-b border-gray-200 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#E1F5FE] text-[#0277BD] border border-blue-100 flex items-center justify-center text-2xl font-bold shadow-xs">
                  {activeEmployee.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{activeEmployee.full_name}</h2>
                  <p className="text-xs text-gray-600 font-medium mt-0.5">
                    {activeEmployee.salary_structure?.designation || "Employee"} •{" "}
                    <span className="font-mono font-bold text-[#2F65F6]">{activeEmployee.employee_id}</span>
                  </p>
                  <p className="text-xs text-gray-500">{activeEmployee.email}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveEmployee(null);
                  if (onCloseModal) onCloseModal();
                }}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-200/60 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Wireframe Tabs Navigation */}
            <div className="flex items-center border-b border-gray-200 px-6 gap-6 bg-white">
              {[
                { id: "resume", label: "Resume", icon: Briefcase },
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
                        ? "border-[#2F65F6] text-[#2F65F6] font-bold"
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
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 text-xs">
              {/* Tab 1: Resume */}
              {activeTab === "resume" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">Department</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {activeEmployee.salary_structure?.department || "Engineering"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">Job Position</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {activeEmployee.salary_structure?.designation || "Developer"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">Date of Joining</span>
                    <span className="font-bold text-gray-900 text-sm">
                      {activeEmployee.salary_structure?.date_of_joining || "2026-01-15"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">Account Status</span>
                    <span className="font-bold text-emerald-600 text-sm flex items-center gap-1.5">
                      <CheckCircle2 size={16} /> Verified & Active
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 2: Private Info */}
              {activeTab === "private" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">Bank Name</span>
                    <span className="font-bold text-gray-900">
                      {activeEmployee.salary_structure?.bank_name || "HDFC Bank"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">Account Number</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {activeEmployee.salary_structure?.account_number || "50100234567890"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">PAN Number</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {activeEmployee.salary_structure?.pan_number || "ABCDE1234F"}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col gap-1">
                    <span className="text-gray-500 font-medium">UAN Number</span>
                    <span className="font-bold text-gray-900 font-mono">
                      {activeEmployee.salary_structure?.uan_number || "100900800700"}
                    </span>
                  </div>
                </div>
              )}

              {/* Tab 3: Salary Info (Admin-Only Wireframe Structure) */}
              {activeTab === "salary" && (
                <div className="flex flex-col gap-4">
                  {currentUser?.role !== "ADMIN" ? (
                    <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
                      <AlertCircle size={20} />
                      Salary configuration is restricted to Administrators only.
                    </div>
                  ) : salaryData ? (
                    <div className="flex flex-col gap-4">
                      {/* Wage Setup Row */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">Monthly Wage Setup</p>
                          <p className="text-[11px] text-gray-500">
                            Fixed Wage • 5 working days/week, 1 hr break time
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editMonthlyWage}
                            onChange={(e) => setEditMonthlyWage(parseFloat(e.target.value) || 0)}
                            className="w-32 px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                          />
                          <button
                            onClick={handleUpdateSalary}
                            disabled={savingSalary}
                            className="px-4 py-1.5 bg-[#2F65F6] hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                          >
                            {savingSalary ? "Updating..." : "Recalculate"}
                          </button>
                        </div>
                      </div>

                      {/* 6 Components Breakdown Matrix */}
                      <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-200 bg-white">
                        <div className="bg-gray-50 px-4 py-2.5 font-bold text-gray-700 flex justify-between">
                          <span>Salary Component</span>
                          <span>Monthly Amount</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">1. Basic Salary (50.00% of Monthly Wage)</span>
                          <span className="font-bold text-gray-900">₹{salaryData.basic?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">2. House Rent Allowance (HRA - 50.00% of Basic)</span>
                          <span className="font-bold text-gray-900">₹{salaryData.hra?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">3. Standard Allowance</span>
                          <span className="font-bold text-gray-900">₹{salaryData.standard_allowance?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">4. Performance Bonus (8.333% of Basic)</span>
                          <span className="font-bold text-gray-900">₹{salaryData.performance_bonus?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between">
                          <span className="text-gray-600">5. Leave Travel Allowance (LTA - 8.333% of Basic)</span>
                          <span className="font-bold text-gray-900">₹{salaryData.lta?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 flex justify-between bg-blue-50/50">
                          <span className="text-[#2F65F6] font-semibold">6. Fixed Allowance (Residual)</span>
                          <span className="font-bold text-[#2F65F6]">₹{salaryData.fixed_allowance?.toLocaleString()}</span>
                        </div>
                        <div className="px-4 py-2.5 bg-gray-50 flex justify-between font-bold text-gray-900">
                          <span>Total Monthly Wage</span>
                          <span>₹{salaryData.monthly_wage?.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Statutory Contributions */}
                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col gap-2">
                        <span className="font-bold text-gray-800">Statutory Deductions & Contributions</span>
                        <div className="grid grid-cols-3 gap-3 text-gray-600">
                          <div>PF Employee (12%): <b className="text-gray-900">₹{salaryData.pf_employee}</b></div>
                          <div>PF Employer (12%): <b className="text-gray-900">₹{salaryData.pf_employer}</b></div>
                          <div>Professional Tax: <b className="text-gray-900">₹{salaryData.professional_tax}</b></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 py-4">Loading salary data...</div>
                  )}
                </div>
              )}

              {/* Tab 4: Security */}
              {activeTab === "security" && (
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl flex flex-col gap-3">
                  <span className="font-bold text-gray-900">Security & Access Management</span>
                  <p className="text-gray-600">
                    Employee can log in using either their email (<code>{activeEmployee.email}</code>) or auto-generated Employee ID (<code>{activeEmployee.employee_id}</code>).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Onboard Employee Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Onboard New Employee</h3>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {onboardResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 size={18} /> Employee Created Successfully!
                </div>
                <div className="flex flex-col gap-1.5 text-gray-800">
                  <div>Employee ID: <b className="font-mono text-[#2F65F6]">{onboardResult.employee_id}</b></div>
                  <div>Temporary Password: <b className="font-mono bg-white px-2 py-0.5 rounded border border-gray-300">{onboardResult.temporary_password}</b></div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    The employee will be prompted to set a new password on their first login.
                  </p>
                </div>
                <button
                  onClick={() => setShowOnboardModal(false)}
                  className="mt-2 w-full py-2 bg-[#2F65F6] text-white font-bold rounded-xl text-center"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleOnboardSubmit} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder="e.g. Roshan"
                      className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder="e.g. Sharma"
                      className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="e.g. roshan@odoo.com"
                    className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-gray-700">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Monthly Wage (₹)</label>
                  <input
                    type="number"
                    value={monthlyWage}
                    onChange={(e) => setMonthlyWage(parseFloat(e.target.value) || 0)}
                    required
                    className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 font-bold focus:ring-2 focus:ring-[#2F65F6]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
                    className="px-4 py-2 font-medium text-gray-500 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-[#2F65F6] hover:bg-blue-700 rounded-xl shadow-xs"
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

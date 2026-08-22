import React, { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import type { Payslip, UserBasic } from "../types";
import { apiClient } from "../api/client";

interface PayrollViewProps {
  currentUser: UserBasic | null;
}

export const PayrollView: React.FC<PayrollViewProps> = ({ currentUser }) => {
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [companySummary, setCompanySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayroll = async () => {
    try {
      setLoading(true);
      if (currentUser?.role === "ADMIN") {
        const res = await apiClient.get(`/payroll/company-summary?month=${month}&year=${year}`);
        setCompanySummary(res.data);
        if (res.data.payslips?.length > 0) {
          setPayslip(res.data.payslips[0]);
        }
      } else {
        const res = await apiClient.get(`/payroll/payslip?month=${month}&year=${year}`);
        setPayslip(res.data);
      }
    } catch (err) {
      console.error("Failed to load payroll:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month, year, currentUser]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="flex flex-col flex-1 bg-[#F8F9FA] text-gray-800 min-h-[calc(100vh-64px)] p-8 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between max-w-7xl w-full mx-auto">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Payroll & Payslips</h1>
          <p className="text-xs text-gray-500 mt-0.5">Attendance-driven net compensation and statutory tax breakdown</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl shadow-2xs">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="bg-transparent text-xs font-bold text-gray-800 px-2 py-1 focus:outline-none"
          >
            {monthNames.map((m, idx) => (
              <option key={idx} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="bg-transparent text-xs font-bold text-gray-800 px-2 py-1 focus:outline-none"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl w-full mx-auto flex flex-col gap-6 overflow-y-auto flex-1">
        {/* Admin Company Aggregate Cards */}
        {currentUser?.role === "ADMIN" && companySummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 p-5 rounded-3xl flex flex-col gap-1 shadow-2xs">
              <span className="text-xs font-semibold text-gray-500">Total Workforce Paid</span>
              <span className="text-2xl font-extrabold text-gray-900">{companySummary.total_employees_paid}</span>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-3xl flex flex-col gap-1 shadow-2xs">
              <span className="text-xs font-semibold text-gray-500">Gross Payroll Disbursed</span>
              <span className="text-2xl font-extrabold text-[#2F65F6]">
                ₹{companySummary.total_gross_payout?.toLocaleString()}
              </span>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-3xl flex flex-col gap-1 shadow-2xs">
              <span className="text-xs font-semibold text-gray-500">Total PF (12% Basic)</span>
              <span className="text-2xl font-extrabold text-[#5FA770]">
                ₹{companySummary.total_pf_contributions?.toLocaleString()}
              </span>
            </div>
            <div className="bg-white border border-gray-200 p-5 rounded-3xl flex flex-col gap-1 shadow-2xs">
              <span className="text-xs font-semibold text-gray-500">Net Take-Home Disbursal</span>
              <span className="text-2xl font-extrabold text-gray-900">
                ₹{companySummary.total_net_payout?.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Itemized Payslip Sheet */}
        {payslip ? (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 max-w-4xl w-full mx-auto flex flex-col gap-6">
            <div className="flex items-start justify-between border-b border-gray-100 pb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Payslip for {payslip.month_name} {payslip.year}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Employee: <b className="text-gray-900">{payslip.employee_name}</b> ({payslip.employee_id}) •{" "}
                  {payslip.designation}
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
              >
                <Printer size={14} /> Print / Export PDF
              </button>
            </div>

            {/* Attendance & Factor Badges */}
            <div className="grid grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl text-xs border border-gray-200">
              <div>
                <span className="text-gray-500 block">Working Days</span>
                <span className="font-bold text-gray-900">{payslip.total_working_days} days</span>
              </div>
              <div>
                <span className="text-gray-500 block">Days Paid</span>
                <span className="font-bold text-[#5FA770]">{payslip.paid_days} days</span>
              </div>
              <div>
                <span className="text-gray-500 block">Payable Ratio</span>
                <span className="font-bold text-[#2F65F6]">{(payslip.payable_ratio * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500 block">Overtime Pay</span>
                <span className="font-bold text-[#EE964B]">
                  {payslip.overtime_hours}h (₹{payslip.overtime_pay})
                </span>
              </div>
            </div>

            {/* Split Breakdown: Earnings (Left) & Deductions (Right) */}
            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Earnings Table */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">Itemized Earnings</span>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Basic Salary (50%)</span>
                  <span className="font-bold text-gray-900">₹{payslip.earned_basic}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>House Rent Allowance (HRA)</span>
                  <span className="font-bold text-gray-900">₹{payslip.earned_hra}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Standard Allowance</span>
                  <span className="font-bold text-gray-900">₹{payslip.earned_standard_allowance}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Performance Bonus</span>
                  <span className="font-bold text-gray-900">₹{payslip.earned_performance_bonus}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Leave Travel Allowance (LTA)</span>
                  <span className="font-bold text-gray-900">₹{payslip.earned_lta}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Fixed Allowance (Residual)</span>
                  <span className="font-bold text-gray-900">₹{payslip.earned_fixed_allowance}</span>
                </div>
                {payslip.overtime_pay > 0 && (
                  <div className="flex justify-between py-1 text-[#EE964B] font-semibold">
                    <span>Overtime Compensation</span>
                    <span>+₹{payslip.overtime_pay}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t border-gray-100 font-bold text-gray-900 text-sm">
                  <span>Gross Earnings</span>
                  <span className="text-[#2F65F6]">₹{payslip.gross_earnings}</span>
                </div>
              </div>

              {/* Deductions Table */}
              <div className="flex flex-col gap-2">
                <span className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-2">Statutory Deductions</span>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Provident Fund (Employee 12%)</span>
                  <span className="font-bold text-rose-600">-₹{payslip.pf_deduction}</span>
                </div>
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Professional Tax</span>
                  <span className="font-bold text-rose-600">-₹{payslip.prof_tax_deduction}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-100 font-bold text-gray-900 text-sm">
                  <span>Total Deductions</span>
                  <span className="text-rose-600">-₹{payslip.total_deductions}</span>
                </div>

                {/* Net Payout Banner */}
                <div className="mt-6 p-4 bg-[#E8F5E9] border border-[#C8E6C9] rounded-2xl flex items-center justify-between">
                  <span className="font-bold text-[#2E7D32] text-sm">Net Take-Home Payout</span>
                  <span className="font-extrabold text-[#2E7D32] text-xl">₹{payslip.net_payout}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-sm text-gray-400">
            {loading ? "Calculating monthly payroll..." : "No payroll records found for this period."}
          </div>
        )}
      </div>
    </div>
  );
};

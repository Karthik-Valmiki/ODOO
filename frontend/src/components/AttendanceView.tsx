import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import type { UserBasic } from "../types";
import { apiClient } from "../api/client";

interface AttendanceViewProps {
  currentUser: UserBasic | null;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ currentUser }) => {
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(
        `/attendance?month=${selectedMonth}&year=${selectedYear}${
          searchEmployee ? `&employee_id=${searchEmployee}` : ""
        }`
      );
      setRecords(res.data);

      const summaryRes = await apiClient.get(`/attendance/summary?month=${selectedMonth}&year=${selectedYear}`);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth, selectedYear, searchEmployee]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="flex flex-col flex-1 bg-[#F8F9FA] text-gray-800 min-h-[calc(100vh-64px)] p-8 gap-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-7xl w-full mx-auto">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Attendance Logs</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentUser?.role === "ADMIN" ? "Company-wide workforce attendance logs & overtime tracking" : "Your personal check-in logs and extra hours"}
          </p>
        </div>

        {/* Date & Filter Controls */}
        <div className="flex items-center gap-3">
          {currentUser?.role === "ADMIN" && (
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                placeholder="Filter by employee ID..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-2xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F65F6] shadow-2xs"
              />
            </div>
          )}

          <div className="flex items-center gap-2 bg-white border border-gray-200 p-1.5 rounded-2xl shadow-2xs">
            <button
              onClick={() => {
                if (selectedMonth === 1) {
                  setSelectedMonth(12);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold text-gray-800 min-w-[120px] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              onClick={() => {
                if (selectedMonth === 12) {
                  setSelectedMonth(1);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metric Cards */}
      {summary && (
        <div className="max-w-7xl w-full mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white border border-gray-200 p-4 rounded-3xl flex flex-col gap-1 shadow-2xs">
            <span className="text-[11px] text-gray-500 font-medium">Standard Working Days</span>
            <span className="text-xl font-extrabold text-gray-900">{summary.working_days_in_month} days</span>
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-3xl flex flex-col gap-1 shadow-2xs">
            <span className="text-[11px] text-emerald-600 font-medium">Present Days</span>
            <span className="text-xl font-extrabold text-emerald-600">{summary.total_present}</span>
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-3xl flex flex-col gap-1 shadow-2xs">
            <span className="text-[11px] text-amber-600 font-medium">Half Days</span>
            <span className="text-xl font-extrabold text-amber-600">{summary.total_half_days}</span>
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-3xl flex flex-col gap-1 shadow-2xs">
            <span className="text-[11px] text-blue-600 font-medium">Approved Leaves</span>
            <span className="text-xl font-extrabold text-blue-600">{summary.total_leaves}</span>
          </div>
          <div className="bg-white border border-gray-200 p-4 rounded-3xl flex flex-col gap-1 shadow-2xs">
            <span className="text-[11px] text-[#2F65F6] font-medium">Overtime Hours</span>
            <span className="text-xl font-extrabold text-[#2F65F6]">{summary.total_overtime_hours}h</span>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="max-w-7xl w-full mx-auto bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs flex-1">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Employee</th>
                <th className="py-3.5 px-6">Check In</th>
                <th className="py-3.5 px-6">Check Out</th>
                <th className="py-3.5 px-6">Work Hours (≤8h)</th>
                <th className="py-3.5 px-6">Extra Hours (&gt;8h)</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {records.map((r) => {
                const statusColor =
                  r.status === "PRESENT"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : r.status === "HALF_DAY"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : r.status === "LEAVE"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-rose-50 text-rose-700 border-rose-200";

                return (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-medium text-gray-600">{r.record_date}</td>
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{r.employee_name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{r.employee_id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-mono">
                      {r.check_in ? new Date(r.check_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="py-3.5 px-6 font-mono">
                      {r.check_out ? new Date(r.check_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-gray-900">{r.work_hours}h</td>
                    <td className="py-3.5 px-6 font-bold text-[#2F65F6]">
                      {r.extra_hours > 0 ? `+${r.extra_hours}h` : "0.0h"}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusColor}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No attendance records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

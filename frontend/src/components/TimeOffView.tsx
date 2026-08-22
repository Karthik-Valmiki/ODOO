import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  X,
} from "lucide-react";
import type { UserBasic } from "../types";
import { apiClient } from "../api/client";

interface TimeOffViewProps {
  currentUser: UserBasic | null;
}

export const TimeOffView: React.FC<TimeOffViewProps> = ({ currentUser }) => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Apply Form
  const [leaveType, setLeaveType] = useState<"PAID" | "SICK" | "UNPAID">("PAID");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLeavesAndBalance = async () => {
    try {
      const leavesRes = await apiClient.get("/leaves");
      setLeaves(leavesRes.data);

      const balanceRes = await apiClient.get("/leaves/balance");
      setBalance(balanceRes.data);
    } catch (err) {
      console.error("Failed to load time off data:", err);
    }
  };

  useEffect(() => {
    fetchLeavesAndBalance();
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post("/leaves/apply", {
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        description,
      });
      alert("Time off request submitted successfully!");
      setShowApplyModal(false);
      setDescription("");
      fetchLeavesAndBalance();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (leaveId: string) => {
    try {
      await apiClient.post(`/leaves/${leaveId}/approve`, {
        admin_comments: "Approved by Admin",
      });
      alert("Leave approved and retroactive attendance synced!");
      fetchLeavesAndBalance();
    } catch (err: any) {
      alert(err.response?.data?.error || "Approval failed");
    }
  };

  const handleReject = async (leaveId: string) => {
    try {
      await apiClient.post(`/leaves/${leaveId}/reject`, {
        admin_comments: "Rejected by Admin",
      });
      alert("Leave request rejected");
      fetchLeavesAndBalance();
    } catch (err: any) {
      alert(err.response?.data?.error || "Rejection failed");
    }
  };

  const filteredLeaves = leaves.filter((l) =>
    l.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.leave_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 bg-[#F5F5F5] text-gray-800 min-h-[calc(100vh-56px)] px-6 py-5 gap-4">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 w-full">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Time Off & Absences</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Gantt-tracked leave calendar, balance quotas, and employee absence approvals
          </p>
        </div>

        <button
          onClick={() => setShowApplyModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2F65F6] hover:bg-blue-700 text-white text-xs font-bold rounded-2xl shadow-xs transition-all"
        >
          <Plus size={16} /> New Time Off Request
        </button>
      </div>

      {/* Quota Balance Cards */}
      {balance && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 p-5 rounded-3xl flex items-center justify-between shadow-2xs">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-700">Paid Vacation Time Off</span>
              <span className="text-2xl font-extrabold text-[#5FA770]">
                {balance.paid_remaining} <span className="text-xs font-medium text-gray-400">/ {balance.paid_total} days available</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#E8F5E9] text-[#5FA770] flex items-center justify-center text-xl font-bold">
              🌴
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-5 rounded-3xl flex items-center justify-between shadow-2xs">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-700">Sick Time Off</span>
              <span className="text-2xl font-extrabold text-[#EE964B]">
                {balance.sick_remaining} <span className="text-xs font-medium text-gray-400">/ {balance.sick_total} days available</span>
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#FFF3E0] text-[#EE964B] flex items-center justify-center text-xl font-bold">
              🤒
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden flex-1 flex flex-col">
        {/* Search filter */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leaves by employee or type..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2F65F6] shadow-2xs"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Total Requests: <b className="text-gray-900">{filteredLeaves.length}</b>
          </span>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Employee</th>
                <th className="py-3.5 px-6">Start Date</th>
                <th className="py-3.5 px-6">End Date</th>
                <th className="py-3.5 px-6">Time Off Type</th>
                <th className="py-3.5 px-6">Duration</th>
                <th className="py-3.5 px-6">Status</th>
                {currentUser?.role === "ADMIN" && <th className="py-3.5 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredLeaves.map((l) => {
                const statusColor =
                  l.status === "APPROVED"
                    ? "bg-[#E8F5E9] text-[#2E7D32] border-[#C8E6C9]"
                    : l.status === "PENDING"
                    ? "bg-[#FFF3E0] text-[#E65100] border-[#FFE0B2]"
                    : "bg-[#FFEBEE] text-[#C62828] border-[#FFCDD2]";

                return (
                  <tr key={l.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{l.employee_name}</span>
                        <span className="text-[10px] font-mono text-gray-400">{l.employee_id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-gray-600">{l.start_date}</td>
                    <td className="py-3.5 px-6 font-mono text-gray-600">{l.end_date}</td>
                    <td className="py-3.5 px-6 font-semibold">
                      {l.leave_type === "PAID" ? (
                        <span className="text-[#5FA770]">🌴 Paid Vacation</span>
                      ) : l.leave_type === "SICK" ? (
                        <span className="text-[#EE964B]">🤒 Sick Leave</span>
                      ) : (
                        <span className="text-gray-600">⚪ Unpaid Leave</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 font-bold text-gray-900">{l.total_days} days</td>
                    <td className="py-3.5 px-6">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusColor}`}>
                        {l.status}
                      </span>
                    </td>
                    {currentUser?.role === "ADMIN" && (
                      <td className="py-3.5 px-6 text-right">
                        {l.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(l.id)}
                              className="px-3 py-1 bg-[#5FA770] hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-2xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(l.id)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-2xs"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 font-medium">Completed</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredLeaves.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No time off requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Off Type Request Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Time Off Request</h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApply} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Employee</label>
                <input
                  type="text"
                  disabled
                  value={`${currentUser?.full_name || "Employee"} (${currentUser?.employee_id || ""})`}
                  className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Time Off Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as any)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                >
                  <option value="PAID">Paid Vacation (18 Days Quota)</option>
                  <option value="SICK">Sick Leave (12 Days Quota)</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Reason / Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Vacation travel, medical checkup"
                  rows={2}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#2F65F6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 mt-1">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 font-medium text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 font-bold text-white bg-[#2F65F6] hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

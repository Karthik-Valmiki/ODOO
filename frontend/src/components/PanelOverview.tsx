import React, { useState, useEffect } from "react";
import {
  Clock,
  Users,
  Calendar,
  Play,
  Square,
  ArrowUpRight,
} from "lucide-react";
import type { UserBasic, PunchStatus } from "../types";
import { apiClient } from "../api/client";

interface PanelOverviewProps {
  currentUser: UserBasic | null;
  onNavigate: (tab: any) => void;
}

export const PanelOverview: React.FC<PanelOverviewProps> = ({ currentUser, onNavigate }) => {
  const [punchStatus, setPunchStatus] = useState<PunchStatus | null>(null);
  const [companyStats, setCompanyStats] = useState<any>(null);
  const [punchLoading, setPunchLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const punchRes = await apiClient.get("/attendance/today");
      setPunchStatus(punchRes.data);

      const statsRes = await apiClient.get("/company/stats");
      setCompanyStats(statsRes.data);
    } catch (err) {
      console.error("Failed to load panel stats:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePunchToggle = async () => {
    setPunchLoading(true);
    try {
      if (punchStatus?.is_punched_in) {
        const res = await apiClient.post("/attendance/punch-out");
        setPunchStatus(res.data);
      } else {
        const res = await apiClient.post("/attendance/punch-in");
        setPunchStatus(res.data);
      }
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Punch action failed");
    } finally {
      setPunchLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen bg-[#F8F9FA] p-8 gap-8 overflow-y-auto">
      {/* Welcome Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-[#2F65F6] to-[#1E40AF] rounded-3xl p-8 text-white shadow-md">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-blue-200 font-bold">Workspace Overview</span>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {currentUser?.first_name || "John"}! 👋
          </h1>
          <p className="text-xs text-blue-100 mt-1 max-w-md">
            Every workday, perfectly aligned. Track time, manage leaves, and review compensation in real-time.
          </p>
        </div>

        {/* Live Punch In / Out Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 flex items-center gap-6 shadow-lg">
          <div className="flex flex-col">
            <span className="text-[11px] text-blue-200 font-semibold uppercase">Current Shift</span>
            <span className="text-xl font-bold font-mono text-white">{currentTime}</span>
            <span className="text-[11px] text-blue-200 mt-0.5">
              Status: <b className="text-white">{punchStatus?.is_punched_in ? "🟢 Working (Punched In)" : "⚪ Off Shift"}</b>
            </span>
          </div>

          <button
            onClick={handlePunchToggle}
            disabled={punchLoading}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all ${
              punchStatus?.is_punched_in
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {punchStatus?.is_punched_in ? (
              <>
                <Square size={16} /> Punch Out
              </>
            ) : (
              <>
                <Play size={16} /> Punch In
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Workforce</span>
            <Users size={18} />
          </div>
          <span className="text-3xl font-extrabold text-gray-900">
            {companyStats?.total_employees ?? 0}
          </span>
          <span className="text-[11px] text-gray-400">Active team members</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">Present Today</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-3xl font-extrabold text-emerald-600">
            {companyStats?.present_count ?? 0}
          </span>
          <span className="text-[11px] text-gray-400">Checked in and working</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider">On Leave</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <span className="text-3xl font-extrabold text-blue-600">
            {companyStats?.on_leave_count ?? 0}
          </span>
          <span className="text-[11px] text-gray-400">Approved time off</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-xs font-bold uppercase tracking-wider">Absences</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <span className="text-3xl font-extrabold text-amber-600">
            {companyStats?.absent_count ?? 0}
          </span>
          <span className="text-[11px] text-gray-400">Unrecorded attendance</span>
        </div>
      </div>

      {/* Quick Access Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div
          onClick={() => onNavigate("hours")}
          className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
              <Clock size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
              Work Hours Timeline
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Log project hours, drag & resize tasks across the horizontal timeline matrix.
            </p>
          </div>
          <span className="text-xs font-bold text-[#2F65F6] flex items-center gap-1">
            Open Hours View <ArrowUpRight size={14} />
          </span>
        </div>

        <div
          onClick={() => onNavigate("absences")}
          className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Calendar size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
              Absences & Time Off
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Gantt-style employee leave calendar with real-time approval synchronization.
            </p>
          </div>
          <span className="text-xs font-bold text-[#2F65F6] flex items-center gap-1">
            Open Absences <ArrowUpRight size={14} />
          </span>
        </div>

        <div
          onClick={() => onNavigate("employees")}
          className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between gap-4 group"
        >
          <div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
              Employees & Salary
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Department folders, onboarding, and 6-component salary structure management.
            </p>
          </div>
          <span className="text-xs font-bold text-[#2F65F6] flex items-center gap-1">
            Open Directory <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
};

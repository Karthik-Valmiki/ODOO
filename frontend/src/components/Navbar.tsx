import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  User as UserIcon,
  LogOut,
  Play,
  Square,
  ChevronDown,
} from "lucide-react";
import type { UserBasic, PunchStatus } from "../types";
import { apiClient } from "../api/client";

export type ActiveNavPage = "employees" | "attendance" | "time-off" | "payroll";

interface NavbarProps {
  activePage: ActiveNavPage;
  setActivePage: (page: ActiveNavPage) => void;
  currentUser: UserBasic | null;
  onOpenMyProfile: () => void;
  onLogout: () => void;
  onPunchStatusChanged?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  setActivePage,
  currentUser,
  onOpenMyProfile,
  onLogout,
  onPunchStatusChanged,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [punchStatus, setPunchStatus] = useState<PunchStatus | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);

  const fetchPunchStatus = async () => {
    try {
      const res = await apiClient.get("/attendance/today");
      setPunchStatus(res.data);
    } catch (err) {
      console.error("Failed to fetch punch status:", err);
    }
  };

  useEffect(() => {
    fetchPunchStatus();
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
      if (onPunchStatusChanged) {
        onPunchStatusChanged();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Punch action failed");
    } finally {
      setPunchLoading(false);
    }
  };

  const navTabs: { id: ActiveNavPage; label: string; icon: any }[] = [
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "time-off", label: "Time Off", icon: Calendar },
    { id: "payroll", label: "Payroll", icon: DollarSign },
  ];

  return (
    <header className="bg-[#181F2C] border-b border-gray-800 text-white select-none sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Company Branding */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setActivePage("employees")}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            D
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white leading-tight">
              {currentUser?.company_name || "Dayflow"}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">HRMS Platform</span>
          </div>
        </div>

        {/* Center: Navigation Tabs matching Wireframe */}
        <nav className="flex items-center gap-1 bg-[#101622] p-1.5 rounded-2xl border border-gray-800">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePage(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-[#6366F1] text-white shadow-md font-bold"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Punch In/Out Toggle & Profile Menu */}
        <div className="flex items-center gap-4">
          {/* Live Punch Button */}
          <button
            onClick={handlePunchToggle}
            disabled={punchLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all ${
              punchStatus?.is_punched_in
                ? "bg-rose-500 hover:bg-rose-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
            title={punchStatus?.is_punched_in ? "Click to Punch Out" : "Click to Punch In"}
          >
            {punchStatus?.is_punched_in ? (
              <>
                <Square size={14} /> Punch Out
              </>
            ) : (
              <>
                <Play size={14} /> Punch In
              </>
            )}
          </button>

          {/* User Profile Avatar with dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 p-1.5 bg-[#101622] hover:bg-gray-800 border border-gray-800 rounded-2xl transition-colors cursor-pointer"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-amber-400 flex items-center justify-center text-sm font-bold text-gray-900 shadow-sm">
                  {currentUser?.profile_picture_url ? (
                    <img
                      src={currentUser.profile_picture_url}
                      alt="Avatar"
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                {/* Real-time Status Dot on Avatar */}
                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#181F2C] ${
                    punchStatus?.is_punched_in ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
              </div>

              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-gray-200 leading-tight">
                  {currentUser?.full_name || "User"}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {currentUser?.role === "ADMIN" ? "Admin" : currentUser?.employee_id || "Employee"}
                </span>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {/* Profile Dropdown Modal */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-[#181F2C] border border-gray-700 rounded-2xl shadow-2xl p-1.5 flex flex-col gap-1 z-50">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenMyProfile();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-xl w-full text-left"
                >
                  <UserIcon size={14} /> My Profile
                </button>
                <div className="border-t border-gray-800 my-1" />
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onLogout();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl w-full text-left"
                >
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

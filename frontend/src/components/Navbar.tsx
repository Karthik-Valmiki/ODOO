import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  User as UserIcon,
  LogOut,
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
    } catch {
      // silently ignore — user may not have punched in yet
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
      if (onPunchStatusChanged) onPunchStatusChanged();
    } catch (err: any) {
      alert(err.response?.data?.error || "Punch action failed");
    } finally {
      setPunchLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const close = () => setShowDropdown(false);
    if (showDropdown) document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showDropdown]);

  const navTabs: { id: ActiveNavPage; label: string; icon: React.ElementType }[] = [
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "time-off", label: "Time Off", icon: Calendar },
    { id: "payroll", label: "Payroll", icon: DollarSign },
  ];

  const isPunchedIn = punchStatus?.is_punched_in ?? false;

  return (
    <header className="bg-white border-b border-gray-200 select-none sticky top-0 z-40">
      <div className="w-full px-6 h-14 flex items-center justify-between gap-6">

        {/* LEFT: Company Logo + Name */}
        <div
          className="flex items-center gap-2.5 cursor-pointer flex-shrink-0 min-w-[160px]"
          onClick={() => setActivePage("employees")}
        >
          {currentUser?.company_logo_url ? (
            <img
              src={currentUser.company_logo_url}
              alt="Logo"
              className="w-8 h-8 rounded-lg object-cover border border-gray-200"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#2F65F6] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="8" cy="10" r="1.5" fill="white" />
                <circle cx="16" cy="10" r="1.5" fill="white" />
                <path d="M8 14.5C9.5 16 14.5 16 16 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          )}
          <span className="font-bold text-sm text-gray-900 whitespace-nowrap truncate max-w-[120px]">
            {currentUser?.company_name || "WorkDesk"}
          </span>
        </div>

        {/* CENTER: Navigation Tabs (matching wireframe) */}
        <nav className="flex items-center gap-1 flex-1 justify-center">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePage(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-[#2F65F6] text-white"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Status dot + Check In/Out + Avatar dropdown */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Live status pill */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-gray-50 rounded-full text-xs font-medium text-gray-600">
            <span
              className={`w-2 h-2 rounded-full ${
                isPunchedIn ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
            {isPunchedIn ? "Checked In" : "Not Checked In"}
          </div>

          {/* Check In / Check Out button — matches wireframe */}
          <button
            onClick={handlePunchToggle}
            disabled={punchLoading}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all ${
              isPunchedIn
                ? "bg-white border-red-300 text-red-600 hover:bg-red-50"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {punchLoading
              ? "..."
              : isPunchedIn
              ? "Check Out →"
              : "Check In →"}
          </button>

          {/* Avatar + Profile Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#FFD54F] flex items-center justify-center text-sm font-bold text-gray-900 overflow-hidden">
                  {currentUser?.profile_picture_url ? (
                    <img
                      src={currentUser.profile_picture_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{currentUser?.first_name?.charAt(0) || "U"}</span>
                  )}
                </div>
                {/* Status dot on avatar */}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                    isPunchedIn ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
              </div>
              <ChevronDown size={14} className="text-gray-400 hidden md:block" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="font-semibold text-xs text-gray-900 truncate">{currentUser?.full_name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{currentUser?.employee_id}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onOpenMyProfile();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <UserIcon size={13} /> My Profile
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    onLogout();
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                >
                  <LogOut size={13} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from "react";
import {
  Users,
  Clock,
  Calendar,
  DollarSign,
  Briefcase,
  ChevronsLeft,
  ChevronsRight,
  MoreVertical,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import type { UserBasic } from "../types";

export type NavTab = "employees" | "attendance" | "hours" | "time-off" | "payroll";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: UserBasic | null;
  onOpenProfile: () => void;
  onLogout: () => void;
  companyName?: string;
  companyLogoUrl?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenProfile,
  onLogout,
  companyName = "WorkDesk",
  companyLogoUrl,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const navItems: { id: NavTab; label: string; icon: any }[] = [
    { id: "employees", label: "Employees", icon: Users },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "hours", label: "Work Hours", icon: Briefcase },
    { id: "time-off", label: "Time Off", icon: Calendar },
    { id: "payroll", label: "Payroll", icon: DollarSign },
  ];

  return (
    <aside
      className={`relative flex flex-col justify-between bg-white border-r border-gray-200 transition-all duration-300 ease-in-out select-none z-30 ${
        isCollapsed ? "w-[76px]" : "w-[240px]"
      } min-h-screen p-4 flex-shrink-0`}
    >
      {/* Top Header & Navigation Links */}
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-3 overflow-hidden cursor-pointer"
            onClick={() => setActiveTab("employees")}
          >
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-cover shadow-xs flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#2F65F6] flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                {/* WorkDesk Logo */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="10" r="1.5" fill="white" />
                  <circle cx="16" cy="10" r="1.5" fill="white" />
                  <path d="M8 14.5C9.5 16 14.5 16 16 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {!isCollapsed && (
              <span className="font-bold text-[15px] text-gray-900 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {currentUser?.company_name || companyName}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => isCollapsed && setHoveredTab(item.id)}
                onMouseLeave={() => isCollapsed && setHoveredTab(null)}
              >
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gray-100 text-gray-950 font-semibold shadow-xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  } ${isCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon
                    size={20}
                    className={`flex-shrink-0 ${
                      isActive ? "text-gray-950 stroke-[2.2]" : "text-gray-500 stroke-[1.8]"
                    }`}
                  />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                </button>

                {/* Collapsed Mode Dark Tooltip Popover matching Screenshot */}
                {isCollapsed && hoveredTab === item.id && (
                  <div className="absolute left-[80px] top-1/2 -translate-y-1/2 z-50 flex items-center">
                    <div className="w-0 h-0 border-y-[5px] border-y-transparent border-r-[6px] border-r-[#242933]" />
                    <div className="bg-[#242933] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
                      {item.label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom User Profile Card matching Screenshot */}
      <div className="relative pt-4 border-t border-gray-100">
        <div
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className={`flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors ${
            isCollapsed ? "justify-center p-1" : ""
          }`}
        >
          {/* Cute Monster / Character Avatar */}
          <div className="w-9 h-9 rounded-xl bg-[#FFD54F] flex items-center justify-center flex-shrink-0 text-amber-900 shadow-xs">
            {currentUser?.profile_picture_url ? (
              <img
                src={currentUser.profile_picture_url}
                alt="Avatar"
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              <span className="text-lg select-none">🎃</span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 leading-tight truncate">
                {currentUser?.full_name || "John Smith"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentUser?.role === "ADMIN"
                  ? "Administrator"
                  : (currentUser as any)?.salary_structure?.designation || currentUser?.employee_id || "Employee"}
              </p>
            </div>
          )}

          {!isCollapsed && (
            <MoreVertical size={16} className="text-gray-400 hover:text-gray-600 flex-shrink-0" />
          )}
        </div>

        {/* Profile Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute bottom-16 left-2 right-2 bg-white rounded-2xl shadow-xl border border-gray-200 p-1.5 flex flex-col gap-1 z-50">
            <button
              onClick={() => {
                setShowProfileMenu(false);
                onOpenProfile();
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl w-full text-left"
            >
              <UserIcon size={14} /> My Profile
            </button>
            <button
              onClick={() => {
                setShowProfileMenu(false);
                onLogout();
              }}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl w-full text-left"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

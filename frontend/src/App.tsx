import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import type { NavTab } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";
import { EmployeesView } from "./components/EmployeesView";
import { AttendanceView } from "./components/AttendanceView";
import { HoursView } from "./components/HoursView";
import { TimeOffView } from "./components/TimeOffView";
import { PayrollView } from "./components/PayrollView";
import { AuthModal } from "./components/AuthModal";
import type { UserBasic } from "./types";
import { apiClient } from "./api/client";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>("employees");
  const [currentUser, setCurrentUser] = useState<UserBasic | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileModalTarget, setProfileModalTarget] = useState<any>(null);
  const [punchTick, setPunchTick] = useState(0);

  // Check existing session on load
  const loadUser = () => {
    const token = localStorage.getItem("dayflow_access_token");
    if (token) {
      apiClient
        .get("/auth/me")
        .then((res) => {
          setCurrentUser(res.data);
          setShowAuthModal(false);
        })
        .catch(() => {
          localStorage.removeItem("dayflow_access_token");
          setShowAuthModal(true);
        })
        .finally(() => setLoading(false));
    } else {
      setShowAuthModal(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const handleLoginSuccess = (user: UserBasic) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    setActiveTab("employees"); // Default landing page per wireframe
  };

  const handleLogout = () => {
    localStorage.removeItem("dayflow_access_token");
    localStorage.removeItem("dayflow_refresh_token");
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  const handleOpenMyProfile = () => {
    if (currentUser) {
      setProfileModalTarget(currentUser);
      setActiveTab("employees");
    }
  };

  const pageTitles: Record<NavTab, string> = {
    employees: "Employees Directory",
    attendance: "Attendance & Overtime",
    hours: "Work Hours & Projects",
    "time-off": "Time Off & Absences",
    payroll: "Payroll & Compensation",
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#F8F9FA] text-gray-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#2F65F6] flex items-center justify-center text-white text-xl font-bold animate-pulse shadow-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="10" r="1.5" fill="white" />
              <circle cx="16" cy="10" r="1.5" fill="white" />
              <path d="M8 14.5C9.5 16 14.5 16 16 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-500">Loading Happy Solutions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-800 font-sans antialiased flex selection:bg-blue-100 selection:text-blue-900">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenProfile={handleOpenMyProfile}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header with Live Punch Toggle & Status */}
        <TopHeader
          currentUser={currentUser}
          activeTitle={pageTitles[activeTab]}
          onPunchChanged={() => setPunchTick((prev) => prev + 1)}
        />

        {/* View Routing */}
        <main className="flex-1 flex flex-col">
          {activeTab === "employees" && (
            <EmployeesView
              key={punchTick}
              currentUser={currentUser}
              selectedUserForModal={profileModalTarget}
              onCloseModal={() => setProfileModalTarget(null)}
            />
          )}

          {activeTab === "attendance" && (
            <AttendanceView key={punchTick} currentUser={currentUser} />
          )}

          {activeTab === "hours" && <HoursView />}

          {activeTab === "time-off" && (
            <TimeOffView key={punchTick} currentUser={currentUser} />
          )}

          {activeTab === "payroll" && (
            <PayrollView key={punchTick} currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      {showAuthModal && <AuthModal onSuccess={handleLoginSuccess} />}
    </div>
  );
};

export default App;

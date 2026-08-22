import React, { useState, useEffect } from "react";
import { Navbar } from "./components/Navbar";
import type { ActiveNavPage } from "./components/Navbar";
import { EmployeesView } from "./components/EmployeesView";
import { AttendanceView } from "./components/AttendanceView";
import { TimeOffView } from "./components/TimeOffView";
import { PayrollView } from "./components/PayrollView";
import { AuthModal } from "./components/AuthModal";
import type { UserBasic } from "./types";
import { apiClient } from "./api/client";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveNavPage>("employees");
  const [currentUser, setCurrentUser] = useState<UserBasic | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [profileModalTarget, setProfileModalTarget] = useState<any>(null);
  const [punchTick, setPunchTick] = useState(0);

  const loadUser = () => {
    const token = localStorage.getItem("workdesk_access_token");
    if (token) {
      apiClient
        .get("/auth/me")
        .then((res) => {
          setCurrentUser(res.data);
          setShowAuthModal(false);
        })
        .catch(() => {
          localStorage.removeItem("workdesk_access_token");
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
    setActiveTab("employees");
  };

  const handleLogout = () => {
    localStorage.removeItem("workdesk_access_token");
    localStorage.removeItem("workdesk_refresh_token");
    setCurrentUser(null);
    setShowAuthModal(true);
  };

  const handleOpenMyProfile = () => {
    if (currentUser) {
      setProfileModalTarget(currentUser);
      setActiveTab("employees");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-gray-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2F65F6] flex items-center justify-center text-white animate-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="8" cy="10" r="1.5" fill="white" />
              <circle cx="16" cy="10" r="1.5" fill="white" />
              <path d="M8 14.5C9.5 16 14.5 16 16 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs text-gray-500 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-gray-800 font-sans antialiased flex flex-col">
      {/* Top Navbar — matches wireframe: Company Logo | Tabs | Punch | Avatar */}
      {currentUser && (
        <Navbar
          activePage={activeTab}
          setActivePage={setActiveTab}
          currentUser={currentUser}
          onOpenMyProfile={handleOpenMyProfile}
          onLogout={handleLogout}
          onPunchStatusChanged={() => setPunchTick((prev) => prev + 1)}
        />
      )}

      {/* Page Content */}
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
        {activeTab === "time-off" && (
          <TimeOffView key={punchTick} currentUser={currentUser} />
        )}
        {activeTab === "payroll" && (
          <PayrollView key={punchTick} currentUser={currentUser} />
        )}
      </main>

      {showAuthModal && <AuthModal onSuccess={handleLoginSuccess} />}
    </div>
  );
};

export default App;

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { apiClient } from "../api/client";
import type { UserBasic } from "../types";

interface AuthModalProps {
  onSuccess: (user: UserBasic, tokens: { access_token: string; refresh_token: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign In Form
  const [loginId, setLoginId] = useState("admin@odoo.com");
  const [password, setPassword] = useState("AdminPassword@2026");

  // Sign Up Form
  const [companyName, setCompanyName] = useState("Happy Solutions");
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Smith");
  const [email, setEmail] = useState("admin@happysolutions.com");
  const [signUpPassword, setSignUpPassword] = useState("Admin@12345");
  const [confirmPassword, setConfirmPassword] = useState("Admin@12345");

  // Force Password Change Form
  const [forceMode, setForceMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", {
        login_id_or_email: loginId,
        password,
      });

      const { access_token, refresh_token, force_password_change, user } = res.data;
      localStorage.setItem("dayflow_access_token", access_token);
      localStorage.setItem("dayflow_refresh_token", refresh_token);

      if (force_password_change) {
        setForceMode(true);
      } else {
        onSuccess(user, { access_token, refresh_token });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/signup", {
        company_name: companyName,
        first_name: firstName,
        last_name: lastName,
        email,
        password: signUpPassword,
        confirm_password: confirmPassword,
      });

      const { access_token, refresh_token, user } = res.data;
      localStorage.setItem("dayflow_access_token", access_token);
      localStorage.setItem("dayflow_refresh_token", refresh_token);
      onSuccess(user, { access_token, refresh_token });
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleForceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/auth/force-change-password", {
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });
      const meRes = await apiClient.get("/auth/me");
      onSuccess(meRes.data, {
        access_token: localStorage.getItem("dayflow_access_token") || "",
        refresh_token: localStorage.getItem("dayflow_refresh_token") || "",
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "Password change failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F172A]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-8 flex flex-col gap-6">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2F65F6] flex items-center justify-center text-white shadow-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="8" cy="10" r="1.5" fill="white" />
              <circle cx="16" cy="10" r="1.5" fill="white" />
              <path d="M8 14.5C9.5 16 14.5 16 16 14.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Happy Solutions HRMS</h2>
          <p className="text-xs text-gray-500">Every workday, perfectly aligned</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Force Password Change Mode */}
        {forceMode ? (
          <form onSubmit={handleForceChange} className="flex flex-col gap-4 text-xs">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-800 font-medium">
              First-time login detected. Please set a secure new password for your account.
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-gray-700">Confirm New Password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                className="px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="py-3 bg-[#2F65F6] hover:bg-[#2555D8] text-white font-semibold rounded-xl shadow-xs transition-colors"
            >
              {loading ? "Activating..." : "Activate Account"}
            </button>
          </form>
        ) : isSignUp ? (
          /* Sign Up Form */
          <form onSubmit={handleSignUp} className="flex flex-col gap-3.5 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-gray-700">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="e.g. Happy Solutions Inc"
                className="px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-gray-700">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Password</label>
                <input
                  type="password"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  className="px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 py-3 bg-[#2F65F6] hover:bg-[#2555D8] text-white font-semibold rounded-xl shadow-xs transition-colors"
            >
              {loading ? "Registering..." : "Create Organization & Admin"}
            </button>
            <p className="text-center text-gray-500 mt-1">
              Already registered?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-[#2F65F6] font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        ) : (
          /* Sign In Form */
          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-gray-700">Email or Employee ID</label>
              <input
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                placeholder="e.g. admin@odoo.com or ODROSH2026001"
                className="px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="py-3 bg-[#2F65F6] hover:bg-[#2555D8] text-white font-semibold rounded-xl shadow-xs transition-colors"
            >
              {loading ? "Signing In..." : "Sign In to Dayflow"}
            </button>
            <p className="text-center text-gray-500">
              New organization?{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-[#2F65F6] font-bold hover:underline"
              >
                Register Company
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from "react";
import {
  Play,
  Square,
  Clock,
} from "lucide-react";
import type { UserBasic, PunchStatus } from "../types";
import { apiClient } from "../api/client";

interface TopHeaderProps {
  currentUser?: UserBasic | null;
  activeTitle: string;
  onPunchChanged?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentUser: _currentUser,
  activeTitle,
  onPunchChanged,
}) => {
  const [punchStatus, setPunchStatus] = useState<PunchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeStr, setTimeStr] = useState(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const handleTogglePunch = async () => {
    setLoading(true);
    try {
      if (punchStatus?.is_punched_in) {
        const res = await apiClient.post("/attendance/punch-out");
        setPunchStatus(res.data);
      } else {
        const res = await apiClient.post("/attendance/punch-in");
        setPunchStatus(res.data);
      }
      if (onPunchChanged) {
        onPunchChanged();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Punch action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-3.5 flex items-center justify-between z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{activeTitle}</h1>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-mono text-gray-600">
          <Clock size={13} className="text-gray-500" />
          <span>{timeStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Status Indicator Pill */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold text-gray-700">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              punchStatus?.is_punched_in ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span>{punchStatus?.is_punched_in ? "🟢 Present in Office" : "🟡 Not Punched In"}</span>
        </div>

        {/* Live Punch In / Out Button */}
        <button
          onClick={handleTogglePunch}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all ${
            punchStatus?.is_punched_in
              ? "bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
              : "bg-[#2F65F6] hover:bg-blue-700 text-white shadow-sm"
          }`}
        >
          {punchStatus?.is_punched_in ? (
            <>
              <Square size={14} /> Punch Out Shift
            </>
          ) : (
            <>
              <Play size={14} /> Punch In Shift
            </>
          )}
        </button>
      </div>
    </header>
  );
};

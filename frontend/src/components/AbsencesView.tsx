import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronsRight,
  X,
} from "lucide-react";
import type { AbsenceRecord } from "../types";

interface AbsencesViewProps {
  onApplyLeave?: (leaveData: any) => Promise<void>;
}

const INITIAL_ABSENCES: AbsenceRecord[] = [
  {
    id: "a1",
    employeeId: "e1",
    employeeName: "John Smith",
    employeeTitle: "You",
    avatarColor: "bg-[#FFD54F]",
    avatarIcon: "🎃",
    type: "VACATION",
    startDate: "2021-08-01",
    endDate: "2021-08-01",
    startDay: 0,
    endDay: 0,
    label: "",
  },
  {
    id: "a2",
    employeeId: "e2",
    employeeName: "Emily Johnson",
    employeeTitle: "Development Manager",
    avatarColor: "bg-emerald-200",
    avatarIcon: "🐸",
    type: "VACATION",
    startDate: "2021-09-04",
    endDate: "2021-09-11",
    startDay: 4,
    endDay: 11,
    label: "04.09 - 11.09",
    upcomingAbsences: [
      { dateRange: "15.10 - 20.10", type: "Vacation" },
    ],
  },
  {
    id: "a3",
    employeeId: "e3",
    employeeName: "David Davis",
    employeeTitle: "PHP Developer",
    avatarColor: "bg-purple-200",
    avatarIcon: "👾",
    type: "VACATION",
    startDate: "2021-08-01",
    endDate: "2021-08-01",
    startDay: 0,
    endDay: 0,
    label: "",
  },
  {
    id: "a4",
    employeeId: "e4",
    employeeName: "Sarah Wilson",
    employeeTitle: "Solution Architect",
    avatarColor: "bg-amber-200",
    avatarIcon: "🦊",
    type: "VACATION",
    startDate: "2021-09-14",
    endDate: "2021-09-21",
    startDay: 14,
    endDay: 21,
    label: "14.09 - 21.09",
  },
  {
    id: "a5",
    employeeId: "e5",
    employeeName: "Maximilian Bartholomew",
    employeeTitle: "Development Manager",
    avatarColor: "bg-emerald-200",
    avatarIcon: "🐸",
    type: "SICK",
    startDate: "2021-09-07",
    endDate: "2021-09-12",
    startDay: 7,
    endDay: 12,
    label: "07.09 - 12.09",
    upcomingAbsences: [
      { dateRange: "24.09 - 28.09", type: "Vacation" },
      { dateRange: "08.10 - 09.10", type: "Vacation" },
    ],
  },
];

export const AbsencesView: React.FC<AbsencesViewProps> = ({ onApplyLeave }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2021, 7, 1)); // August 2021
  const [showMyTeam, setShowMyTeam] = useState(true);
  const [hoveredEmpId, setHoveredEmpId] = useState<string | null>("e5"); // defaulted to Maximilian from screenshot
  const [showAddModal, setShowAddModal] = useState(false);
  const [absences, setAbsences] = useState<AbsenceRecord[]>(INITIAL_ABSENCES);

  // Form State
  const [leaveType, setLeaveType] = useState<"VACATION" | "SICK" | "UNPAID">("VACATION");
  const [startDate, setStartDate] = useState("2021-08-10");
  const [endDate, setEndDate] = useState("2021-08-14");
  const [reason, setReason] = useState("");

  const daysInGrid = 15; // 4 to 18 as visible in screenshot
  const startDayOffset = 4; // Starts on Monday 4th
  const activeDay = 5; // Tuesday 5th highlighted with dark circle & vertical marker

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const formattedMonth = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const getDayInfo = (dayNum: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    const dayName = dayNames[d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = dayNum === activeDay;
    return { dayName, dayNum, isWeekend, isToday };
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const startD = parseInt(startDate.split("-")[2], 10);
    const endD = parseInt(endDate.split("-")[2], 10);

    const newRecord: AbsenceRecord = {
      id: `a-${Date.now()}`,
      employeeId: "e1",
      employeeName: "John Smith",
      employeeTitle: "You",
      avatarColor: "bg-[#FFD54F]",
      avatarIcon: "🎃",
      type: leaveType,
      startDate,
      endDate,
      startDay: startD,
      endDay: endD,
      label: `${startDate.slice(8)}.${startDate.slice(5, 7)} - ${endDate.slice(8)}.${endDate.slice(5, 7)}`,
    };

    setAbsences([...absences, newRecord]);
    if (onApplyLeave) {
      try {
        await onApplyLeave({
          leave_type: leaveType === "VACATION" ? "PAID" : leaveType,
          start_date: startDate,
          end_date: endDate,
          description: reason,
        });
      } catch (err) {
        console.error("Failed to sync leave to backend:", err);
      }
    }
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen bg-white relative">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Absences</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2F65F6] hover:bg-[#2555D8] rounded-xl shadow-xs transition-colors"
        >
          <Plus size={16} />
          Add absence
        </button>
      </div>

      {/* Navigation & Controls Subheader */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-sm text-gray-900 min-w-[110px] text-center">
              {formattedMonth}
            </span>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={() => setCurrentMonth(new Date(2021, 7, 1))}
            className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        {/* Show My Team Toggle */}
        <div className="flex items-center gap-2.5">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showMyTeam}
              onChange={(e) => setShowMyTeam(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2F65F6]"></div>
          </label>
          <span className="text-xs font-medium text-gray-700">Show my team</span>
        </div>
      </div>

      {/* Gantt Timeline Board */}
      <div className="flex flex-1 overflow-x-auto overflow-y-auto relative">
        {/* Left Employees Column */}
        <div className="w-[280px] border-r border-gray-100 bg-white sticky left-0 z-20 flex flex-col">
          <div className="h-14 px-6 flex items-center border-b border-gray-100">
            <span className="text-xs font-bold text-gray-900">Employees</span>
          </div>

          <div className="flex flex-col divide-y divide-gray-50">
            {absences.map((emp) => {
              const isHovered = hoveredEmpId === emp.employeeId;

              return (
                <div
                  key={emp.id}
                  onMouseEnter={() => setHoveredEmpId(emp.employeeId)}
                  className={`h-16 px-6 flex items-center justify-between cursor-pointer transition-colors relative ${
                    isHovered ? "bg-gray-50/80" : "hover:bg-gray-50/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl ${emp.avatarColor} flex items-center justify-center text-base flex-shrink-0 shadow-xs`}
                    >
                      {emp.avatarIcon || "👤"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-gray-900 truncate">{emp.employeeName}</span>
                      <span className="text-[11px] text-gray-400 font-medium truncate">{emp.employeeTitle}</span>
                    </div>
                  </div>

                  {emp.employeeId === "e5" && (
                    <X size={14} className="text-gray-400 hover:text-gray-700 flex-shrink-0" />
                  )}

                  {/* Dark Popover Card matching Screenshot 3 */}
                  {isHovered && emp.upcomingAbsences && (
                    <div className="absolute left-6 top-16 z-50 bg-[#242933] text-white rounded-2xl shadow-2xl p-4 w-56 flex flex-col gap-2.5 border border-gray-800">
                      <div>
                        <p className="text-xs font-bold text-white">{emp.employeeName}</p>
                        <p className="text-[11px] text-gray-400">{emp.employeeTitle}</p>
                      </div>

                      <div className="border-t border-gray-700/60 pt-2 flex flex-col gap-1.5">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                          Upcoming absences:
                        </p>
                        {emp.upcomingAbsences.map((u, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-[#5FA770]" />
                            <span className="font-medium text-gray-200">{u.dateRange}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Date Grid & Gantt Bars */}
        <div className="flex-1 flex flex-col min-w-[750px] relative">
          {/* Header Row: Days 4 to 18 */}
          <div className="h-14 flex items-center border-b border-gray-100 bg-white sticky top-0 z-10">
            {Array.from({ length: daysInGrid }).map((_, idx) => {
              const dayNum = startDayOffset + idx;
              const { dayName, isWeekend, isToday } = getDayInfo(dayNum);

              return (
                <div
                  key={dayNum}
                  className={`flex-1 h-full flex flex-col items-center justify-center border-r border-gray-100/60 last:border-r-0 ${
                    isWeekend ? "bg-gray-50/60" : ""
                  }`}
                >
                  <span className="text-[11px] font-medium text-gray-400">{dayName}</span>
                  {isToday ? (
                    <span className="w-5 h-5 rounded-full bg-[#1E293B] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                      {dayNum}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-gray-700">{dayNum}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Today Vertical Guide Line (Spans down Tuesday 5th) */}
          <div
            className="absolute top-14 bottom-0 w-[1.5px] bg-[#1E293B]/25 z-10 pointer-events-none"
            style={{
              left: `${((activeDay - startDayOffset + 0.5) / daysInGrid) * 100}%`,
            }}
          />

          {/* Employee Gantt Rows */}
          <div className="flex flex-col divide-y divide-gray-50">
            {absences.map((emp) => {
              const hasLeaveInGrid = emp.startDay > 0 && emp.endDay >= startDayOffset;
              const colWidthPct = 100 / daysInGrid;

              let leftPct = 0;
              let widthPct = 0;

              if (hasLeaveInGrid) {
                const clampedStart = Math.max(emp.startDay, startDayOffset);
                const clampedEnd = Math.min(emp.endDay, startDayOffset + daysInGrid - 1);
                leftPct = (clampedStart - startDayOffset) * colWidthPct;
                widthPct = (clampedEnd - clampedStart + 1) * colWidthPct;
              }

              return (
                <div key={emp.id} className="h-16 flex items-center relative">
                  {/* Background Columns */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: daysInGrid }).map((_, idx) => {
                      const dayNum = startDayOffset + idx;
                      const { isWeekend } = getDayInfo(dayNum);
                      return (
                        <div
                          key={dayNum}
                          className={`flex-1 h-full border-r border-gray-100/60 last:border-r-0 ${
                            isWeekend ? "bg-gray-50/60" : ""
                          }`}
                        />
                      );
                    })}
                  </div>

                  {/* Gantt Bar Pill */}
                  {hasLeaveInGrid && widthPct > 0 && (
                    <div
                      style={{
                        left: `${leftPct}%`,
                        width: `calc(${widthPct}% - 8px)`,
                      }}
                      className={`absolute mx-1 h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white shadow-xs z-10 cursor-pointer hover:opacity-90 transition-opacity ${
                        emp.type === "SICK" ? "bg-[#EE964B]" : "bg-[#5FA770]"
                      }`}
                    >
                      {emp.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Bottom Legend / Filter Pill matching Screenshot 3 */}
      <div className="absolute bottom-6 right-8 z-30 bg-white/95 backdrop-blur-xs border border-gray-200 rounded-xl px-3.5 py-2 shadow-lg flex items-center gap-4 text-xs font-medium text-gray-700">
        <ChevronsRight size={16} className="text-gray-400" />
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EE964B]" />
          <span>Sick leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5FA770]" />
          <span>Vacation</span>
        </div>
      </div>

      {/* Add Absence Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Request Absence</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Absence Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "VACATION", label: "Vacation", color: "bg-[#5FA770]" },
                    { id: "SICK", label: "Sick Leave", color: "bg-[#EE964B]" },
                    { id: "UNPAID", label: "Unpaid", color: "bg-gray-400" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setLeaveType(t.id as any)}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        leaveType === t.id
                          ? "border-[#2F65F6] bg-blue-50/50 text-[#2F65F6]"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${t.color}`} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">Reason / Description</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional note for HR/Manager"
                  rows={2}
                  className="px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2F65F6] hover:bg-[#2555D8] rounded-xl shadow-xs"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

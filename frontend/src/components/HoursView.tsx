import React, { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Folder,
  MoveHorizontal,
} from "lucide-react";
import type { ProjectItem, TimeBlock } from "../types";

interface HoursViewProps {
  currentDate?: Date;
}

const INITIAL_PROJECTS: ProjectItem[] = [
  { id: "p1", name: "AGR Mobile app", color: "#F97316", folderColor: "orange", totalHours: 11 },
  { id: "p2", name: "BNB Web app", color: "#10B981", folderColor: "green", totalHours: 0 },
  { id: "p3", name: "Events", color: "#FB923C", folderColor: "orange", totalHours: 0 },
  { id: "p4", name: "Travel", color: "#1E293B", folderColor: "slate", totalHours: 2 },
  { id: "p5", name: "Consultation", color: "#10B981", folderColor: "green", totalHours: 10 },
  { id: "p6", name: "Design Team inve...", color: "#8B5CF6", folderColor: "purple", totalHours: 3 },
  { id: "p7", name: "HR-Matters", color: "#1E293B", folderColor: "slate", totalHours: 0 },
  { id: "p8", name: "Operation", color: "#8B5CF6", folderColor: "purple", totalHours: 0 },
  { id: "p9", name: "Troubleshooting", color: "#8B5CF6", folderColor: "purple", totalHours: 0 },
];

const INITIAL_BLOCKS: TimeBlock[] = [
  { id: "b1", projectId: "p1", projectName: "AGR...", color: "#F97316", day: 1, startHour: 1, duration: 2 },
  { id: "b2", projectId: "p4", projectName: "Travel", color: "#1E293B", day: 1, startHour: 3, duration: 2 },
  { id: "b3", projectId: "p5", projectName: "Consultation", color: "#10B981", day: 1, startHour: 5, duration: 4 },
  { id: "b4", projectId: "p1", projectName: "AGR Mobile app", color: "#F97316", day: 2, startHour: 1, duration: 4 },
  { id: "b5", projectId: "p5", projectName: "Consultation", color: "#10B981", day: 2, startHour: 5, duration: 4 },
  { id: "b6", projectId: "p1", projectName: "AGR Mobile app", color: "#F97316", day: 3, startHour: 1, duration: 5 },
  { id: "b7", projectId: "p6", projectName: "Design Team inve...", color: "#8B5CF6", day: 3, startHour: 6, duration: 3 },
  { id: "b8", projectId: "p5", projectName: "Consultat...", color: "#10B981", day: 4, startHour: 1, duration: 2 },
];

export const HoursView: React.FC<HoursViewProps> = () => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2023, 3, 1)); // April 2023
  const [projects, setProjects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [blocks, setBlocks] = useState<TimeBlock[]>(INITIAL_BLOCKS);
  const [activeDay] = useState<number>(4); // Thursday 4th from screenshot
  const [resizingBlockId, setResizingBlockId] = useState<string | null>(null);
  const [draggedProject, setDraggedProject] = useState<ProjectItem | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState<"orange" | "green" | "purple" | "slate">("orange");

  const gridRef = useRef<HTMLDivElement>(null);

  // Month navigation
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const formattedMonth = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const resetToday = () => {
    setCurrentMonth(new Date(2023, 3, 1));
  };

  // Calculate total declared hours
  const totalDeclaredHours = blocks.reduce((acc, b) => acc + b.duration, 0);

  // Days list for the month view (1 to 14 shown prominently in screenshot)
  const daysInMonth = 14;
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const getDayDetails = (dayNum: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    const dayName = dayNames[d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isToday = dayNum === activeDay;
    return { dayName, dayNum, isWeekend, isToday };
  };

  // Helper for folder icons and badge styling
  const getFolderClasses = (folderColor: string) => {
    switch (folderColor) {
      case "orange":
        return { bg: "bg-orange-50", text: "text-orange-500", border: "border-orange-200", dot: "#F97316" };
      case "green":
        return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", dot: "#10B981" };
      case "purple":
        return { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200", dot: "#8B5CF6" };
      default:
        return { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300", dot: "#1E293B" };
    }
  };

  // Resizing logic for timeline blocks
  const handleResizeStart = (e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    setResizingBlockId(blockId);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingBlockId || !gridRef.current) return;
      const targetBlock = blocks.find((b) => b.id === resizingBlockId);
      if (!targetBlock) return;

      const gridRect = gridRef.current.getBoundingClientRect();
      const colWidth = gridRect.width / 10;
      const relativeX = e.clientX - gridRect.left;
      const targetEndCol = Math.ceil(relativeX / colWidth);
      const newDuration = Math.max(1, Math.min(10 - targetBlock.startHour + 1, targetEndCol - targetBlock.startHour + 1));

      if (newDuration !== targetBlock.duration) {
        setBlocks((prev) =>
          prev.map((b) => (b.id === resizingBlockId ? { ...b, duration: newDuration } : b))
        );
      }
    };

    const handleMouseUp = () => {
      setResizingBlockId(null);
    };

    if (resizingBlockId) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingBlockId, blocks]);

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    const colors = {
      orange: "#F97316",
      green: "#10B981",
      purple: "#8B5CF6",
      slate: "#1E293B",
    };
    const newProj: ProjectItem = {
      id: `p-${Date.now()}`,
      name: newProjectName.trim(),
      color: colors[newProjectColor],
      folderColor: newProjectColor,
      totalHours: 0,
    };
    setProjects([...projects, newProj]);
    setNewProjectName("");
    setShowAddProjectModal(false);
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen bg-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-8 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Work hours</h1>
        <button className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-xs transition-colors">
          <CalendarIcon size={16} className="text-gray-500" />
          Calendar
          <span className="text-xs text-gray-400">⌵</span>
        </button>
      </div>

      {/* Date Navigation & Hours Summary Subheader */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-sm text-gray-900 min-w-[100px] text-center">
              {formattedMonth}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            onClick={resetToday}
            className="px-3 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="text-sm text-gray-500 font-medium">
          Declared: <span className="font-bold text-gray-900">{totalDeclaredHours}</span> /{" "}
          <span className="font-bold text-gray-900">165</span> hours
        </div>
      </div>

      {/* Main Split Body: Projects List (Left) + Timeline Grid (Right) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Projects Column (Left) */}
        <div className="w-[260px] border-r border-gray-100 p-6 flex flex-col gap-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base text-gray-900">Projects</h2>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 shadow-xs transition-colors"
              title="Add Project"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Project List */}
          <div className="flex flex-col gap-2">
            {projects.map((proj) => {
              const style = getFolderClasses(proj.folderColor);
              return (
                <div
                  key={proj.id}
                  draggable
                  onDragStart={() => setDraggedProject(proj)}
                  onDragEnd={() => setDraggedProject(null)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 cursor-grab active:cursor-grabbing transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-xl ${style.bg} ${style.border} border flex items-center justify-center flex-shrink-0 shadow-xs`}
                  >
                    <Folder size={18} className={style.text} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-gray-900 truncate">{proj.name}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{proj.totalHours} hours</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline Grid (Right) */}
        <div className="flex-1 flex flex-col overflow-x-auto overflow-y-auto p-6 bg-white">
          {/* Header Row: Hours Columns 1 to 10 */}
          <div className="flex items-center border-b border-gray-200 pb-2 mb-2">
            <div className="w-14 text-xs font-semibold text-gray-400 pl-2">Hours:</div>
            <div ref={gridRef} className="flex-1 grid grid-cols-10 gap-0 text-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => (
                <div key={h} className="text-xs font-semibold text-gray-600">
                  {h}
                </div>
              ))}
            </div>
          </div>

          {/* Day Rows */}
          <div className="flex flex-col divide-y divide-gray-100">
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const { dayName, isWeekend, isToday } = getDayDetails(dayNum);
              const dayBlocks = blocks.filter((b) => b.day === dayNum);

              return (
                <div
                  key={dayNum}
                  className={`flex items-center min-h-[48px] py-1 ${
                    isWeekend ? "bg-gray-50/70" : "hover:bg-gray-50/40"
                  } transition-colors`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedProject) {
                      const newBlock: TimeBlock = {
                        id: `b-${Date.now()}`,
                        projectId: draggedProject.id,
                        projectName: draggedProject.name,
                        color: draggedProject.color,
                        day: dayNum,
                        startHour: 1,
                        duration: 2,
                      };
                      setBlocks([...blocks, newBlock]);
                    }
                  }}
                >
                  {/* Day Label Cell */}
                  <div className="w-14 flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-medium text-gray-400 leading-tight">{dayName}</span>
                    {isToday ? (
                      <span className="w-6 h-6 rounded-full bg-[#1E293B] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                        {dayNum}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-800">{dayNum}</span>
                    )}
                  </div>

                  {/* 10-Hour Interactive Grid Cells */}
                  <div className="flex-1 grid grid-cols-10 gap-0 relative h-10 items-center">
                    {/* Background Column Grid Lines */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((col) => (
                      <div
                        key={col}
                        className="h-full border-r border-gray-100/80 last:border-r-0"
                      />
                    ))}

                    {/* Render Time Blocks Positioned Across Grid */}
                    {dayBlocks.map((blk) => {
                      const colStart = blk.startHour;
                      const colSpan = blk.duration;

                      return (
                        <div
                          key={blk.id}
                          style={{
                            gridColumnStart: colStart,
                            gridColumnEnd: `span ${colSpan}`,
                          }}
                          className="absolute inset-y-1 left-1 right-1 z-10 timeline-block bg-[#F1F3F5] rounded-xl px-2.5 flex items-center justify-between shadow-xs border border-gray-200/50 cursor-pointer group select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-1">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: blk.color }}
                            />
                            <span className="text-xs font-semibold text-gray-800 truncate">
                              {blk.projectName}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[11px] font-bold text-gray-700">{blk.duration}h</span>
                            {/* Drag / Resize Handle matching Screenshot 5 */}
                            <div
                              onMouseDown={(e) => handleResizeStart(e, blk.id)}
                              className="cursor-ew-resize opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded text-gray-600 transition-opacity"
                              title="Drag to resize duration"
                            >
                              <MoveHorizontal size={12} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-sm w-full p-6 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900">Create New Project</h3>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. NextGen Mobile App"
                className="px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-700">Theme Color</label>
              <div className="flex items-center gap-3">
                {(["orange", "green", "purple", "slate"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewProjectColor(c)}
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center capitalize ${
                      newProjectColor === c ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent"
                    } ${
                      c === "orange"
                        ? "bg-orange-500 text-white"
                        : c === "green"
                        ? "bg-emerald-500 text-white"
                        : c === "purple"
                        ? "bg-purple-500 text-white"
                        : "bg-slate-800 text-white"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#2F65F6] hover:bg-[#2555D8] rounded-xl shadow-xs"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

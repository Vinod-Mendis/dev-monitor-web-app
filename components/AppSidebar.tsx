"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveSession } from "@/components/ActiveSessionContext";
import { formatElapsedSeconds } from "@/lib/time";
import { Show, UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CheckSquare,
  Folder,
  Users,
  Timer,
  ArrowRight,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
  Activity,
  Layers,
  ListTodo,
} from "lucide-react";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { activeSession } = useActiveSession();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("intern");
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // Live timer for active session widget in sidebar
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Fetch current user details
  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUserName(data.user.name || "User");
            setUserRole(data.user.role || "intern");
            setIsAdmin(data.user.role === "admin");
          }
        }
      } catch (err) {
        // Default to intern
      }
    }
    loadUser();
  }, []);

  // Update active session timer in sidebar
  useEffect(() => {
    if (!activeSession?.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeSession.startTime).getTime();
    const updateElapsed = () => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.startTime]);

  // Close mobile drawer on navigation
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Determine active states for navigation links
  const isTasksActive =
    pathname === "/tasks" ||
    (pathname.startsWith("/tasks/") && !pathname.startsWith("/projects"));
  const isProjectsActive =
    pathname.startsWith("/projects") || pathname.startsWith("/admin/projects");
  const isAdminDashboardActive = pathname === "/admin";

  const navContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        {/* Brand & Role Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <Link href={isAdmin ? "/admin" : "/tasks"} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs shadow-xs">
              DM
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block text-foreground leading-tight">
                Dev Monitor
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {isAdmin ? "Admin Workspace" : "Intern Portal"}
              </span>
            </div>
          </Link>

          {/* Role Tag */}
          {isAdmin ? (
            <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 text-[10px] py-0.5 px-2 font-bold">
              <ShieldCheck className="w-3 h-3 text-purple-600" />
              Admin
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px] py-0.5 px-2 font-bold">
              <GraduationCap className="w-3 h-3 text-emerald-600" />
              Intern
            </Badge>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-3 mb-2">
            {isAdmin ? "Management & Monitoring" : "My Workspace"}
          </p>

          {isAdmin ? (
            /* Admin Navigation Items */
            <>
              <Link
                href="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isAdminDashboardActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Command Center</span>
              </Link>

              <Link
                href="/projects"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isProjectsActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <Folder className="w-4 h-4 shrink-0" />
                <span>Projects Directory</span>
              </Link>

              <Link
                href="/tasks"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isTasksActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <ListTodo className="w-4 h-4 shrink-0" />
                <span>All Tasks</span>
              </Link>
            </>
          ) : (
            /* Intern Navigation Items */
            <>
              <Link
                href="/tasks"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isTasksActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span>My Assigned Tasks</span>
              </Link>

              <Link
                href="/projects"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                  isProjectsActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                }`}
              >
                <Folder className="w-4 h-4 shrink-0" />
                <span>My Projects</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Footer Area: Active Session Widget + User Profile */}
      <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        {/* Live Active Session Widget (if intern or admin has an active session) */}
        {activeSession && (
          <Link
            href={`/tasks/${activeSession.task._id}`}
            className="block p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 transition group"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Active Timer
              </span>
              <span className="font-mono text-xs font-bold text-amber-900 dark:text-amber-200">
                {formatElapsedSeconds(elapsedSeconds)}
              </span>
            </div>
            <p className="text-xs font-semibold line-clamp-1 text-foreground group-hover:text-primary transition-colors">
              {activeSession.task.title}
            </p>
          </Link>
        )}

        {/* User Profile Bar */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-100/70 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserButton />
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{userRole}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <Link href={isAdmin ? "/admin" : "/tasks"} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
            DM
          </div>
          <span className="font-bold text-sm">Dev Monitor</span>
          <Badge
            variant="outline"
            className="text-[10px] py-0 px-1.5 capitalize font-semibold ml-1"
          >
            {userRole}
          </Badge>
        </Link>

        <div className="flex items-center gap-2">
          <UserButton />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="h-8 w-8 text-foreground cursor-pointer"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Slide-Out Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-zinc-900 shadow-2xl z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-bold text-sm">Menu</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsMobileOpen(false)}
                className="h-7 w-7 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">{navContent}</div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Left Sidebar (Fixed 260px) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-30 shadow-xs">
        {navContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

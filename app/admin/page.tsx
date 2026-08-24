"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LiveMonitoringDashboard } from "@/components/LiveMonitoringDashboard";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { UsersDirectory } from "@/components/UsersDirectory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/time";
import {
  LayoutDashboard,
  PlusCircle,
  Activity,
  ListTodo,
  User,
  Users,
  Clock,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Folder,
  AlertCircle,
  Eye,
  AlertTriangle,
} from "lucide-react";

interface AdminTaskItem {
  _id: string;
  title: string;
  description: string;
  status:
    | "not_started"
    | "in_progress"
    | "paused"
    | "under_review"
    | "fixes_needed"
    | "completed";
  estimatedMinutes?: number;
  totalDurationMinutes: number;
  sessionCount: number;
  reviewNote?: string;
  project?: {
    _id: string;
    name: string;
  };
  assignedTo?: {
    _id: string;
    name: string;
    clerkId: string;
    role: string;
  };
  createdBy?: {
    name: string;
  };
  createdAt: string;
  isStale?: boolean;
  daysInactive?: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Active Tab state: "live" | "create" | "all_tasks" | "users"
  const [activeTab, setActiveTab] = useState<"live" | "create" | "all_tasks" | "users">("live");

  // User role verification
  const [checkingRole, setCheckingRole] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // All Tasks State
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  // Filter state for all_tasks
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function checkRole() {
      try {
        setCheckingRole(true);
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user?.role === "admin") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    }

    checkRole();
  }, []);

  const fetchAllTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      setTasksError(null);
      const res = await fetch("/api/tasks");
      if (!res.ok) {
        throw new Error(`Failed to load tasks (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      } else {
        setTasks([]);
      }
    } catch (err: any) {
      setTasksError(err.message || "Failed to load tasks.");
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAllTasks();
    }
  }, [isAdmin, fetchAllTasks]);

  if (checkingRole) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold">Admin Access Required</h1>
        <p className="text-sm text-muted-foreground">
          You must be logged in with an admin account to view the admin dashboard.
        </p>
        <Link href="/tasks">
          <Button variant="outline" className="mt-2 cursor-pointer">
            Go to My Tasks
          </Button>
        </Link>
      </div>
    );
  }

  const renderStatusBadge = (status: AdminTaskItem["status"]) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 font-semibold text-xs">
            <PlayCircle className="w-3 h-3" /> In Progress
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold text-xs">
            <PauseCircle className="w-3 h-3" /> Paused
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 font-semibold text-xs">
            <Eye className="w-3 h-3 text-purple-600" /> Under Review
          </Badge>
        );
      case "fixes_needed":
        return (
          <Badge className="bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 gap-1 font-semibold text-xs">
            <AlertTriangle className="w-3 h-3 text-orange-600" /> Fixes Needed
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold text-xs">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case "not_started":
      default:
        return (
          <Badge variant="outline" className="gap-1 text-xs">
            <HelpCircle className="w-3 h-3" /> Not Started
          </Badge>
        );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "stale") return t.isStale;
    return t.status === statusFilter;
  });

  const staleCount = tasks.filter((t) => t.isStale).length;
  const underReviewCount = tasks.filter((t) => t.status === "under_review").length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Admin Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor intern activity live, review submitted work, assign tasks, manage projects, and oversee team performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/projects">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer text-xs font-semibold">
              <Folder className="w-4 h-4" />
              Manage Projects
            </Button>
          </Link>
          <Badge variant="secondary" className="px-3 py-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium">
            Role: Admin
          </Badge>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
            activeTab === "live"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          Live Monitor
        </button>

        <button
          onClick={() => setActiveTab("create")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
            activeTab === "create"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Create Task
        </button>

        <button
          onClick={() => setActiveTab("all_tasks")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
            activeTab === "all_tasks"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <ListTodo className="w-4 h-4" />
          All Tasks ({tasks.length})
          {underReviewCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-600 text-white font-bold animate-pulse">
              {underReviewCount} review
            </span>
          )}
          {staleCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {staleCount} stale
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <Users className="w-4 h-4" />
          Team Members
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "live" && <LiveMonitoringDashboard showProjectFilter={true} />}

      {activeTab === "users" && <UsersDirectory />}

      {activeTab === "create" && (
        <div className="max-w-2xl mx-auto">
          <CreateTaskForm
            onSuccess={() => {
              fetchAllTasks();
            }}
          />
        </div>
      )}

      {activeTab === "all_tasks" && (
        <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Team Tasks Overview</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Filter status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-white dark:bg-zinc-900 px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="under_review">Under Review ({underReviewCount})</option>
                <option value="fixes_needed">Fixes Needed</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                {staleCount > 0 && <option value="stale">Stale Tasks ({staleCount})</option>}
              </select>
            </div>
          </div>

          {tasksError && (
            <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg text-xs">
              {tasksError}
            </div>
          )}

          {loadingTasks ? (
            <div className="w-full space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 bg-white dark:bg-zinc-900 border rounded-xl flex items-center justify-between">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground w-full">
              No tasks found matching filter criteria.
            </Card>
          ) : (
            <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Task</th>
                      <th className="px-4 py-3.5">Project</th>
                      <th className="px-4 py-3.5">Assigned Intern</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Time Logged</th>
                      <th className="px-4 py-3.5">Sessions</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {filteredTasks.map((t) => (
                      <tr
                        key={t._id}
                        className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer ${
                          t.isStale ? "bg-amber-500/[0.02]" : ""
                        }`}
                        onClick={() => router.push(`/tasks/${t._id}`)}
                      >
                        {/* Task Title & Description */}
                        <td className="px-5 py-4 align-top">
                          <div className="space-y-1 max-w-sm">
                            <Link
                              href={`/tasks/${t._id}`}
                              className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors hover:underline block leading-snug"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t.title}
                            </Link>
                            {t.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                            )}
                            {t.isStale && (
                              <Badge
                                variant="outline"
                                className="bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40 text-[10px] gap-1 font-bold mt-1"
                              >
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                Stale ({t.daysInactive}d inactive)
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Project */}
                        <td className="px-4 py-4 align-top whitespace-nowrap">
                          {t.project?.name ? (
                            <Link
                              href={`/projects/${t.project._id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Folder className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[130px]">{t.project.name}</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Assigned Intern */}
                        <td className="px-4 py-4 align-top whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-[10px] text-foreground">
                              {(t.assignedTo?.name || "U")[0].toUpperCase()}
                            </div>
                            <span className="font-medium text-xs text-foreground">
                              {t.assignedTo?.name || t.assignedTo?.clerkId || "Unassigned"}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4 align-top whitespace-nowrap">
                          {renderStatusBadge(t.status)}
                        </td>

                        {/* Time Logged */}
                        <td className="px-4 py-4 align-top whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              {formatDuration(t.totalDurationMinutes)}
                            </span>
                            {t.estimatedMinutes ? (
                              <span className="text-muted-foreground text-[11px] block">
                                / est. {formatDuration(t.estimatedMinutes)}
                              </span>
                            ) : null}
                          </div>
                        </td>

                        {/* Sessions */}
                        <td className="px-4 py-4 align-top whitespace-nowrap text-xs text-muted-foreground font-medium">
                          {t.sessionCount || 0} sessions
                        </td>

                        {/* Action */}
                        <td className="px-5 py-4 align-top whitespace-nowrap text-right">
                          <Link href={`/tasks/${t._id}`} onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                            >
                              <span>{t.status === "under_review" ? "Review" : "Details"}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

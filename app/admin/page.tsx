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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
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
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
            activeTab === "all_tasks"
              ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <ListTodo className="w-4 h-4" />
          All Tasks ({tasks.length})
          {underReviewCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-purple-600 text-white font-bold animate-pulse">
              {underReviewCount} for review
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
          className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
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
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Team Tasks Overview</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Filter status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-white dark:bg-zinc-900 px-2.5 text-xs shadow-xs"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="p-6 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </Card>
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No tasks found matching filter criteria.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((t) => (
                <Link key={t._id} href={`/tasks/${t._id}`} className="group block focus:outline-none">
                  <Card
                    className={`h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm flex flex-col justify-between ${
                      t.isStale ? "border-amber-500/40 bg-amber-500/[0.02]" : ""
                    }`}
                  >
                    <CardHeader className="space-y-2 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                            {t.title}
                          </CardTitle>
                          {t.project?.name && (
                            <Badge variant="outline" className="text-[10px] font-normal bg-zinc-100 dark:bg-zinc-800">
                              <Folder className="w-3 h-3 text-muted-foreground mr-1" />
                              {t.project.name}
                            </Badge>
                          )}
                          {t.isStale && (
                            <Badge variant="outline" className="ml-1 bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40 text-[10px] gap-1 font-bold">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              Stale ({t.daysInactive}d inactive)
                            </Badge>
                          )}
                        </div>
                        {renderStatusBadge(t.status)}
                      </div>
                      <CardDescription className="line-clamp-2 text-xs">
                        {t.description || "No description provided."}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0 space-y-3">
                      <div className="flex items-center gap-2 text-xs bg-zinc-100 dark:bg-zinc-800/60 p-2 rounded-md">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Assigned to:</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {t.assignedTo?.name || t.assignedTo?.clerkId || "Unassigned"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2.5">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Time:</span>
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">
                            {formatDuration(t.totalDurationMinutes)}
                          </span>
                          {t.estimatedMinutes && (
                            <span className="text-muted-foreground text-[11px]">
                              / est. {formatDuration(t.estimatedMinutes)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-xs group-hover:text-foreground transition-colors">
                          <span>Details</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

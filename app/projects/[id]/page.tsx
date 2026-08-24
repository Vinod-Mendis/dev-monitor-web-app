"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { LiveMonitoringDashboard } from "@/components/LiveMonitoringDashboard";
import { CreateTaskForm } from "@/components/CreateTaskForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatDate } from "@/lib/time";
import { getDeadlinePaceSignal } from "@/lib/projectUtils";
import {
  Folder,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  PlusCircle,
  PlayCircle,
  PauseCircle,
  HelpCircle,
  Edit,
  ArrowRight,
  AlertCircle,
  Activity,
  ListTodo,
  ShieldAlert,
  Eye,
} from "lucide-react";

interface ProjectDetailTask {
  _id: string;
  title: string;
  description?: string;
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
  lastActivityDate?: string;
  daysInactive?: number;
  isStale?: boolean;
}

interface ProjectDetailData {
  _id: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "archived";
  deadline?: string | null;
  totalTasks: number;
  completedTasks: number;
  estimatedMinutes: number;
  totalDurationMinutes: number;
  createdBy?: {
    name: string;
  };
  createdAt: string;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [tasks, setTasks] = useState<ProjectDetailTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter for tasks
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Admin tabs & Dialogs
  const [activeTab, setActiveTab] = useState<"tasks" | "live_monitoring">("tasks");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState<boolean>(false);

  useEffect(() => {
    async function checkRole() {
      try {
        const res = await fetch("/api/user/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user?.role === "admin") {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        // Default to intern
      }
    }
    checkRole();
  }, []);

  const fetchProjectData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch project details (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && data.project) {
        setProject(data.project);
        setTasks(data.tasks || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load project detail.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-32" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </Card>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects Directory
        </Link>
        <Card className="p-6 border-destructive/50 bg-destructive/5 text-destructive space-y-2">
          <CardTitle className="text-base font-semibold">Error Loading Project</CardTitle>
          <CardDescription className="text-destructive/90">
            {error || "Project not found or access denied."}
          </CardDescription>
        </Card>
      </div>
    );
  }

  const completionPercent =
    project.totalTasks > 0
      ? Math.round((project.completedTasks / project.totalTasks) * 100)
      : 0;

  const paceSignal = getDeadlinePaceSignal(project);

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "stale") return t.isStale;
    return t.status === statusFilter;
  });

  const staleTaskCount = tasks.filter((t) => t.isStale).length;

  const renderStatusBadge = (status: ProjectDetailTask["status"]) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 text-xs">
            <PlayCircle className="w-3 h-3" /> In Progress
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs">
            <PauseCircle className="w-3 h-3" /> Paused
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 text-xs">
            <Eye className="w-3 h-3 text-purple-600" /> Under Review
          </Badge>
        );
      case "fixes_needed":
        return (
          <Badge className="bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 gap-1 text-xs">
            <AlertTriangle className="w-3 h-3 text-orange-600" /> Fixes Needed
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-xs">
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

  const renderPaceSignalBadge = () => {
    switch (paceSignal.label) {
      case "Behind Pace":
        return (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 gap-1 font-bold text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Behind Pace
          </Badge>
        );
      case "On Track":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
            On Track
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back Link & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="space-y-1">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1 font-medium transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Projects
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge
              variant={project.status === "active" ? "default" : "secondary"}
              className="text-xs capitalize"
            >
              {project.status}
            </Badge>
            {renderPaceSignalBadge()}
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Project
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateTaskOpen(true)}
              className="gap-1.5 cursor-pointer text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Task
            </Button>
          </div>
        )}
      </div>

      {/* Project Metadata Card */}
      <Card className="shadow-xs w-full">
        <CardContent className="p-4 sm:p-6 space-y-4">
          {project.description && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {project.description}
            </p>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground font-medium block">Deadline</span>
              <span className="font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                {project.deadline ? formatDate(project.deadline) : "No deadline"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground font-medium block">
                Total Time Logged
              </span>
              <span className="font-semibold text-sm flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {formatDuration(project.totalDurationMinutes)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground font-medium block">
                Task Completion
              </span>
              <span className="font-bold text-sm text-foreground block mt-0.5">
                {project.completedTasks} / {project.totalTasks} ({completionPercent}%)
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground font-medium block">
                Total Tasks
              </span>
              <span className="font-bold text-sm text-foreground block mt-0.5">
                {project.totalTasks} tasks
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Tab Switching */}
      {isAdmin ? (
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "tasks"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Project Tasks ({tasks.length})
            {staleTaskCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {staleTaskCount} stale
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("live_monitoring")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              activeTab === "live_monitoring"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-black"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <Activity className="w-4 h-4" />
            Live Monitoring
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            My Assigned Tasks in this Project
          </h2>
          <span className="text-xs text-muted-foreground font-medium">
            {filteredTasks.length} {filteredTasks.length === 1 ? "task" : "tasks"}
          </span>
        </div>
      )}

      {/* Task List / Content */}
      {(activeTab === "tasks" || !isAdmin) && (
        <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isAdmin ? "All Project Tasks" : "Select a task to open timer and log work"}
            </span>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Filter status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-white dark:bg-zinc-900 px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Statuses</option>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="under_review">Under Review</option>
                <option value="fixes_needed">Fixes Needed</option>
                <option value="completed">Completed</option>
                {staleTaskCount > 0 && <option value="stale">Stale Tasks ({staleTaskCount})</option>}
              </select>
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground space-y-2 w-full">
              <p className="font-semibold text-foreground">No tasks found</p>
              <p className="text-xs">
                {isAdmin
                  ? "No tasks match the selected filter."
                  : "You have no tasks matching this filter in this project."}
              </p>
            </Card>
          ) : (
            <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Task</th>
                      {isAdmin && <th className="px-4 py-3.5">Assigned To</th>}
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

                        {/* Assigned To (Admin only) */}
                        {isAdmin && (
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
                        )}

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
                              <span>{isAdmin ? (t.status === "under_review" ? "Review" : "Details") : (t.status === "completed" ? "View Task" : "Work on Task")}</span>
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

      {/* Admin Live Monitoring Tab */}
      {isAdmin && activeTab === "live_monitoring" && (
        <div className="space-y-4">
          <LiveMonitoringDashboard
            projectId={projectId}
            showProjectFilter={false}
          />
        </div>
      )}

      {/* Dialogs */}
      {isAdmin && (
        <>
          <ProjectFormDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            projectToEdit={project}
            onSuccess={fetchProjectData}
          />

          {isCreateTaskOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border shadow-xl">
                <div className="flex justify-end mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCreateTaskOpen(false)}
                    className="cursor-pointer text-xs"
                  >
                    Close
                  </Button>
                </div>
                <CreateTaskForm
                  defaultProjectId={projectId}
                  onSuccess={() => {
                    setIsCreateTaskOpen(false);
                    fetchProjectData();
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

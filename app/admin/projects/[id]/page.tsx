"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
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
} from "lucide-react";

interface ProjectDetailTask {
  _id: string;
  title: string;
  description?: string;
  status: "not_started" | "in_progress" | "paused" | "completed";
  estimatedMinutes?: number;
  totalDurationMinutes: number;
  sessionCount: number;
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

  const [project, setProject] = useState<ProjectDetailData | null>(null);
  const [tasks, setTasks] = useState<ProjectDetailTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter for tasks
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit Project Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState<boolean>(false);

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
        <Link href="/admin/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects Directory
        </Link>
        <Card className="p-6 border-destructive/50 bg-destructive/5 text-destructive space-y-2">
          <CardTitle className="text-base font-semibold">Error Loading Project</CardTitle>
          <CardDescription className="text-destructive/90">{error || "Project not found."}</CardDescription>
        </Card>
      </div>
    );
  }

  const completionPercent = project.totalTasks > 0
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
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1">
            <PlayCircle className="w-3 h-3" /> In Progress
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
            <PauseCircle className="w-3 h-3" /> Paused
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case "not_started":
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <HelpCircle className="w-3 h-3" /> Not Started
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/admin/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects Directory
        </Link>
      </div>

      {/* Main Project Header Card */}
      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader className="space-y-4 border-b pb-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  {project.name}
                </h1>
                <Badge
                  className={
                    project.status === "active"
                      ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30"
                      : project.status === "completed"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                      : "bg-zinc-200 text-zinc-700 border-zinc-300"
                  }
                >
                  {project.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line pt-1">
                {project.description || "No project description provided."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
                className="cursor-pointer gap-1.5 text-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Project
              </Button>

              <Button
                onClick={() => setIsCreateTaskOpen(!isCreateTaskOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5 text-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Add Task to Project
              </Button>
            </div>
          </div>

          {/* Time & Deadline Metrics Summary Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            {/* Task completion progress */}
            <div className="space-y-1.5">
              <span className="text-muted-foreground block font-medium">Task Completion Rate</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-foreground">
                  {completionPercent}%
                </span>
                <span className="text-muted-foreground">
                  ({project.completedTasks} / {project.totalTasks} completed)
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>

            {/* Time logged vs estimated */}
            <div className="space-y-1.5">
              <span className="text-muted-foreground block font-medium">Logged vs Estimated</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-foreground flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {formatDuration(project.totalDurationMinutes)}
                </span>
                {project.estimatedMinutes > 0 && (
                  <span className="text-muted-foreground">
                    / {formatDuration(project.estimatedMinutes)} est.
                  </span>
                )}
              </div>
            </div>

            {/* Target Deadline & Burn-rate Pace Signal */}
            <div className="space-y-1.5">
              <span className="text-muted-foreground block font-medium">Deadline & Burn-Rate Pace</span>
              {project.deadline ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formatDate(project.deadline)}</span>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      paceSignal.color === "emerald"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1"
                        : paceSignal.color === "amber"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-bold animate-pulse"
                        : "text-muted-foreground"
                    }
                  >
                    {paceSignal.color === "amber" ? (
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    )}
                    {paceSignal.label}
                  </Badge>
                </div>
              ) : (
                <span className="text-muted-foreground italic">No deadline set</span>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Optional inline Create Task form */}
      {isCreateTaskOpen && (
        <div className="max-w-2xl mx-auto">
          <CreateTaskForm
            defaultProjectId={project._id}
            onSuccess={() => {
              setIsCreateTaskOpen(false);
              fetchProjectData();
            }}
          />
        </div>
      )}

      {/* Project-Scoped Live Monitoring Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Project Live Activity Monitor
          </h2>
        </div>
        <LiveMonitoringDashboard projectId={project._id} />
      </div>

      {/* Project-Scoped Tasks List Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-bold tracking-tight">Project Tasks ({tasks.length})</h2>
            {staleTaskCount > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/40 gap-1 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {staleTaskCount} Stale Task{staleTaskCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Filter status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-white dark:bg-zinc-900 px-2.5 shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              {staleTaskCount > 0 && <option value="stale">Stale Only ({staleTaskCount})</option>}
            </select>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No tasks found in this project matching the filter criteria.
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
                        {/* Stale Task Flag */}
                        {t.isStale && (
                          <Badge variant="outline" className="bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40 text-[11px] gap-1 font-semibold">
                            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            Stale Task (No activity in {t.daysInactive} days)
                          </Badge>
                        )}
                      </div>

                      <div>{renderStatusBadge(t.status)}</div>
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
                        <span>Logged:</span>
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">
                          {formatDuration(t.totalDurationMinutes)}
                        </span>
                        {t.estimatedMinutes && (
                          <span className="text-muted-foreground text-[11px]">
                            / {formatDuration(t.estimatedMinutes)} est.
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

      {/* Edit project dialog */}
      <ProjectFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        projectToEdit={project}
        onSuccess={fetchProjectData}
      />
    </div>
  );
}

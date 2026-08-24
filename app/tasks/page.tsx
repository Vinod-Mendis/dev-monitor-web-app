"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/time";
import {
  Clock,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  HelpCircle,
  ArrowRight,
  Folder,
  Layers,
  Search,
  Eye,
  AlertTriangle,
} from "lucide-react";

export interface TaskItem {
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
  createdAt: string;
  updatedAt: string;
}

export default function TaskListPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/tasks");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch tasks (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (data.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        } else {
          setTasks([]);
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, []);

  function renderStatusBadge(status: TaskItem["status"]) {
    switch (status) {
      case "in_progress":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/30 gap-1 font-semibold text-xs">
            <PlayCircle className="w-3.5 h-3.5" />
            In Progress
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold text-xs">
            <PauseCircle className="w-3.5 h-3.5" />
            Paused
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 font-semibold text-xs">
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            Under Review
          </Badge>
        );
      case "fixes_needed":
        return (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/30 gap-1 font-semibold text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            Fixes Needed
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </Badge>
        );
      case "not_started":
      default:
        return (
          <Badge variant="outline" className="text-zinc-600 dark:text-zinc-400 gap-1 text-xs">
            <HelpCircle className="w-3.5 h-3.5" />
            Not Started
          </Badge>
        );
    }
  }

  // Extract unique projects list from tasks
  const uniqueProjectsMap = new Map<string, string>();
  tasks.forEach((t) => {
    if (t.project?._id && t.project?.name) {
      uniqueProjectsMap.set(t.project._id, t.project.name);
    }
  });
  const projectList = Array.from(uniqueProjectsMap.entries()).map(([id, name]) => ({ id, name }));

  const filteredTasks = tasks.filter((t) => {
    if (selectedProjectId !== "all" && t.project?._id !== selectedProjectId) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = t.title.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q);
      const projMatch = t.project?.name.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !projMatch) return false;
    }
    return true;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View your assigned tasks, track time, and submit completed work for review.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/projects">
            <Button variant="outline" className="text-xs font-semibold gap-1.5 cursor-pointer">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              View My Projects ({projectList.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-xs rounded-md border border-input bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9 rounded-md border border-input bg-white dark:bg-zinc-950 px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Projects ({tasks.length})</option>
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-white dark:bg-zinc-950 px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="under_review">Under Review</option>
              <option value="fixes_needed">Fixes Needed</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tasks Table (Full Width) */}
      {loading ? (
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
        <Card className="p-12 text-center space-y-3 w-full">
          <CardTitle className="text-base font-semibold">No tasks found</CardTitle>
          <CardDescription className="text-xs">
            {tasks.length === 0
              ? "You currently have no assigned tasks. Check back later or contact your admin."
              : "No tasks matched your search or filter criteria."}
          </CardDescription>
        </Card>
      ) : (
        <div className="w-full overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Task</th>
                  <th className="px-4 py-3.5">Project</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Time Logged</th>
                  <th className="px-4 py-3.5">Sessions</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredTasks.map((task) => (
                  <tr
                    key={task._id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/tasks/${task._id}`)}
                  >
                    {/* Task Title & Description */}
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-1 max-w-lg">
                        <Link
                          href={`/tasks/${task._id}`}
                          className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors hover:underline block leading-snug"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.title}
                        </Link>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                        )}
                        {task.reviewNote && task.status === "fixes_needed" && (
                          <p className="text-[11px] text-orange-700 dark:text-orange-300 italic line-clamp-1 flex items-center gap-1 font-medium mt-1">
                            <AlertTriangle className="w-3 h-3 text-orange-600 shrink-0" />
                            Note: "{task.reviewNote}"
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      {task.project?.name ? (
                        <Link
                          href={`/projects/${task.project._id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Folder className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px]">{task.project.name}</span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      {renderStatusBadge(task.status)}
                    </td>

                    {/* Time Logged */}
                    <td className="px-4 py-4 align-top whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-xs text-foreground flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {formatDuration(task.totalDurationMinutes)}
                        </span>
                        {task.estimatedMinutes ? (
                          <span className="text-muted-foreground text-[11px] block">
                            est. {formatDuration(task.estimatedMinutes)}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    {/* Sessions */}
                    <td className="px-4 py-4 align-top whitespace-nowrap text-xs text-muted-foreground font-medium">
                      {task.sessionCount || 0} sessions
                    </td>

                    {/* Action Button */}
                    <td className="px-5 py-4 align-top whitespace-nowrap text-right">
                      <Link href={`/tasks/${task._id}`} onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-semibold gap-1.5 hover:bg-primary hover:text-primary-foreground cursor-pointer"
                        >
                          <span>{task.status === "completed" ? "View Details" : "Work on Task"}</span>
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
  );
}

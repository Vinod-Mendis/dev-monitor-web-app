"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-500/30 gap-1">
            <PlayCircle className="w-3.5 h-3.5" />
            In Progress
          </Badge>
        );
      case "paused":
        return (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30 gap-1">
            <PauseCircle className="w-3.5 h-3.5" />
            Paused
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="secondary" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1">
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            Under Review
          </Badge>
        );
      case "fixes_needed":
        return (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/30 gap-1 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            Fixes Needed
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </Badge>
        );
      case "not_started":
      default:
        return (
          <Badge variant="outline" className="text-zinc-600 dark:text-zinc-400 gap-1">
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            View your assigned tasks and track time worked on each item.
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="pt-4 flex justify-between items-center border-t">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <CardTitle className="text-base font-semibold">No tasks found</CardTitle>
          <CardDescription className="text-xs">
            {tasks.length === 0
              ? "You currently have no assigned tasks. Check back later or contact your admin."
              : "No tasks matched your search or filter criteria."}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <Link key={task._id} href={`/tasks/${task._id}`} className="group block focus:outline-none">
              <Card className="h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-xs group-hover:shadow-sm flex flex-col justify-between">
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {task.title}
                      </CardTitle>
                      {task.project?.name && (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <Folder className="w-3 h-3 text-muted-foreground mr-1" />
                          {task.project.name}
                        </Badge>
                      )}
                    </div>
                    {renderStatusBadge(task.status)}
                  </div>
                  <CardDescription className="line-clamp-2 text-xs">
                    {task.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3 mt-2">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Accumulated:</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatDuration(task.totalDurationMinutes)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                      <span>Work on Task</span>
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
  );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ProjectFormDialog } from "@/components/ProjectFormDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatDate } from "@/lib/time";
import { getDeadlinePaceSignal } from "@/lib/projectUtils";
import {
  Folder,
  PlusCircle,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Edit,
  FolderArchive,
  Layers,
  Search,
  ListTodo,
} from "lucide-react";

export interface ProjectListItem {
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

export default function ProjectsOverviewPage() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingRole, setCheckingRole] = useState<boolean>(true);

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dialog State (Admin only)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<ProjectListItem | null>(null);

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
        }
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setCheckingRole(false);
      }
    }

    checkRole();
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/projects");
      if (!res.ok) {
        throw new Error(`Failed to load projects (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.projects)) {
        setProjects(data.projects);
      } else {
        setProjects([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load projects list.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleOpenCreateDialog = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (e: React.MouseEvent, p: ProjectListItem) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(p);
    setIsDialogOpen(true);
  };

  const renderStatusBadge = (status: ProjectListItem["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 font-semibold text-xs">
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold text-xs">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="text-zinc-500 gap-1 font-medium text-xs">
            <FolderArchive className="w-3 h-3" /> Archived
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderPaceSignalBadge = (p: ProjectListItem) => {
    const signal = getDeadlinePaceSignal(p);
    switch (signal) {
      case "overdue":
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px] gap-1 font-bold">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </Badge>
        );
      case "due_soon":
        return (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1 font-bold">
            <Clock className="w-3 h-3 text-amber-600" /> Due Soon
          </Badge>
        );
      case "healthy":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-[10px] gap-1 font-medium">
            On Track
          </Badge>
        );
      default:
        return null;
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);
      if (!nameMatch && !descMatch) return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {isAdmin ? "Projects Directory" : "My Projects"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin
              ? "Manage all workspace projects, monitor deadlines, and track cross-team progress."
              : "Projects you have assigned tasks in. Select a project to view and focus on your tasks."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              onClick={handleOpenCreateDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              New Project
            </Button>
          )}
          <Link href="/tasks">
            <Button variant="outline" className="text-xs font-medium gap-1.5 cursor-pointer">
              <ListTodo className="w-4 h-4" />
              My Tasks
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 h-9 text-xs rounded-md border border-input bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Status:</span>
          <div className="flex items-center bg-zinc-200/60 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-zinc-950 text-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white dark:bg-zinc-950 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                statusFilter === "completed"
                  ? "bg-white dark:bg-zinc-950 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Completed
            </button>
            {isAdmin && (
              <button
                onClick={() => setStatusFilter("archived")}
                className={`px-3 py-1 rounded-md transition cursor-pointer ${
                  statusFilter === "archived"
                    ? "bg-white dark:bg-zinc-950 text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Archived
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Project Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex justify-between items-start">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Folder className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <CardTitle className="text-base font-semibold">
            {isAdmin ? "No projects found" : "No projects assigned yet"}
          </CardTitle>
          <CardDescription className="text-xs max-w-sm mx-auto">
            {isAdmin
              ? "Create your first project to start organizing team tasks and tracking deadlines."
              : "You haven't been assigned tasks in any project yet. Once your admin assigns you a task, its project will appear here."}
          </CardDescription>
          {isAdmin && (
            <Button
              onClick={handleOpenCreateDialog}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Create Project
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const completionPercent =
              p.totalTasks > 0
                ? Math.round((p.completedTasks / p.totalTasks) * 100)
                : 0;

            return (
              <Link
                key={p._id}
                href={`/projects/${p._id}`}
                className="group block focus:outline-none"
              >
                <Card className="h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between">
                  <CardHeader className="p-5 pb-3 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-1">
                          {p.name}
                        </CardTitle>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderStatusBadge(p.status)}
                          {renderPaceSignalBadge(p)}
                        </div>
                      </div>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => handleOpenEditDialog(e, p)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                          title="Edit Project"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>

                    <CardDescription className="line-clamp-2 text-xs min-h-[2rem]">
                      {p.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3.5">
                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span>{isAdmin ? "Tasks Completion" : "My Tasks Progress"}</span>
                        <span className="font-bold text-foreground">
                          {p.completedTasks}/{p.totalTasks} ({completionPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-lg text-xs border border-zinc-100 dark:border-zinc-800/80">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          Time Logged
                        </span>
                        <span className="font-bold text-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {formatDuration(p.totalDurationMinutes)}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium block">
                          Deadline
                        </span>
                        <span className="font-medium text-foreground flex items-center gap-1 text-[11px] truncate">
                          <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                          {formatDate(p.deadline)}
                        </span>
                      </div>
                    </div>

                    {/* Footer Link */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                      <span className="text-[11px]">
                        {p.totalTasks} {p.totalTasks === 1 ? "task" : "tasks"}
                      </span>
                      <div className="flex items-center gap-1 font-medium text-foreground group-hover:text-primary transition-colors text-xs">
                        <span>{isAdmin ? "View Project" : "View Project Tasks"}</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Admin Create/Edit Project Dialog */}
      {isAdmin && (
        <ProjectFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          projectToEdit={editingProject}
          onSuccess={fetchProjects}
        />
      )}
    </div>
  );
}

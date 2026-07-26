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
  ShieldAlert,
  Edit,
  FolderArchive,
  BarChart3,
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
  const [checkingRole, setCheckingRole] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status Filter: "all" | "active" | "completed" | "archived"
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog State
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
      setError(err.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchProjects();
    }
  }, [isAdmin, fetchProjects]);

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
          You must be logged in as an admin to manage projects.
        </p>
        <Link href="/tasks">
          <Button variant="outline" className="mt-2 cursor-pointer">
            Go to My Tasks
          </Button>
        </Link>
      </div>
    );
  }

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === "all") return true;
    return p.status === statusFilter;
  });

  const renderStatusBadge = (status: ProjectListItem["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">
            Active
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
            Completed
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="text-muted-foreground border-zinc-400">
            Archived
          </Badge>
        );
      default:
        return <Badge variant="outline">Active</Badge>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Projects Directory
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage projects, monitor progress, deadline burn-rate signals, and time allocation.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditingProject(null);
            setIsDialogOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 cursor-pointer sm:w-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Project
        </Button>
      </div>

      {/* Filter and stats bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground">Status filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-white dark:bg-zinc-900 px-2.5 shadow-xs font-medium"
          >
            <option value="all">All Projects ({projects.length})</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground">
          <span>Total Projects: <strong>{projects.length}</strong></span>
          <span>Active: <strong>{projects.filter(p => p.status === 'active').length}</strong></span>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-8 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-dashed">
          <FolderArchive className="w-10 h-10 text-muted-foreground mx-auto" />
          <CardTitle className="text-base font-semibold">No projects found</CardTitle>
          <CardDescription className="text-xs">
            {statusFilter === "all"
              ? "Get started by creating your first project layer above."
              : `No projects found with status "${statusFilter}".`}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p) => {
            const completionPercent = p.totalTasks > 0
              ? Math.round((p.completedTasks / p.totalTasks) * 100)
              : 0;

            const paceSignal = getDeadlinePaceSignal(p);

            return (
              <Card
                key={p._id}
                className="h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm flex flex-col justify-between"
              >
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {p.name}
                      </CardTitle>
                      <span className="text-[11px] text-muted-foreground block">
                        Created {formatDate(p.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {renderStatusBadge(p.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingProject(p);
                          setIsDialogOpen(true);
                        }}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Edit Project"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <CardDescription className="line-clamp-2 text-xs">
                    {p.description || "No description provided."}
                  </CardDescription>

                  {/* Deadline & Pace Signal */}
                  {p.deadline && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Deadline:</span>
                        <span className="font-semibold text-foreground">
                          {formatDate(p.deadline)}
                        </span>
                      </div>

                      <Badge
                        variant="outline"
                        className={
                          paceSignal.color === "emerald"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px]"
                            : paceSignal.color === "amber"
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px] font-bold animate-pulse"
                            : "text-muted-foreground text-[11px]"
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
                  )}
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  {/* Progress % indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted-foreground">Task Completion</span>
                      <span>
                        {p.completedTasks} / {p.totalTasks} tasks ({completionPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Time ratio stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2.5">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Logged vs Estimated:</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {formatDuration(p.totalDurationMinutes)}
                      </span>
                      {p.estimatedMinutes > 0 && (
                        <span className="text-muted-foreground text-[11px]">
                          / {formatDuration(p.estimatedMinutes)} est.
                        </span>
                      )}
                    </div>

                    <Link href={`/admin/projects/${p._id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 cursor-pointer">
                        <span>Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Project Dialog */}
      <ProjectFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectToEdit={editingProject}
        onSuccess={fetchProjects}
      />
    </div>
  );
}

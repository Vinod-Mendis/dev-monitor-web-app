"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/time";
import { Clock, CheckCircle2, PlayCircle, PauseCircle, HelpCircle, ArrowRight } from "lucide-react";

export interface TaskItem {
  _id: string;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "paused" | "completed";
  estimatedMinutes?: number;
  totalDurationMinutes: number;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TaskListPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      case "completed":
        return (
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30 gap-1">
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-sm text-muted-foreground">
          View your assigned tasks and track time worked on each item.
        </p>
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
      ) : tasks.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <CardTitle className="text-lg">No tasks assigned</CardTitle>
          <CardDescription>
            You currently have no assigned tasks. Check back later or contact your admin.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Link key={task._id} href={`/tasks/${task._id}`} className="group block focus:outline-none">
              <Card className="h-full hover:border-zinc-400 dark:hover:border-zinc-600 transition-all shadow-sm group-hover:shadow flex flex-col justify-between">
                <CardHeader className="space-y-2 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {task.title}
                    </CardTitle>
                    {renderStatusBadge(task.status)}
                  </div>
                  <CardDescription className="line-clamp-2 text-sm">
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

                    <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      <span>View details</span>
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

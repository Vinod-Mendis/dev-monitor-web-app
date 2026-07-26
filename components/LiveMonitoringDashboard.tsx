"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatElapsedSeconds, formatDateTime } from "@/lib/time";
import { Activity, User, Clock, Square, ArrowUpRight, RefreshCw, Folder } from "lucide-react";

interface ActiveSessionItem {
  _id: string;
  startTime: string;
  user: {
    _id: string;
    name: string;
    clerkId: string;
    role: string;
  };
  task: {
    _id: string;
    title: string;
    description?: string;
    status: string;
    estimatedMinutes?: number;
    project?: {
      _id: string;
      name: string;
    };
  };
}

interface LiveMonitoringDashboardProps {
  projectId?: string;
  showProjectFilter?: boolean;
}

export function LiveMonitoringDashboard({
  projectId: initialProjectId,
  showProjectFilter = false,
}: LiveMonitoringDashboardProps) {
  const [activeSessions, setActiveSessions] = useState<ActiveSessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [stoppingTaskId, setStoppingTaskId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || "");
  const [projectsList, setProjectsList] = useState<{ _id: string; name: string }[]>([]);

  // Live timer tick timestamp
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    if (showProjectFilter) {
      async function loadProjects() {
        try {
          const res = await fetch("/api/projects");
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.projects)) {
              setProjectsList(data.projects);
            }
          }
        } catch (err) {
          console.error("Failed to load projects filter", err);
        }
      }
      loadProjects();
    }
  }, [showProjectFilter]);

  const fetchActiveSessions = useCallback(async () => {
    try {
      setError(null);
      const url = selectedProjectId
        ? `/api/sessions/active?projectId=${selectedProjectId}`
        : "/api/sessions/active";

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch active sessions (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.activeSessions)) {
        setActiveSessions(data.activeSessions);
      } else {
        setActiveSessions([]);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to fetch live monitoring data.");
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 5000);
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

  // Live tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAdminStopSession = async (taskId: string) => {
    try {
      setStoppingTaskId(taskId);
      const res = await fetch("/api/sessions/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, note: "Stopped by admin" }),
      });
      if (res.ok) {
        await fetchActiveSessions();
      }
    } catch (err) {
      console.error("Failed to stop session:", err);
    } finally {
      setStoppingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Live Activity Monitor
            </h2>
            <p className="text-xs text-muted-foreground">
              Polling active time sessions every 5s • Last refreshed at {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {showProjectFilter && (
            <div className="flex items-center gap-1.5 text-xs">
              <Folder className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-8 rounded-md border border-input bg-white dark:bg-zinc-900 px-2 text-xs shadow-xs"
              >
                <option value="">All Projects</option>
                {projectsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 py-1">
            <span className="font-bold">{activeSessions.length}</span> Active Intern{activeSessions.length === 1 ? "" : "s"} Working
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchActiveSessions}
            className="cursor-pointer gap-1 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Main Sessions Cards */}
      {loading && activeSessions.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
      ) : activeSessions.length === 0 ? (
        <Card className="p-8 text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-dashed">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <Clock className="w-6 h-6" />
          </div>
          <CardTitle className="text-base font-semibold">No active sessions running</CardTitle>
          <CardDescription className="text-xs max-w-sm mx-auto">
            {selectedProjectId
              ? "No interns are currently tracking time on tasks in this project."
              : "None of the interns are currently tracking time. When an intern clicks 'Start Task', their live session will appear here instantly."}
          </CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeSessions.map((session) => {
            const startMs = new Date(session.startTime).getTime();
            const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
            const taskId = session.task?._id;

            return (
              <Card
                key={session._id}
                className="shadow-sm hover:shadow transition-all border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.02] to-transparent dark:from-emerald-500/[0.04]"
              >
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {session.user?.name || session.user?.clerkId || "Unknown Intern"}
                        </h3>
                        <span className="text-[10px] text-muted-foreground block">
                          Role: {session.user?.role || "intern"}
                        </span>
                      </div>
                    </div>

                    <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 text-xs py-0.5 px-2 font-mono font-bold animate-pulse">
                      {formatElapsedSeconds(elapsedSec)}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        Working on:
                        {session.task?.project?.name && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal bg-zinc-100 dark:bg-zinc-800">
                            {session.task.project.name}
                          </Badge>
                        )}
                      </span>
                      {taskId && (
                        <Link
                          href={`/tasks/${taskId}`}
                          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                        >
                          Task details
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5 line-clamp-1">
                      {session.task?.title || "Untitled Task"}
                    </p>
                    {session.task?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {session.task.description}
                      </p>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0 text-xs text-muted-foreground space-y-3">
                  <div className="flex items-center justify-between bg-zinc-100/70 dark:bg-zinc-800/50 p-2.5 rounded-lg">
                    <div>
                      <span className="block text-[10px]">Session Started</span>
                      <span className="font-medium text-foreground">
                        {formatDateTime(session.startTime)}
                      </span>
                    </div>

                    {taskId && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAdminStopSession(taskId)}
                        disabled={stoppingTaskId === taskId}
                        className="cursor-pointer h-7 text-[11px] px-2.5 gap-1"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        {stoppingTaskId === taskId ? "Stopping..." : "Admin Stop"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

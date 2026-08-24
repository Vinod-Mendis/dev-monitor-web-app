"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  PlusCircle,
  Eye,
  RefreshCw,
  Folder,
  ArrowRight,
  ShieldCheck,
  GraduationCap,
  Activity,
  Filter,
} from "lucide-react";

export interface ActivityItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    clerkId: string;
    role: string;
    imageUrl?: string;
  };
  action:
    | "started_task"
    | "logged_session"
    | "submitted_for_review"
    | "requested_changes"
    | "completed_task"
    | "created_task";
  task?: {
    _id: string;
    title: string;
    status: string;
    project?: {
      _id: string;
      name: string;
    };
  };
  project?: {
    _id: string;
    name: string;
  };
  details?: string;
  metadata?: {
    reviewNote?: string;
  };
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("all");

  const fetchActivities = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const url =
        filterAction !== "all"
          ? `/api/activities?action=${filterAction}&limit=50`
          : "/api/activities?limit=50";

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load activity feed (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.activities)) {
        setActivities(data.activities);
      } else {
        setActivities([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load recent activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterAction]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Render event icon and badge
  const renderActionBadge = (action: ActivityItem["action"]) => {
    switch (action) {
      case "started_task":
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 text-[11px] font-semibold">
            <Play className="w-3 h-3 fill-current" /> Started Task
          </Badge>
        );
      case "submitted_for_review":
        return (
          <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 text-[11px] font-semibold">
            <Send className="w-3 h-3" /> Submitted for Review
          </Badge>
        );
      case "requested_changes":
        return (
          <Badge className="bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30 gap-1 text-[11px] font-semibold">
            <AlertTriangle className="w-3 h-3 text-orange-600" /> Changes Requested
          </Badge>
        );
      case "completed_task":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px] font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Task Completed
          </Badge>
        );
      case "logged_session":
        return (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px] font-semibold">
            <Clock className="w-3 h-3 text-amber-600" /> Session Logged
          </Badge>
        );
      case "created_task":
        return (
          <Badge variant="outline" className="gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
            <PlusCircle className="w-3 h-3" /> Task Created
          </Badge>
        );
      default:
        return null;
    }
  };

  // Render activity narrative
  const renderActivityText = (item: ActivityItem) => {
    const userName = item.user?.name || item.user?.clerkId || "A team member";
    const taskTitle = item.task?.title;

    switch (item.action) {
      case "started_task":
        return (
          <div className="text-sm">
            <span className="font-semibold text-foreground">{userName}</span> started work on{" "}
            {taskTitle ? (
              <Link
                href={`/tasks/${item.task?._id}`}
                className="font-bold text-primary hover:underline"
              >
                "{taskTitle}"
              </Link>
            ) : (
              <span className="font-medium">a task</span>
            )}
          </div>
        );
      case "submitted_for_review":
        return (
          <div className="text-sm">
            <span className="font-semibold text-foreground">{userName}</span> submitted{" "}
            {taskTitle ? (
              <Link
                href={`/tasks/${item.task?._id}`}
                className="font-bold text-primary hover:underline"
              >
                "{taskTitle}"
              </Link>
            ) : (
              <span className="font-medium">a task</span>
            )}{" "}
            for review
          </div>
        );
      case "requested_changes":
        return (
          <div className="text-sm space-y-1">
            <div>
              <span className="font-semibold text-foreground">{userName}</span> requested changes on{" "}
              {taskTitle ? (
                <Link
                  href={`/tasks/${item.task?._id}`}
                  className="font-bold text-primary hover:underline"
                >
                  "{taskTitle}"
                </Link>
              ) : (
                <span className="font-medium">a task</span>
              )}
            </div>
            {item.metadata?.reviewNote && (
              <p className="text-xs text-orange-800 dark:text-orange-300 italic bg-orange-500/10 p-2 rounded border border-orange-500/20">
                "{item.metadata.reviewNote}"
              </p>
            )}
          </div>
        );
      case "completed_task":
        return (
          <div className="text-sm">
            <span className="font-semibold text-foreground">{userName}</span> approved & marked{" "}
            {taskTitle ? (
              <Link
                href={`/tasks/${item.task?._id}`}
                className="font-bold text-primary hover:underline"
              >
                "{taskTitle}"
              </Link>
            ) : (
              <span className="font-medium">a task</span>
            )}{" "}
            as completed
          </div>
        );
      case "logged_session":
        return (
          <div className="text-sm">
            <span className="font-semibold text-foreground">{userName}</span> logged a work session on{" "}
            {taskTitle ? (
              <Link
                href={`/tasks/${item.task?._id}`}
                className="font-bold text-primary hover:underline"
              >
                "{taskTitle}"
              </Link>
            ) : (
              <span className="font-medium">a task</span>
            )}
            {item.details && <span className="text-muted-foreground text-xs block mt-0.5">{item.details}</span>}
          </div>
        );
      case "created_task":
        return (
          <div className="text-sm">
            <span className="font-semibold text-foreground">{userName}</span> created new task{" "}
            {taskTitle ? (
              <Link
                href={`/tasks/${item.task?._id}`}
                className="font-bold text-primary hover:underline"
              >
                "{taskTitle}"
              </Link>
            ) : (
              <span className="font-medium">a task</span>
            )}
          </div>
        );
      default:
        return <div className="text-sm">{item.details || "Activity recorded"}</div>;
    }
  };

  return (
    <div className="space-y-4 w-full">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="font-bold text-sm">Recent Team Activity</h3>
            <p className="text-xs text-muted-foreground">
              Live audit of task starts, reviews, change requests, and completions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">Filter:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="h-8 rounded-md border border-input bg-white dark:bg-zinc-900 px-2.5 text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Events</option>
              <option value="started_task">Task Starts</option>
              <option value="submitted_for_review">Submitted for Review</option>
              <option value="requested_changes">Changes Requested</option>
              <option value="completed_task">Completions</option>
              <option value="logged_session">Logged Sessions</option>
              <option value="created_task">Task Created</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Activity Timeline List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 bg-white dark:bg-zinc-900 border rounded-xl flex items-center justify-between">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground w-full">
          No recent activity logs found matching the selected filter.
        </Card>
      ) : (
        <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs divide-y divide-zinc-200 dark:divide-zinc-800">
          {activities.map((item) => {
            const projectName = item.task?.project?.name || item.project?.name;
            const projectId = item.task?.project?._id || item.project?._id;

            return (
              <div
                key={item._id}
                className="p-4 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                {/* Left Side: Avatar + Details */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* User Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    {item.user?.imageUrl ? (
                      <img
                        src={item.user.imageUrl}
                        alt={item.user.name || "User"}
                        className="w-9 h-9 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-foreground">
                        {(item.user?.name || "U")[0].toUpperCase()}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1">
                      {item.user?.role === "admin" ? (
                        <span className="p-0.5 rounded-full bg-purple-600 text-white block">
                          <ShieldCheck className="w-2.5 h-2.5" />
                        </span>
                      ) : (
                        <span className="p-0.5 rounded-full bg-emerald-600 text-white block">
                          <GraduationCap className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Narrative & Tags */}
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderActionBadge(item.action)}
                      {projectName && projectId && (
                        <Link href={`/projects/${projectId}`}>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer font-normal"
                          >
                            <Folder className="w-2.5 h-2.5 mr-1 text-muted-foreground" />
                            {projectName}
                          </Badge>
                        </Link>
                      )}
                    </div>

                    {renderActivityText(item)}
                  </div>
                </div>

                {/* Right Side: Timestamp & Task Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                  <span
                    className="text-xs text-muted-foreground font-medium"
                    title={formatDateTime(item.createdAt)}
                  >
                    {timeAgo(item.createdAt)}
                  </span>

                  {item.task?._id && (
                    <Link href={`/tasks/${item.task._id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <span>View Task</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

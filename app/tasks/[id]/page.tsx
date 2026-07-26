"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveSession } from "@/components/ActiveSessionContext";
import { formatDuration, formatElapsedSeconds, formatDateTime } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Play,
  Square,
  CheckCircle2,
  Clock,
  Timer,
  AlertCircle,
  FileText,
  History,
} from "lucide-react";
import { TaskItem } from "../page";

export interface TimeSessionItem {
  _id: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes?: number | null;
  note?: string;
  user: {
    name?: string;
    clerkId: string;
  };
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: taskId } = use(params);
  const router = useRouter();
  const { activeSession, refetchActiveSession } = useActiveSession();

  const [task, setTask] = useState<TaskItem | null>(null);
  const [sessions, setSessions] = useState<TimeSessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Live timer for current running session on THIS task
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Stop Dialog state
  const [isStopDialogOpen, setIsStopDialogOpen] = useState<boolean>(false);
  const [stopNote, setStopNote] = useState<string>("");
  const [isSubmittingStop, setIsSubmittingStop] = useState<boolean>(false);

  // Complete state
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);
  const [isSubmittingStart, setIsSubmittingStart] = useState<boolean>(false);

  const isCurrentTaskActive = activeSession?.task?._id === taskId;
  const isOtherTaskActive = activeSession !== null && !isCurrentTaskActive;

  // Fetch task and session history
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch task list and filter for this task
      const [tasksRes, historyRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch(`/api/sessions/history?taskId=${taskId}`),
      ]);

      if (!tasksRes.ok) {
        throw new Error(`Failed to fetch task details (HTTP ${tasksRes.status})`);
      }
      const tasksData = await tasksRes.json();
      if (tasksData.success && Array.isArray(tasksData.tasks)) {
        const found = tasksData.tasks.find((t: TaskItem) => t._id === taskId);
        if (!found) {
          throw new Error("Task not found or access denied.");
        }
        setTask(found);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        if (historyData.success && Array.isArray(historyData.sessions)) {
          setSessions(historyData.sessions);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred loading task data.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live timer update effect
  useEffect(() => {
    if (!isCurrentTaskActive || !activeSession?.startTime) {
      setElapsedSeconds(0);
      return;
    }

    const startMs = new Date(activeSession.startTime).getTime();
    const update = () => {
      const nowMs = Date.now();
      const diffSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isCurrentTaskActive, activeSession?.startTime]);

  // Handle Start Task
  const handleStartTask = async () => {
    try {
      setIsSubmittingStart(true);
      setError(null);
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to start time session");
      }

      await refetchActiveSession();
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to start task.");
    } finally {
      setIsSubmittingStart(false);
    }
  };

  // Handle Stop Task
  const handleStopTask = async () => {
    try {
      setIsSubmittingStop(true);
      setError(null);
      const res = await fetch("/api/sessions/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          note: stopNote,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to stop time session");
      }

      setIsStopDialogOpen(false);
      setStopNote("");
      await refetchActiveSession();
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to stop task.");
    } finally {
      setIsSubmittingStop(false);
    }
  };

  // Handle Complete Task
  const handleCompleteTask = async () => {
    try {
      setIsSubmittingComplete(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to mark task complete");
      }

      await refetchActiveSession();
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to complete task.");
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "in_progress":
        return <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30">In Progress</Badge>;
      case "paused":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">Paused</Badge>;
      case "completed":
        return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Completed</Badge>;
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-28" />
        <Card className="p-6 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to tasks
        </Link>
        <Card className="p-6 border-destructive/50 bg-destructive/5 text-destructive space-y-2">
          <CardTitle className="text-base font-semibold">Error Loading Task</CardTitle>
          <CardDescription className="text-destructive/90">{error || "Task not found."}</CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link href="/tasks" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition">
          <ArrowLeft className="w-4 h-4" />
          Back to My Tasks
        </Link>
      </div>

      {/* Main Task Card */}
      <Card className="shadow-sm">
        <CardHeader className="space-y-3 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{task.title}</h1>
            <div>{renderStatusBadge(task.status)}</div>
          </div>
          <p className="text-muted-foreground text-sm whitespace-pre-line leading-relaxed">
            {task.description || "No description provided."}
          </p>
        </CardHeader>

        <CardContent className="py-4 space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-lg text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Total Accumulated</span>
              <span className="font-semibold text-base flex items-center gap-1 mt-0.5">
                <Clock className="w-4 h-4 text-primary" />
                {formatDuration(task.totalDurationMinutes)}
              </span>
            </div>
            {task.estimatedMinutes !== undefined && task.estimatedMinutes !== null && (
              <div>
                <span className="text-xs text-muted-foreground block">Estimated Time</span>
                <span className="font-medium text-base mt-0.5 block">
                  {formatDuration(task.estimatedMinutes)}
                </span>
              </div>
            )}
            <div>
              <span className="text-xs text-muted-foreground block">Sessions Count</span>
              <span className="font-medium text-base mt-0.5 block">
                {task.sessionCount || sessions.length} sessions
              </span>
            </div>
          </div>

          {/* Active Session Warning (if active on ANOTHER task) */}
          {isOtherTaskActive && (
            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-sm font-semibold">Active session on another task</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                You have an active session running on{" "}
                <Link href={`/tasks/${activeSession.task._id}`} className="font-bold underline underline-offset-2">
                  "{activeSession.task.title}"
                </Link>
                . Please stop it first before starting work on this task.
              </AlertDescription>
            </Alert>
          )}

          {/* Timer controls */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {task.status === "completed" ? (
              <Badge variant="outline" className="px-3 py-1.5 text-sm gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
                Task Completed
              </Badge>
            ) : isCurrentTaskActive ? (
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded-md">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-mono text-sm font-bold text-blue-900 dark:text-blue-200">
                    {formatElapsedSeconds(elapsedSeconds)}
                  </span>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => setIsStopDialogOpen(true)}
                  disabled={isSubmittingStop}
                  className="gap-1.5 cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop Task
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleStartTask}
                disabled={isOtherTaskActive || isSubmittingStart}
                className="gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Play className="w-4 h-4 fill-current" />
                {isSubmittingStart ? "Starting..." : "Start Task"}
              </Button>
            )}

            {/* Mark as Complete (AlertDialog trigger) */}
            {task.status !== "completed" && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="outline"
                      className="gap-1.5 cursor-pointer border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark as Complete
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete this task?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will mark <strong>"{task.title}"</strong> as completed. If you currently have an active session running on this task, it will be automatically stopped.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCompleteTask}
                      disabled={isSubmittingComplete}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      {isSubmittingComplete ? "Completing..." : "Confirm & Complete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            Session History
          </h2>
          <span className="text-xs text-muted-foreground">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"} logged
          </span>
        </div>

        {sessions.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No work sessions logged for this task yet. Click "Start Task" above to begin tracking.
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => {
              const isRunning = sess.endTime === null || sess.endTime === undefined;
              return (
                <Card key={sess._id} className={`p-4 transition-all ${isRunning ? "border-blue-500/40 bg-blue-500/5" : ""}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Started:</span>
                        <span className="text-xs font-medium">{formatDateTime(sess.startTime)}</span>
                        {isRunning && (
                          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] py-0 px-1.5">
                            Running Now
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Ended:</span>
                        <span className="text-xs font-medium">
                          {isRunning ? "In progress..." : formatDateTime(sess.endTime)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium pt-2 sm:pt-0 border-t sm:border-t-0">
                      <div className="text-right">
                        <span className="text-muted-foreground block text-[10px]">Duration</span>
                        <span className="font-semibold text-sm">
                          {isRunning ? "Live" : formatDuration(sess.durationMinutes)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {sess.note && (
                    <div className="mt-3 pt-2 border-t text-xs text-muted-foreground flex items-start gap-1.5">
                      <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className="italic">"{sess.note}"</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Stop Task Dialog with Note Input */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Stop Work Session</DialogTitle>
            <DialogDescription>
              Provide an optional note summarizing what you worked on before stopping the session timer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="note-input" className="text-xs font-medium text-muted-foreground">
                Session Note (Optional)
              </label>
              <Input
                id="note-input"
                placeholder="e.g., Completed authentication tests and API handler refactoring"
                value={stopNote}
                onChange={(e) => setStopNote(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStopDialogOpen(false)}
              disabled={isSubmittingStop}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleStopTask}
              disabled={isSubmittingStop}
              className="cursor-pointer"
            >
              {isSubmittingStop ? "Stopping..." : "Stop Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

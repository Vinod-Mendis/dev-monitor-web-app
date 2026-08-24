"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActiveSession } from "@/components/ActiveSessionContext";
import { formatDuration, formatElapsedSeconds, formatDateTime } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Send,
  Eye,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Folder,
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

  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [task, setTask] = useState<TaskItem | null>(null);
  const [sessions, setSessions] = useState<TimeSessionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Live timer for current running session on THIS task
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Stop / Log Session Dialog state
  const [isStopDialogOpen, setIsStopDialogOpen] = useState<boolean>(false);
  const [stopNote, setStopNote] = useState<string>("");
  const [isSubmittingStop, setIsSubmittingStop] = useState<boolean>(false);

  // Submit for Review state
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [isSubmittingStart, setIsSubmittingStart] = useState<boolean>(false);

  // Admin Review modal states
  const [isFixesDialogOpen, setIsFixesDialogOpen] = useState<boolean>(false);
  const [fixesFeedback, setFixesFeedback] = useState<string>("");
  const [isProcessingAdminReview, setIsProcessingAdminReview] = useState<boolean>(false);

  const isCurrentTaskActive = activeSession?.task?._id === taskId;
  const isOtherTaskActive = activeSession !== null && !isCurrentTaskActive;

  // Check current user role
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
        // default to intern
      }
    }
    checkRole();
  }, []);

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

  // Handle Stop / Log Session
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

  // Handle Submit for Review (Intern action)
  const handleSubmitForReview = async () => {
    try {
      setIsSubmittingReview(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}/submit-review`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit task for review");
      }

      await refetchActiveSession();
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to submit task for review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Admin Review (Admin action: Complete or Request Fixes)
  const handleAdminReview = async (status: "completed" | "fixes_needed", note?: string) => {
    try {
      setIsProcessingAdminReview(true);
      setError(null);
      const res = await fetch(`/api/tasks/${taskId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewNote: note || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit review");
      }

      setIsFixesDialogOpen(false);
      setFixesFeedback("");
      await refetchActiveSession();
      await fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to update review status.");
    } finally {
      setIsProcessingAdminReview(false);
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 font-semibold text-xs">
            <Play className="w-3 h-3 fill-current" /> In Progress
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-semibold text-xs">
            Paused
          </Badge>
        );
      case "under_review":
        return (
          <Badge className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1.5 font-semibold text-xs">
            <Eye className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Under Review
          </Badge>
        );
      case "fixes_needed":
        return (
          <Badge className="bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/30 gap-1.5 font-semibold text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            Fixes Needed
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 font-semibold text-xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Completed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Not Started
          </Badge>
        );
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
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
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

  const isUnderReview = task.status === "under_review";
  const isFixesNeeded = task.status === "fixes_needed";
  const isCompleted = task.status === "completed";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Tasks
        </Link>
      </div>

      {/* Main Task Card */}
      <Card className="shadow-xs">
        <CardHeader className="space-y-3 border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{task.title}</h1>
              {task.project?.name && (
                <div className="pt-0.5">
                  <Link href={`/projects/${task.project._id}`}>
                    <Badge
                      variant="outline"
                      className="text-xs font-normal bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
                    >
                      <Folder className="w-3 h-3 text-muted-foreground mr-1" />
                      {task.project.name}
                    </Badge>
                  </Link>
                </div>
              )}
            </div>
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

          {/* Status Feedback Banners */}
          {isUnderReview && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg text-xs text-purple-900 dark:text-purple-200 flex items-start gap-2.5">
              <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Task is currently Under Review</p>
                <p className="text-muted-foreground mt-0.5">
                  {isAdmin
                    ? "The intern has submitted this task for your review. Please inspect the code and approve as Completed or request Fixes."
                    : "You have submitted this task for review. Your admin will check the code and mark it as Completed or request fixes."}
                </p>
              </div>
            </div>
          )}

          {isFixesNeeded && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-xs text-orange-900 dark:text-orange-200 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Fixes Needed Before Approval</p>
                  <p className="text-muted-foreground mt-0.5">
                    {task.reviewNote ? (
                      <span className="italic block mt-1 p-2 bg-orange-500/5 rounded border border-orange-500/20 text-foreground">
                        "{task.reviewNote}"
                      </span>
                    ) : (
                      "Your admin requested updates on this task before it can be marked as complete."
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active Session Warning (if active on ANOTHER task) */}
          {isOtherTaskActive && (
            <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-sm font-semibold">Active session on another task</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                You have an active session running on{" "}
                <Link
                  href={`/tasks/${activeSession.task._id}`}
                  className="font-bold underline underline-offset-2"
                >
                  "{activeSession.task.title}"
                </Link>
                . Please log it before working on this task.
              </AlertDescription>
            </Alert>
          )}

          {/* Timer controls and actions */}
          {(() => {
            const hasStartedBefore =
              sessions.length > 0 ||
              (task.totalDurationMinutes !== undefined && task.totalDurationMinutes > 0) ||
              task.status === "paused" ||
              isFixesNeeded;
            const startButtonLabel = hasStartedBefore ? "Continue" : "Start";
            const startButtonLoadingLabel = hasStartedBefore ? "Continuing..." : "Starting...";

            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                {/* Left side: Timer & Start / Continue / Log Session */}
                <div className="flex flex-wrap items-center gap-3">
                  {isCompleted ? (
                    <Badge
                      variant="outline"
                      className="px-3 py-1.5 text-sm gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Task Completed
                    </Badge>
                  ) : isUnderReview ? (
                    <Badge
                      variant="outline"
                      className="px-3 py-1.5 text-sm gap-1.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-medium"
                    >
                      <Eye className="w-4 h-4 text-purple-600" />
                      Submitted for Review
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
                        onClick={() => setIsStopDialogOpen(true)}
                        disabled={isSubmittingStop}
                        className="gap-1.5 cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        Log Session
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleStartTask}
                      disabled={isOtherTaskActive || isSubmittingStart}
                      className="gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {isSubmittingStart ? startButtonLoadingLabel : startButtonLabel}
                    </Button>
                  )}
                </div>

                {/* Right side: Intern "Submit for Review" OR Admin Review Actions */}
                <div className="flex items-center gap-2 sm:justify-end">
                  {/* Admin Review Action Controls */}
                  {isAdmin ? (
                    !isCompleted && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFixesFeedback(task.reviewNote || "");
                            setIsFixesDialogOpen(true);
                          }}
                          disabled={isProcessingAdminReview}
                          className="gap-1.5 cursor-pointer border-orange-500/40 text-orange-700 dark:text-orange-400 hover:bg-orange-500/10 font-medium text-xs h-9"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Request Fixes
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                disabled={isProcessingAdminReview}
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve & Complete
                              </Button>
                            }
                          />
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Approve and Complete Task?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will officially mark <strong>"{task.title}"</strong> as Completed. The intern will receive confirmation that the task has been approved.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleAdminReview("completed")}
                                disabled={isProcessingAdminReview}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                              >
                                {isProcessingAdminReview ? "Approving..." : "Confirm Approval"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )
                  ) : (
                    /* Intern Action: Submit for Review */
                    !isCompleted &&
                    !isUnderReview && (
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              variant="outline"
                              className="gap-1.5 cursor-pointer border-purple-600/40 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 hover:text-purple-800 dark:hover:text-purple-300 font-semibold text-xs h-9"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Submit for Review
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Submit task for review?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will notify your admin that you have finished working on <strong>"{task.title}"</strong>. If an active session timer is currently running, it will be automatically stopped and logged.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleSubmitForReview}
                              disabled={isSubmittingReview}
                              className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                            >
                              {isSubmittingReview ? "Submitting..." : "Confirm & Submit for Review"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )
                  )}
                </div>
              </div>
            );
          })()}
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
            No work sessions logged for this task yet. Click "Start" above to begin tracking.
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map((sess) => {
              const isRunning = sess.endTime === null || sess.endTime === undefined;
              return (
                <Card
                  key={sess._id}
                  className={`p-4 transition-all ${isRunning ? "border-blue-500/40 bg-blue-500/5" : ""}`}
                >
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

      {/* Log Work Session Dialog with Note Input */}
      <Dialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Work Session</DialogTitle>
            <DialogDescription>
              Provide an optional note summarizing what you worked on before logging this session.
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
              onClick={handleStopTask}
              disabled={isSubmittingStop}
              className="cursor-pointer bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold"
            >
              {isSubmittingStop ? "Logging..." : "Log Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Request Fixes Dialog */}
      <Dialog open={isFixesDialogOpen} onOpenChange={setIsFixesDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Request Fixes from Intern
            </DialogTitle>
            <DialogDescription>
              Specify what updates or fixes are needed before this task can be approved.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Review Feedback / Required Changes
              </label>
              <textarea
                rows={4}
                placeholder="e.g., Please fix unit test edge cases and add proper error handling before re-submitting."
                value={fixesFeedback}
                onChange={(e) => setFixesFeedback(e.target.value)}
                className="w-full rounded-md border border-input bg-white dark:bg-zinc-950 p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFixesDialogOpen(false)}
              disabled={isProcessingAdminReview}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => handleAdminReview("fixes_needed", fixesFeedback)}
              disabled={isProcessingAdminReview}
              className="cursor-pointer bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs"
            >
              {isProcessingAdminReview ? "Submitting..." : "Send Feedback & Request Fixes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

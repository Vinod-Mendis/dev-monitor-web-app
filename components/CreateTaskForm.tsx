"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, CheckCircle2, UserCheck, Clock, FileText, AlertCircle } from "lucide-react";

interface InternUser {
  _id: string;
  name: string;
  clerkId: string;
  role: string;
}

interface CreateTaskFormProps {
  onSuccess?: () => void;
}

export function CreateTaskForm({ onSuccess }: CreateTaskFormProps) {
  const [interns, setInterns] = useState<InternUser[]>([]);
  const [loadingInterns, setLoadingInterns] = useState<boolean>(true);

  // Form states
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInterns() {
      try {
        setLoadingInterns(true);
        const res = await fetch("/api/users?role=intern");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            setInterns(data.users);
            if (data.users.length > 0) {
              setAssignedTo(data.users[0]._id);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load interns:", err);
      } finally {
        setLoadingInterns(false);
      }
    }

    fetchInterns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }
    if (!assignedTo) {
      setError("Please select an assigned intern.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        title: title.trim(),
        description: description.trim(),
        assignedTo,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : undefined,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create task");
      }

      setSuccessMsg(`Task "${data.task.title}" successfully created and assigned!`);
      setTitle("");
      setDescription("");
      setEstimatedMinutes("");
      if (interns.length > 0) {
        setAssignedTo(interns[0]._id);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Create New Task
        </CardTitle>
        <CardDescription>
          Assign work tasks to interns and set time estimates.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="bg-destructive/10 border-destructive/30 text-destructive">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <AlertTitle className="text-xs font-semibold">Error</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {successMsg && (
            <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle className="text-xs font-semibold">Success</AlertTitle>
              <AlertDescription className="text-xs">{successMsg}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Task Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="task-title"
              placeholder="e.g., Build API integration for reporting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="task-description" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Description / Instructions
            </label>
            <textarea
              id="task-description"
              rows={3}
              placeholder="Detailed instructions or specifications for the intern..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="assignee-select" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Assign To <span className="text-destructive">*</span>
              </label>
              {loadingInterns ? (
                <div className="h-9 w-full bg-zinc-100 dark:bg-zinc-800 rounded-md animate-pulse" />
              ) : (
                <select
                  id="assignee-select"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  {interns.length === 0 ? (
                    <option value="">No interns found</option>
                  ) : (
                    interns.map((intern) => (
                      <option key={intern._id} value={intern._id}>
                        {intern.name || intern.clerkId} ({intern.role})
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="estimated-minutes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Estimated Time (minutes)
              </label>
              <Input
                id="estimated-minutes"
                type="number"
                min="1"
                placeholder="e.g., 120"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting || loadingInterns}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              {submitting ? "Creating Task..." : "Create & Assign Task"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

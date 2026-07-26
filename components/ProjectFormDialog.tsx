"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FolderPlus, AlertCircle, Calendar, FileText, CheckCircle2 } from "lucide-react";

interface ProjectData {
  _id?: string;
  name: string;
  description?: string;
  status?: "active" | "completed" | "archived";
  deadline?: string | Date | null;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectToEdit?: ProjectData | null;
  onSuccess: () => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  projectToEdit,
  onSuccess,
}: ProjectFormDialogProps) {
  const isEditing = Boolean(projectToEdit?._id);

  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");
  const [deadline, setDeadline] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name || "");
      setDescription(projectToEdit.description || "");
      setStatus(projectToEdit.status || "active");
      if (projectToEdit.deadline) {
        const d = new Date(projectToEdit.deadline);
        setDeadline(d.toISOString().slice(0, 10));
      } else {
        setDeadline("");
      }
    } else {
      setName("");
      setDescription("");
      setStatus("active");
      setDeadline("");
    }
    setError(null);
  }, [projectToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        status,
        deadline: deadline ? deadline : null,
      };

      const url = isEditing
        ? `/api/projects/${projectToEdit!._id}`
        : "/api/projects";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save project.");
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            {isEditing ? "Edit Project" : "Create New Project"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update project details, status, and deadline."
              : "Organize tasks under a project layer with deadline & burn-rate tracking."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <Alert className="bg-destructive/10 border-destructive/30 text-destructive text-xs">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label htmlFor="project-name" className="text-xs font-semibold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Project Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="project-name"
              placeholder="e.g. Mobile App Redesign 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="project-desc" className="text-xs font-semibold">
              Description / Goal
            </label>
            <textarea
              id="project-desc"
              rows={3}
              placeholder="Brief summary of what this project covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="project-status" className="text-xs font-semibold">
                Status
              </label>
              <select
                id="project-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-white dark:bg-zinc-900 px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="project-deadline" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Target Deadline (Optional)
              </label>
              <Input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? "Saving..." : isEditing ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { requireAdmin } from "@/lib/roles";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";
import { logActivity } from "@/lib/activityLogger";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const currentAdmin = await syncCurrentUser();
    const { id: taskId } = await params;
    const body = await req.json();
    const { status, reviewNote } = body;

    if (!status || (status !== "completed" && status !== "fixes_needed")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid review status. Allowed values are 'completed' or 'fixes_needed'.",
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Update task status and review note
    task.status = status;
    if (typeof reviewNote === "string") {
      task.reviewNote = reviewNote.trim();
    } else if (status === "completed") {
      task.reviewNote = "";
    }
    await task.save();

    // If marked as completed and an active session exists, stop it
    if (status === "completed") {
      const activeSession = await TimeSession.findOne({
        task: task._id,
        endTime: null,
      });

      if (activeSession) {
        const now = new Date();
        activeSession.endTime = now;
        const diffMs = now.getTime() - activeSession.startTime.getTime();
        activeSession.durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
        if (!activeSession.note) {
          activeSession.note = "Auto-stopped on admin completion approval";
        }
        await activeSession.save();
      }
    }

    // Log activity
    await logActivity({
      userId: currentAdmin._id,
      action: status === "completed" ? "completed_task" : "requested_changes",
      taskId: task._id,
      projectId: task.project,
      details:
        status === "completed"
          ? `Approved and completed "${task.title}"`
          : `Requested changes on "${task.title}"${reviewNote ? `: "${reviewNote}"` : ""}`,
      metadata: { reviewNote: reviewNote || "" },
    });

    const populatedTask = await Task.findById(task._id)
      .populate("project", "name status deadline")
      .populate("assignedTo", "name clerkId role")
      .populate("createdBy", "name clerkId role");

    return NextResponse.json({
      success: true,
      message:
        status === "completed"
          ? "Task marked as completed by admin"
          : "Task status updated to Fixes Needed",
      task: populatedTask,
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Forbidden")
      ? 403
      : error.message?.startsWith("Unauthorized")
      ? 401
      : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

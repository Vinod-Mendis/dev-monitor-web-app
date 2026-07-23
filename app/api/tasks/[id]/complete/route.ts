import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await syncCurrentUser();
    const { id: taskId } = await params;

    await connectToDatabase();

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Authorization: Admin or assigned intern can complete the task
    const isAssignedUser = task.assignedTo.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === "admin";

    if (!isAssignedUser && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not assigned to this task" },
        { status: 403 }
      );
    }

    // Update task status to completed
    task.status = "completed";
    await task.save();

    // If an active session exists for this task, stop it automatically
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
        activeSession.note = "Auto-stopped on task completion";
      }
      await activeSession.save();
    }

    return NextResponse.json({
      success: true,
      message: "Task marked as completed",
      task,
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

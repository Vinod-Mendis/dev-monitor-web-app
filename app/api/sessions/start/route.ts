import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";

export async function POST(req: Request) {
  try {
    const currentUser = await syncCurrentUser();
    const body = await req.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { success: false, error: "taskId is required" },
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

    // Task Assignment Check: task.assignedTo must match currentUser unless user is admin
    const isAssigned = task.assignedTo.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === "admin";
    if (!isAssigned && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not assigned to this task" },
        { status: 403 }
      );
    }

    // Single Active Session Check: User can only have ONE active TimeSession (endTime: null) at a time
    const activeSession = await TimeSession.findOne({
      user: currentUser._id,
      endTime: null,
    }).populate("task", "title");

    if (activeSession) {
      const activeTaskTitle = (activeSession.task as any)?.title || "another task";
      return NextResponse.json(
        {
          success: false,
          error: `You already have an active time session running on task: "${activeTaskTitle}". Please stop it before starting a new one.`,
          activeSessionId: activeSession._id,
        },
        { status: 400 }
      );
    }

    // Create new active session
    const newSession = await TimeSession.create({
      task: task._id,
      user: currentUser._id,
      startTime: new Date(),
      endTime: null,
    });

    // Update task status to in_progress
    task.status = "in_progress";
    await task.save();

    const populatedSession = await TimeSession.findById(newSession._id)
      .populate("task", "title description status")
      .populate("user", "name clerkId role");

    return NextResponse.json(
      { success: true, session: populatedSession },
      { status: 201 }
    );
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

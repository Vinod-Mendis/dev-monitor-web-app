import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";

export async function POST(req: Request) {
  try {
    const currentUser = await syncCurrentUser();
    const body = await req.json().catch(() => ({}));
    const { sessionId, taskId, note } = body;

    await connectToDatabase();

    let session;
    if (sessionId) {
      session = await TimeSession.findById(sessionId);
    } else if (taskId) {
      session = await TimeSession.findOne({
        task: taskId,
        user: currentUser._id,
        endTime: null,
      });
    } else {
      // Default to user's currently running active session
      session = await TimeSession.findOne({
        user: currentUser._id,
        endTime: null,
      });
    }

    if (!session) {
      return NextResponse.json(
        { success: false, error: "No active time session found to stop" },
        { status: 404 }
      );
    }

    if (session.endTime !== null && session.endTime !== undefined) {
      return NextResponse.json(
        { success: false, error: "Time session is already stopped" },
        { status: 400 }
      );
    }

    // Ownership Check: Session user must match current user (unless admin)
    const isOwner = session.user.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You cannot stop another user's session" },
        { status: 403 }
      );
    }

    const now = new Date();
    session.endTime = now;
    const diffMs = now.getTime() - session.startTime.getTime();
    // Calculate duration in minutes (minimum 1 min for non-zero sessions)
    session.durationMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

    if (note && typeof note === "string") {
      session.note = note.trim();
    }

    await session.save();

    // Update associated task status to paused (if it's not already completed)
    const task = await Task.findById(session.task);
    if (task && task.status !== "completed") {
      task.status = "paused";
      await task.save();
    }

    const populatedSession = await TimeSession.findById(session._id)
      .populate("task", "title description status")
      .populate("user", "name clerkId role");

    return NextResponse.json({
      success: true,
      message: "Time session stopped successfully",
      session: populatedSession,
      taskStatus: task?.status,
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

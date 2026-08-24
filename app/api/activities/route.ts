import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/roles";
import { connectToDatabase } from "@/lib/db";
import { ActivityLog } from "@/models/ActivityLog";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { Project } from "@/models/Project";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    await connectToDatabase();

    // Ensure models are registered
    void Task;
    void User;
    void Project;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "40", 10)));
    const actionFilter = searchParams.get("action");

    const query: any = {};
    if (actionFilter && actionFilter !== "all") {
      query.action = actionFilter;
    }

    let activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("user", "name clerkId role imageUrl")
      .populate({
        path: "task",
        select: "title status project",
        populate: {
          path: "project",
          select: "name",
        },
      })
      .populate("project", "name");

    // If activity logs are empty (e.g. freshly created model), synthesize from TimeSession history
    if (activities.length === 0 && (!actionFilter || actionFilter === "all")) {
      const recentSessions = await TimeSession.find()
        .sort({ startTime: -1 })
        .limit(20)
        .populate("user", "name clerkId role imageUrl")
        .populate({
          path: "task",
          select: "title status project",
          populate: {
            path: "project",
            select: "name",
          },
        });

      const synthesized = recentSessions.map((sess) => ({
        _id: sess._id.toString(),
        user: sess.user,
        action: sess.endTime ? "logged_session" : "started_task",
        task: sess.task,
        project: (sess.task as any)?.project,
        details: sess.endTime
          ? `Logged ${sess.durationMinutes || 1} min session`
          : "Started working on task",
        createdAt: sess.endTime || sess.startTime,
      }));

      return NextResponse.json({
        success: true,
        activities: synthesized,
      });
    }

    return NextResponse.json({
      success: true,
      activities,
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

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/roles";
import { connectToDatabase } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    await connectToDatabase();

    let query: any = { endTime: null };

    if (projectId) {
      const taskIds = await Task.find({ project: projectId }).distinct("_id");
      query.task = { $in: taskIds };
    }

    // Fetch active sessions matching query
    const activeSessions = await TimeSession.find(query)
      .populate("user", "name clerkId role")
      .populate({
        path: "task",
        select: "title description status estimatedMinutes project",
        populate: { path: "project", select: "name" },
      })
      .sort({ startTime: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: activeSessions.length,
      activeSessions,
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

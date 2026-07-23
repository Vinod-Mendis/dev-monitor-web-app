import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { connectToDatabase } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";

export async function GET(req: Request) {
  try {
    const currentUser = await syncCurrentUser();
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const requestedUserId = searchParams.get("userId");

    await connectToDatabase();

    const query: any = {};

    if (taskId) {
      query.task = taskId;
    }

    if (currentUser.role === "admin") {
      if (requestedUserId) {
        query.user = requestedUserId;
      }
    } else {
      // Interns can only view their own session history
      query.user = currentUser._id;
    }

    const sessions = await TimeSession.find(query)
      .populate("task", "title description status")
      .populate("user", "name clerkId role")
      .sort({ startTime: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/roles";
import { connectToDatabase } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";

export async function GET() {
  try {
    await requireAdmin();
    await connectToDatabase();

    // Fetch all currently running sessions (endTime: null) across all users
    const activeSessions = await TimeSession.find({ endTime: null })
      .populate("user", "name clerkId role")
      .populate("task", "title description status estimatedMinutes")
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

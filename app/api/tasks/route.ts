import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { requireAdmin } from "@/lib/roles";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const currentAdmin = await syncCurrentUser();

    const body = await req.json();
    const { title, description, assignedTo, estimatedMinutes } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      );
    }

    if (!assignedTo) {
      return NextResponse.json(
        { success: false, error: "assignedTo (User ID or Clerk ID) is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if assignedTo is a valid MongoDB User ID or Clerk ID
    let assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      assignedUser = await User.findOne({ clerkId: assignedTo });
    }

    if (!assignedUser) {
      return NextResponse.json(
        { success: false, error: "Assigned user not found in database" },
        { status: 404 }
      );
    }

    const newTask = await Task.create({
      title,
      description: description || "",
      assignedTo: assignedUser._id,
      createdBy: currentAdmin._id,
      status: "not_started",
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
    });

    const populatedTask = await Task.findById(newTask._id)
      .populate("assignedTo", "name clerkId role")
      .populate("createdBy", "name clerkId role");

    return NextResponse.json({ success: true, task: populatedTask }, { status: 201 });
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

export async function GET() {
  try {
    const currentUser = await syncCurrentUser();
    await connectToDatabase();

    // Query tasks: Admin sees all tasks; Intern sees assigned tasks
    const query = currentUser.role === "admin" ? {} : { assignedTo: currentUser._id };

    const tasks = await Task.find(query)
      .populate("assignedTo", "name clerkId role")
      .populate("createdBy", "name clerkId role")
      .sort({ createdAt: -1 })
      .lean();

    // Calculate total time dynamically per task by summing TimeSession records
    const taskIds = tasks.map((t: any) => t._id);

    const sessionStats = await TimeSession.aggregate([
      { $match: { task: { $in: taskIds } } },
      {
        $group: {
          _id: "$task",
          totalDurationMinutes: {
            $sum: { $ifNull: ["$durationMinutes", 0] },
          },
          sessionCount: { $sum: 1 },
        },
      },
    ]);

    const statsMap = new Map<string, { totalDurationMinutes: number; sessionCount: number }>();
    sessionStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), {
        totalDurationMinutes: stat.totalDurationMinutes,
        sessionCount: stat.sessionCount,
      });
    });

    const tasksWithStats = tasks.map((t: any) => {
      const stats = statsMap.get(t._id.toString()) || { totalDurationMinutes: 0, sessionCount: 0 };
      return {
        ...t,
        totalDurationMinutes: stats.totalDurationMinutes,
        sessionCount: stats.sessionCount,
      };
    });

    return NextResponse.json({ success: true, tasks: tasksWithStats });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

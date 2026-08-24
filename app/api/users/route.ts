import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";

export async function GET(req: Request) {
  try {
    const currentUser = await syncCurrentUser();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");
    const searchQuery = searchParams.get("q")?.trim();

    const query: any = {};
    if (roleFilter && (roleFilter === "admin" || roleFilter === "intern")) {
      query.role = roleFilter;
    }

    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("_id name email imageUrl clerkId role createdAt updatedAt")
      .sort({ role: 1, name: 1 })
      .lean();

    const userIds = users.map((u: any) => u._id);

    // Aggregate task statistics per user
    const taskStats = await Task.aggregate([
      { $match: { assignedTo: { $in: userIds } } },
      {
        $group: {
          _id: "$assignedTo",
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
          },
        },
      },
    ]);

    const taskStatsMap = new Map<string, any>();
    taskStats.forEach((st) => {
      taskStatsMap.set(st._id.toString(), st);
    });

    // Aggregate time session statistics per user
    const timeStats = await TimeSession.aggregate([
      { $match: { user: { $in: userIds } } },
      {
        $group: {
          _id: "$user",
          totalDurationMinutes: {
            $sum: { $ifNull: ["$durationMinutes", 0] },
          },
          sessionCount: { $sum: 1 },
        },
      },
    ]);

    const timeStatsMap = new Map<string, any>();
    timeStats.forEach((ts) => {
      timeStatsMap.set(ts._id.toString(), ts);
    });

    // Fetch active session per user (if running)
    const activeSessions = await TimeSession.find({
      user: { $in: userIds },
      endTime: null,
    })
      .populate("task", "title")
      .lean();

    const activeSessionMap = new Map<string, any>();
    activeSessions.forEach((as) => {
      activeSessionMap.set(as.user.toString(), as);
    });

    // Overall user counts by role
    const totalCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "admin" });
    const internCount = await User.countDocuments({ role: "intern" });

    const enrichedUsers = users.map((u: any) => {
      const uIdStr = u._id.toString();
      const tStat = taskStatsMap.get(uIdStr) || {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
      };
      const timeStat = timeStatsMap.get(uIdStr) || {
        totalDurationMinutes: 0,
        sessionCount: 0,
      };
      const activeSes = activeSessionMap.get(uIdStr) || null;

      return {
        ...u,
        totalTasks: tStat.totalTasks,
        completedTasks: tStat.completedTasks,
        inProgressTasks: tStat.inProgressTasks,
        totalDurationMinutes: timeStat.totalDurationMinutes,
        sessionCount: timeStat.sessionCount,
        isCurrentlyWorking: !!activeSes,
        activeTask: activeSes?.task ? { _id: activeSes.task._id, title: activeSes.task.title } : null,
      };
    });

    return NextResponse.json({
      success: true,
      counts: {
        total: totalCount,
        admin: adminCount,
        intern: internCount,
      },
      users: enrichedUsers,
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

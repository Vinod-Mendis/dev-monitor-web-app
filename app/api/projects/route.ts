import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { requireAdmin } from "@/lib/roles";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";
import { connectToDatabase } from "@/lib/db";

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const currentAdmin = await syncCurrentUser();

    const body = await req.json();
    const { name, description, status, deadline } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.create({
      name: name.trim(),
      description: description ? description.trim() : "",
      createdBy: currentAdmin._id,
      status: status || "active",
      deadline: deadline ? new Date(deadline) : null,
    });

    const populatedProject = await Project.findById(project._id).populate(
      "createdBy",
      "name clerkId role"
    );

    return NextResponse.json(
      { success: true, project: populatedProject },
      { status: 201 }
    );
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

    let projectQuery: any = {};
    if (currentUser.role !== "admin") {
      // Intern: find all project IDs where at least 1 task is assigned to currentUser
      const assignedTaskProjectIds = await Task.distinct("project", {
        assignedTo: currentUser._id,
      });
      projectQuery = { _id: { $in: assignedTaskProjectIds } };
    }

    const projects = await Project.find(projectQuery)
      .populate("createdBy", "name clerkId role")
      .sort({ createdAt: -1 })
      .lean();

    const projectIds = projects.map((p: any) => p._id);

    // Calculate dynamic aggregates per project across child tasks
    const taskStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: "$project",
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          estimatedMinutes: {
            $sum: { $ifNull: ["$estimatedMinutes", 0] },
          },
          taskIds: { $push: "$_id" },
        },
      },
    ]);

    const taskStatsMap = new Map<string, any>();
    const allTaskIds: any[] = [];

    taskStats.forEach((stat) => {
      taskStatsMap.set(stat._id.toString(), stat);
      if (Array.isArray(stat.taskIds)) {
        allTaskIds.push(...stat.taskIds);
      }
    });

    // Dynamic sum of TimeSessions across all child tasks for these projects
    const sessionStats = await TimeSession.aggregate([
      { $match: { task: { $in: allTaskIds } } },
      {
        $group: {
          _id: "$task",
          taskLoggedMinutes: {
            $sum: { $ifNull: ["$durationMinutes", 0] },
          },
        },
      },
    ]);

    const taskLoggedMap = new Map<string, number>();
    sessionStats.forEach((stat) => {
      taskLoggedMap.set(stat._id.toString(), stat.taskLoggedMinutes);
    });

    const projectLoggedMap = new Map<string, number>();
    taskStats.forEach((stat) => {
      let totalLogged = 0;
      stat.taskIds.forEach((tId: any) => {
        totalLogged += taskLoggedMap.get(tId.toString()) || 0;
      });
      projectLoggedMap.set(stat._id.toString(), totalLogged);
    });

    const projectsWithAggregates = projects.map((p: any) => {
      const pIdStr = p._id.toString();
      const stats = taskStatsMap.get(pIdStr) || {
        totalTasks: 0,
        completedTasks: 0,
        estimatedMinutes: 0,
      };
      const totalDurationMinutes = projectLoggedMap.get(pIdStr) || 0;

      return {
        ...p,
        totalTasks: stats.totalTasks,
        completedTasks: stats.completedTasks,
        estimatedMinutes: stats.estimatedMinutes,
        totalDurationMinutes,
      };
    });

    return NextResponse.json({ success: true, projects: projectsWithAggregates });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

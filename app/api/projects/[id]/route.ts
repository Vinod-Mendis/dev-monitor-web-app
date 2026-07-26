import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { requireAdmin } from "@/lib/roles";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { TimeSession } from "@/models/TimeSession";
import { connectToDatabase } from "@/lib/db";
import { Types } from "mongoose";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await syncCurrentUser();
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const staleDays = parseInt(searchParams.get("staleDays") || "5", 10);

    if (!Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const project = await Project.findById(projectId)
      .populate("createdBy", "name clerkId role")
      .lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Role-based access check for interns
    if (currentUser.role !== "admin") {
      const hasAssignedTask = await Task.exists({
        project: project._id,
        assignedTo: currentUser._id,
      });

      if (!hasAssignedTask) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: You do not have permission to view this project",
          },
          { status: 403 }
        );
      }
    }

    // Query tasks belonging to this project (intern sees only assigned tasks in task list or project tasks?)
    // Note: Intern can see assigned tasks in this project
    const taskQuery: any = { project: project._id };
    if (currentUser.role !== "admin") {
      taskQuery.assignedTo = currentUser._id;
    }

    const tasks = await Task.find(taskQuery)
      .populate("assignedTo", "name clerkId role")
      .populate("createdBy", "name clerkId role")
      .sort({ createdAt: -1 })
      .lean();

    const taskIds = tasks.map((t: any) => t._id);

    // Dynamic session stats per task
    const sessionStats = await TimeSession.aggregate([
      { $match: { task: { $in: taskIds } } },
      {
        $group: {
          _id: "$task",
          totalDurationMinutes: {
            $sum: { $ifNull: ["$durationMinutes", 0] },
          },
          sessionCount: { $sum: 1 },
          lastActivityStart: { $max: "$startTime" },
          lastActivityEnd: { $max: "$endTime" },
        },
      },
    ]);

    const statsMap = new Map<string, any>();
    sessionStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat);
    });

    const now = new Date();
    let totalProjectDurationMinutes = 0;
    let totalProjectEstimatedMinutes = 0;
    let completedTasksCount = 0;

    const tasksWithStats = tasks.map((t: any) => {
      const stats = statsMap.get(t._id.toString()) || {
        totalDurationMinutes: 0,
        sessionCount: 0,
        lastActivityStart: null,
        lastActivityEnd: null,
      };

      totalProjectDurationMinutes += stats.totalDurationMinutes;
      if (t.estimatedMinutes) {
        totalProjectEstimatedMinutes += t.estimatedMinutes;
      }
      if (t.status === "completed") {
        completedTasksCount++;
      }

      // Calculate last activity date
      const lastActivityDate =
        stats.lastActivityEnd ||
        stats.lastActivityStart ||
        new Date(t.createdAt);

      const daysInactive = Math.floor(
        (now.getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const isStale = t.status !== "completed" && daysInactive >= staleDays;

      return {
        ...t,
        totalDurationMinutes: stats.totalDurationMinutes,
        sessionCount: stats.sessionCount,
        lastActivityDate,
        daysInactive,
        isStale,
      };
    });

    const totalTasksCount = tasks.length;

    return NextResponse.json({
      success: true,
      project: {
        ...project,
        totalTasks: totalTasksCount,
        completedTasks: completedTasksCount,
        estimatedMinutes: totalProjectEstimatedMinutes,
        totalDurationMinutes: totalProjectDurationMinutes,
      },
      tasks: tasksWithStats,
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;

    if (!Types.ObjectId.isValid(projectId)) {
      return NextResponse.json(
        { success: false, error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, description, status, deadline } = body;

    await connectToDatabase();

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    if (name !== undefined && typeof name === "string") {
      project.name = name.trim();
    }
    if (description !== undefined && typeof description === "string") {
      project.description = description.trim();
    }
    if (status !== undefined && ["active", "completed", "archived"].includes(status)) {
      project.status = status;
    }
    if (deadline !== undefined) {
      project.deadline = deadline ? new Date(deadline) : null;
    }

    await project.save();

    const updatedProject = await Project.findById(project._id).populate(
      "createdBy",
      "name clerkId role"
    );

    return NextResponse.json({
      success: true,
      message: "Project updated successfully",
      project: updatedProject,
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

import { connectToDatabase } from "@/lib/db";
import { ActivityLog, ActivityAction } from "@/models/ActivityLog";

export interface LogActivityParams {
  userId: any;
  action: ActivityAction;
  taskId?: any;
  projectId?: any;
  details?: string;
  metadata?: Record<string, any>;
}

export async function logActivity({
  userId,
  action,
  taskId,
  projectId,
  details = "",
  metadata = {},
}: LogActivityParams): Promise<void> {
  try {
    await connectToDatabase();
    await ActivityLog.create({
      user: userId,
      action,
      task: taskId || undefined,
      project: projectId || undefined,
      details,
      metadata,
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

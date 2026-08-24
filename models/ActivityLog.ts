import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type ActivityAction =
  | "started_task"
  | "logged_session"
  | "submitted_for_review"
  | "requested_changes"
  | "completed_task"
  | "created_task";

export interface IActivityLog extends Document {
  user: Types.ObjectId;
  action: ActivityAction;
  task?: Types.ObjectId;
  project?: Types.ObjectId;
  details?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "started_task",
        "logged_session",
        "submitted_for_review",
        "requested_changes",
        "completed_task",
        "created_task",
      ],
      required: true,
      index: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: false,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: false,
      index: true,
    },
    details: {
      type: String,
      default: "",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Invalidate cached model in Next.js development HMR
if (mongoose.models.ActivityLog) {
  try {
    delete (mongoose.models as any).ActivityLog;
  } catch {
    // Ignore
  }
}

export const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

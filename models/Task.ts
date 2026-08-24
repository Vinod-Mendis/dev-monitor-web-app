import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "paused"
  | "under_review"
  | "fixes_needed"
  | "completed";

export interface ITask extends Document {
  title: string;
  description?: string;
  project: Types.ObjectId;
  assignedTo: Types.ObjectId;
  createdBy: Types.ObjectId;
  status: TaskStatus;
  estimatedMinutes?: number;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "not_started",
        "in_progress",
        "paused",
        "under_review",
        "fixes_needed",
        "completed",
      ],
      default: "not_started",
    },
    estimatedMinutes: {
      type: Number,
    },
    reviewNote: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Clear cached model in development to ensure new enum values and schema changes take effect immediately
if (mongoose.models.Task) {
  try {
    delete (mongoose.models as any).Task;
  } catch {
    // Ignore
  }
}

export const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

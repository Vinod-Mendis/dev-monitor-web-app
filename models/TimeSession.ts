import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ITimeSession extends Document {
  task: Types.ObjectId;
  user: Types.ObjectId;
  startTime: Date;
  endTime?: Date | null;
  durationMinutes?: number;
  note?: string;
}

const TimeSessionSchema = new Schema<ITimeSession>(
  {
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: null,
    },
    note: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const TimeSession: Model<ITimeSession> =
  mongoose.models.TimeSession ||
  mongoose.model<ITimeSession>("TimeSession", TimeSessionSchema);

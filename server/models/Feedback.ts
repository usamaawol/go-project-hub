import mongoose, { Schema, type Document } from "mongoose";

export interface IFeedback extends Document {
  userId?: string;
  email?: string;
  rating: number;
  category: "feature" | "bug" | "template_request" | "general";
  comment: string;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: String, default: null },
    email: { type: String, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    category: {
      type: String,
      enum: ["feature", "bug", "template_request", "general"],
      default: "general",
    },
    comment: { type: String, required: true },
  },
  { timestamps: true },
);

export const FeedbackModel =
  mongoose.models.Feedback || mongoose.model<IFeedback>("Feedback", FeedbackSchema);

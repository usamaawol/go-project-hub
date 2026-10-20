import mongoose, { Schema, type Document } from "mongoose";

export interface IDocumentJob extends Document {
  jobId: string;
  userId?: string;
  toolType: "convert" | "compress" | "extract" | "presentation";
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  status: "pending" | "processing" | "completed" | "failed";
  metrics?: {
    processingTimeMs?: number;
    reductionPercent?: number;
    outputSizeBytes?: number;
    slideCount?: number;
    extractedWordCount?: number;
  };
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentJobSchema = new Schema<IDocumentJob>(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true, default: null },
    toolType: {
      type: String,
      enum: ["convert", "compress", "extract", "presentation"],
      required: true,
    },
    originalFilename: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    metrics: {
      processingTimeMs: { type: Number },
      reductionPercent: { type: Number },
      outputSizeBytes: { type: Number },
      slideCount: { type: Number },
      extractedWordCount: { type: Number },
    },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

export const DocumentJobModel =
  mongoose.models.DocumentJob || mongoose.model<IDocumentJob>("DocumentJob", DocumentJobSchema);

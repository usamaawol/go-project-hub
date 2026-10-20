import mongoose, { Schema, type Document } from "mongoose";

export interface ITemplate extends Document {
  templateId: string;
  name: string;
  category: string;
  kind: string;
  slidesCount: number;
  fonts: string;
  colors: {
    primary: string;
    accent: string;
    bg: string;
  };
  bestFor: string;
  description: string;
  tags: string[];
  slides: Array<{
    title: string;
    subtitle?: string;
    bullets?: string[];
    layout: string;
  }>;
  isPublished: boolean;
  isFree: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    kind: { type: String, required: true },
    slidesCount: { type: Number, default: 16 },
    fonts: { type: String, default: "Newsreader + Manrope" },
    colors: {
      primary: { type: String, default: "#0F172A" },
      accent: { type: String, default: "#2563EB" },
      bg: { type: String, default: "#FAF8F5" },
    },
    bestFor: { type: String, default: "" },
    description: { type: String, default: "" },
    tags: [{ type: String }],
    slides: [
      {
        title: { type: String, required: true },
        subtitle: { type: String },
        bullets: [{ type: String }],
        layout: { type: String, default: "content" },
      },
    ],
    isPublished: { type: Boolean, default: true, index: true },
    isFree: { type: Boolean, default: true }, // Free access policy guaranteed
  },
  { timestamps: true },
);

export const TemplateModel =
  mongoose.models.Template || mongoose.model<ITemplate>("Template", TemplateSchema);

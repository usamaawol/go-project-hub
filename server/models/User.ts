import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  firebaseUid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: "user" | "admin";
  preferences?: {
    defaultCompression?: string;
    presentationFormat?: string;
    theme?: "light" | "dark";
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, index: true },
    displayName: { type: String, default: "" },
    photoURL: { type: String, default: "" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    preferences: {
      defaultCompression: { type: String, default: "Balanced" },
      presentationFormat: { type: String, default: "16:9" },
      theme: { type: String, enum: ["light", "dark"], default: "light" },
    },
  },
  { timestamps: true },
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

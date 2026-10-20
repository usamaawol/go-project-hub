import mongoose from "mongoose";
import { ENV } from "./env";

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  if (isConnected) return true;

  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log("MongoDB connection established successfully.");
    return true;
  } catch (error) {
    console.warn(
      `MongoDB connection warning: Could not connect to ${ENV.MONGO_URI}. Server will operate in memory-fallback mode for document transformations.`,
      (error as Error).message,
    );
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

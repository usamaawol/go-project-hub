import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI:
    process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/documind",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || "",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};

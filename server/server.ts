import { app } from "./app";
import { connectDB } from "./config/db";
import { ENV } from "./config/env";

async function startServer() {
  await connectDB();

  const server = app.listen(ENV.PORT, () => {
    console.log(`[DocuMind API] Running on http://localhost:${ENV.PORT}`);
    console.log(`[DocuMind API] Health Check: http://localhost:${ENV.PORT}/api/health`);
    console.log(`[DocuMind API] Free Access Policy: 110 Free Templates Enforced`);
  });

  const handleShutdown = () => {
    console.log("Shutting down DocuMind API server...");
    server.close(() => {
      console.log("DocuMind API server closed gracefully.");
      process.exit(0);
    });
  };

  process.on("SIGINT", handleShutdown);
  process.on("SIGTERM", handleShutdown);
}

if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  startServer().catch((err) => {
    console.error("Fatal error starting DocuMind server:", err);
    process.exit(1);
  });
}

export { startServer };

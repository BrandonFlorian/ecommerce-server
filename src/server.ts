import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import { logger } from "./utils/logger";

const PORT = process.env.PORT || 3001;

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
const server = app.listen(PORT, () => {
  logger.info(
    `Server listening on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
  server.close(() => process.exit(1));
});

// Handle server shutdown gracefully
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  server.close(() => {
    logger.info("Process terminated");
  });
});

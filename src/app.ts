import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";

//routes
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/product.routes";
import userRoutes from "./routes/user.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import adminRoutes from "./routes/admin.routes";
import shippingRoutes from "./routes/shipping.routes";

import { AppError } from "./utils/appError";
import { requestLogger } from "./utils/logger";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

// Middleware
app.use(helmet());

// Configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/shipping", shippingRoutes);

// 404 handler
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server.`, 404));
});

// Global error handler
app.use(errorHandler);

export default app;

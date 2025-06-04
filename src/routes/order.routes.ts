import express from "express";
import {
  getMyOrders,
  getOrderDetails,
  cancelMyOrder,
  adminGetAllOrders,
  adminGetOrderDetails,
  adminUpdateOrderStatus,
} from "../controllers/order.controller";
import { updateOrderStatusValidator } from "../utils/validators/order.validator";
import { protect, restrictTo, optionalAuth } from "../middlewares/auth.middleware";
import { getOrderByPaymentIntent } from "@/controllers/payment.controller";

const router = express.Router();

// Order by payment intent route (accessible with optional auth)
router.get(
  '/by-payment-intent/:paymentIntentId',
  optionalAuth,
  getOrderByPaymentIntent
);

// Protected routes for authenticated users
router.use(protect);

// User order routes
router.get("/my-orders", getMyOrders);
router.get("/my-orders/:id", getOrderDetails);
router.post("/my-orders/:id/cancel", cancelMyOrder);

// Admin only routes
router.use(restrictTo("admin"));

router.get("/admin", adminGetAllOrders);
router.get("/admin/:id", adminGetOrderDetails);
router.put(
  "/admin/:id/status",
  updateOrderStatusValidator,
  adminUpdateOrderStatus
);

export default router;

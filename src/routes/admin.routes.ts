import express from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware";
import {
  adminGetAllOrders,
  adminGetOrderDetails,
  adminUpdateOrderStatus,
} from "../controllers/order.controller";
import {
  adminGetAllUsers,
  adminGetUserDetails,
} from "../controllers/user.controller";
import { updateOrderStatusValidator } from "../utils/validators/order.validator";

const router = express.Router();

// Protected routes for admins only
router.use(protect);
router.use(restrictTo("admin"));

// Dashboard stats route
router.get("/dashboard", (req, res) => {
  // This would be implemented with stats about orders, users, revenue, etc.
  res.status(200).json({
    status: "success",
    data: {
      message: "Admin dashboard stats will be implemented here",
    },
  });
});

// Order management routes
router.get("/orders", adminGetAllOrders);
router.get("/orders/:id", adminGetOrderDetails);
router.put("/orders/:id", updateOrderStatusValidator, adminUpdateOrderStatus);

// User management routes
router.get("/users", adminGetAllUsers);
router.get("/users/:id", adminGetUserDetails);

export default router;

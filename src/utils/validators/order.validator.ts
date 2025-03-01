import { body } from "express-validator";

// Validation rules for updating order status
export const updateOrderStatusValidator = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([
      "pending",
      "paid",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ])
    .withMessage("Invalid status value"),

  body("tracking_number")
    .optional()
    .isString()
    .withMessage("Tracking number must be a string")
    .isLength({ max: 100 })
    .withMessage("Tracking number must be at most 100 characters"),
];

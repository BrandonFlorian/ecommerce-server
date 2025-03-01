import { body } from "express-validator";

// Validation rules for calculating shipping rates
export const shippingRateValidator = [
  body("address_id").notEmpty().withMessage("Shipping address ID is required"),

  body("cart_id").notEmpty().withMessage("Cart ID is required"),
];

// Validation rules for validating a shipping address
export const addressValidator = [
  body("address_line1")
    .notEmpty()
    .withMessage("Address line 1 is required")
    .isLength({ max: 100 })
    .withMessage("Address line 1 must be at most 100 characters"),

  body("address_line2")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Address line 2 must be at most 100 characters"),

  body("city")
    .notEmpty()
    .withMessage("City is required")
    .isLength({ max: 50 })
    .withMessage("City must be at most 50 characters"),

  body("state")
    .notEmpty()
    .withMessage("State is required")
    .isLength({ max: 50 })
    .withMessage("State must be at most 50 characters"),

  body("postal_code")
    .notEmpty()
    .withMessage("Postal code is required")
    .isLength({ max: 20 })
    .withMessage("Postal code must be at most 20 characters"),

  body("country")
    .notEmpty()
    .withMessage("Country is required")
    .isLength({ max: 50 })
    .withMessage("Country must be at most 50 characters"),
];

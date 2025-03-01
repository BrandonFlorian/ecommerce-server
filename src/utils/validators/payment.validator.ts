import { body } from "express-validator";

// Validation rules for creating a payment intent
export const createPaymentIntentValidator = [
  body("cart_id").notEmpty().withMessage("Cart ID is required"),

  body("shipping_address_id")
    .notEmpty()
    .withMessage("Shipping address ID is required"),

  body("billing_address_id")
    .notEmpty()
    .withMessage("Billing address ID is required"),

  body("shipping_method").notEmpty().withMessage("Shipping method is required"),

  body("customer_id").optional(),

  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

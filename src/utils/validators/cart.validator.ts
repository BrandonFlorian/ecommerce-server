import { body } from "express-validator";

// Validation rules for adding item to cart
export const addToCartValidator = [
  body("product_id").notEmpty().withMessage("Product ID is required"),

  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
];

// Validation rules for updating cart item
export const updateCartItemValidator = [
  body("quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer"),
];

import { body } from "express-validator";

// Validation rules for updating user profile
export const updateProfileValidator = [
  body("first_name")
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name must be at most 50 characters"),

  body("last_name")
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name must be at most 50 characters"),

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),
];

// Validation rules for adding/updating address
export const addressValidator = [
  body("name")
    .notEmpty()
    .withMessage("Address name is required")
    .isLength({ max: 100 })
    .withMessage("Address name must be at most 100 characters"),

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

  body("is_default")
    .optional()
    .isBoolean()
    .withMessage("Is default must be a boolean"),
];

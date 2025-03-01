import { body } from "express-validator";

// Validation rules for user registration
export const registerValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter"),
  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name must be at most 50 characters"),
  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name must be at most 50 characters"),
  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Please provide a valid phone number"),
];

// Validation rules for user login
export const loginValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// Validation rules for forgot password request
export const forgotPasswordValidator = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

// Validation rules for password reset
export const resetPasswordValidator = [
  body("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/\d/)
    .withMessage("Password must contain at least one number")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter"),
];

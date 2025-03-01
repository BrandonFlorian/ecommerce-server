import express from "express";
import {
  register,
  login,
  forgotPasswordController,
  resetPasswordController,
  getCurrentUser,
} from "../controllers/auth.controller";
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
} from "../utils/validators/auth.validator";
import { protect } from "../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.post("/register", registerValidator, register);
router.post("/login", loginValidator, login);
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  forgotPasswordController
);
router.post("/reset-password", resetPasswordValidator, resetPasswordController);

// Protected routes
router.get("/me", protect, getCurrentUser);

export default router;

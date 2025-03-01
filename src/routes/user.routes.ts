import express from "express";
import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  removeAddress,
  adminGetAllUsers,
  adminGetUserDetails,
} from "../controllers/user.controller";
import {
  updateProfileValidator,
  addressValidator,
} from "../utils/validators/user.validator";
import { protect, restrictTo } from "../middlewares/auth.middleware";

const router = express.Router();

// Protected routes
router.use(protect);

// User profile routes
router.get("/me", getProfile);
router.put("/me", updateProfileValidator, updateProfile);

// User address routes
router.get("/me/addresses", getAddresses);
router.post("/me/addresses", addressValidator, addAddress);
router.put("/me/addresses/:id", addressValidator, updateAddress);
router.delete("/me/addresses/:id", removeAddress);

// Admin only routes
router.use(restrictTo("admin"));

router.get("/admin", adminGetAllUsers);
router.get("/admin/:id", adminGetUserDetails);

export default router;

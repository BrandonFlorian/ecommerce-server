import express from "express";
import {
  getShippingRates,
  validateShippingAddress,
  trackOrder,
  createShippingLabel,
} from "../controllers/shipping.controller";
import {
  shippingRateValidator,
  addressValidator,
} from "../utils/validators/shipping.validator";
import { protect, restrictTo } from "@/middlewares/auth.middleware";

const router = express.Router();

// Calculate shipping rates
router.post("/calculate", shippingRateValidator, getShippingRates);

// Validate address
router.post("/validate-address", addressValidator, validateShippingAddress);

// Get tracking information
router.get("/tracking/:trackingNumber", trackOrder);

router.post("/orders/:orderId/create-label", protect, restrictTo("admin"), createShippingLabel)

export default router;

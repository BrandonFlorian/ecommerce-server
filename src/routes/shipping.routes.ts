import express from "express";
import {
  getShippingRates,
  validateShippingAddress,
  trackOrder,
} from "../controllers/shipping.controller";
import {
  shippingRateValidator,
  addressValidator,
} from "../utils/validators/shipping.validator";

const router = express.Router();

// Calculate shipping rates
router.post("/calculate", shippingRateValidator, getShippingRates);

// Validate address
router.post("/validate-address", addressValidator, validateShippingAddress);

// Get tracking information
router.get("/tracking/:trackingNumber", trackOrder);

export default router;

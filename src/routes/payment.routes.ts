import express from "express";
import {
  createCheckoutSession,
  checkPaymentStatus,
  stripeWebhook,
} from "../controllers/payment.controller";
import { createPaymentIntentValidator } from "../utils/validators/payment.validator";
import { protect } from "../middlewares/auth.middleware";

const router = express.Router();

// Public route for Stripe webhook
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// Protected routes
router.use(protect);

router.post(
  "/create-payment-intent",
  createPaymentIntentValidator,
  createCheckoutSession
);
router.get("/payment-status/:paymentIntentId", checkPaymentStatus);

export default router;

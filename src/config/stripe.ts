import Stripe from "stripe";
import { logger } from "../utils/logger";

// Ensure required environment variables are set
if (!process.env.STRIPE_SECRET_KEY) {
  logger.error("Missing Stripe environment variables");
  process.exit(1);
}

// Create a Stripe instance
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
  typescript: true,
});

export default stripe;

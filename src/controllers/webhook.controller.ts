import { Request, Response } from "express";
import stripe from "../config/stripe";
import { handleStripeWebhook } from "../services/payment.service";
import { logger } from "../utils/logger";

export const handleStripeWebhookRequest = (
  req: Request,
  res: Response
): void => {
  try {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      logger.error("No Stripe signature found in webhook request");
      res.status(400).json({ error: "Stripe signature missing" });
      return;
    }

    // Verify the event
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      logger.error(`Webhook signature verification failed: ${err.message}`);
      res.status(400).json({ error: `Webhook Error: ${err.message}` });
      return;
    }

    logger.info(`Webhook received: ${event.type}`);

    // Process the event asynchronously but don't await it
    // This allows us to return a 200 response quickly
    handleStripeWebhook(event)
      .then(() => {
        logger.info(`Webhook processed successfully: ${event.type}`);
      })
      .catch((error) => {
        logger.error(`Error processing webhook: ${error.message}`);
      });

    // Return a 200 response immediately
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Unexpected error in webhook handler:", error);
    // Always return 200 to Stripe to prevent retries
    res.status(200).json({ received: true, unexpectedError: true });
  }
};

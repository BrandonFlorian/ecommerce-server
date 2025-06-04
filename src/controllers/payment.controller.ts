import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  createPaymentIntent,
  confirmPaymentIntent,
  handleStripeWebhook,
  CreatePaymentIntentDto,
} from "../services/payment.service";
import { AppError } from "../utils/appError";
import stripe from "../config/stripe";
import { createUserClient, supabaseClient } from "@/config/supabase";

// Create a payment intent for checkout
export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation error", 400));
    }

    const paymentData: CreatePaymentIntentDto = {
      cartId: req.body.cart_id,
      shipping_address_id: req.body.shipping_address_id,
      billing_address_id: req.body.billing_address_id,
      shipping_method: req.body.shipping_method,
      customerId: req.body.customer_id,
      metadata: req.body.metadata,
      shipping_rate_id: req.body.shipping_rate_id,
    };

    const jwt = req.jwt;
    const result = await createPaymentIntent(paymentData, jwt);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Check payment status
export const checkPaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { paymentIntentId } = req.params;
    const jwt = req.jwt;

    const result = await confirmPaymentIntent(paymentIntentId, jwt);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in checkPaymentStatus:", error);
    // Return a 202 Accepted status instead of an error if the payment was successful
    // but we're still processing the order creation
    if (error.message && error.message.includes("shipping")) {
      res.status(202).json({
        status: "processing",
        message: "Payment successful, order is being processed",
        paymentStatus: "succeeded",
        data: {
          status: "succeeded",
          paymentIntentId: req.params.paymentIntentId,
        }
      });
      return;
    }
    next(error);
  }
};

export const getOrderByPaymentIntent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.userId;
    const jwt = req.jwt;

    const client = jwt ? createUserClient(jwt) : supabaseClient;

    // First verify the payment intent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return next(new AppError('Payment not completed', 400));
    }

    // Get the order - no user_id restriction when retrieving by payment intent
    const query = client
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          products (*)
        ),
        shipping_addresses:shipping_address_id (*),
        billing_addresses:billing_address_id (*)
      `)
      .eq('stripe_payment_intent_id', paymentIntentId);

    const { data: order, error } = await query.single();

    if (error || !order) {
      return next(new AppError('Order not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        order,
        items: order.order_items
      }
    });
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhook
export const stripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers["stripe-signature"] as string;

    if (!signature) {
      return res.status(400).json({ error: "Stripe signature missing" });
    }

    let event;

    try {
      // req.body is now a Buffer
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err: any) {
      console.log("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: err.message });
    }

    const result = await handleStripeWebhook(event);

    res.status(200).json(result);
  } catch (error) {
    console.error("Webhook error:", error);
    // Always respond with a 200 to Stripe
    res.status(200).json({ received: true, error: true });
  }
};

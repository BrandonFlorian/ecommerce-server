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
    console.log("createCheckoutSession req", req.body);
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
    console.log("checkPaymentStatus req", req.params);
    const { paymentIntentId } = req.params;

    const result = await confirmPaymentIntent(paymentIntentId);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
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

    // Get the order
    let query = client
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

    // If user is provided, ensure they own the order
    if (userId) {
      query = query.eq('user_id', userId);
    }

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
      console.log("No signature found");
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

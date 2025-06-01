import stripe from "../config/stripe";
import {
  supabaseClient,
  getAdminClient,
  createUserClient,
} from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { getCartWithItems } from "./cart.service";
import { calculateShippingRates } from "./shipping.service";

// Interface for payment intent data
export interface CreatePaymentIntentDto {
  cartId: string;
  customerId?: string;
  shipping_address_id: string;
  billing_address_id: string;
  shipping_method: string;
  shipping_rate_id: string;
  metadata?: Record<string, string>;
}

// Interface for payment method data
export interface SetupPaymentMethodDto {
  paymentIntentId: string;
  paymentMethodId: string;
}

// Create a payment intent for checkout
export const createPaymentIntent = async (
  data: CreatePaymentIntentDto,
  jwt?: string
) => {
  try {
    // Get cart with items
    const { cart, items, summary } = await getCartWithItems(data.cartId, jwt);

    console.log("createPaymentIntent items", items);

    if (!items || items.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    const client = jwt ? createUserClient(jwt) : supabaseClient;
    // Get shipping address for rate calculation
    const { data: shippingAddress, error: addressError } = await client
      .from("addresses")
      .select("*")
      .eq("id", data.shipping_address_id)
      .single();

    console.log("createPaymentIntent shippingAddress", shippingAddress);

    if (addressError || !shippingAddress) {
      logger.error("Error retrieving shipping address:", addressError);
      throw new AppError("Shipping address not found", 404);
    }

    // Calculate shipping cost
    const shippingRates = await calculateShippingRates({
      address: shippingAddress,
      items: items.map((item) => {
        // Check if products is an array or object
        const product = Array.isArray(item.products)
          ? item.products[0]
          : item.products;

        return {
          product_id: product.id,
          quantity: item.quantity,
          weight: product.weight,
          dimensions: product.dimensions,
        };
      }),
    });

    console.log("createPaymentIntent shippingRates", shippingRates);

    // Find selected shipping method
    const selectedShipping = shippingRates.find(
      (rate) => rate.service_code === data.shipping_method
    );

    console.log("createPaymentIntent selectedShipping", selectedShipping);
    
    if (!selectedShipping) {
      throw new AppError("Selected shipping method not available", 400);
    }

    console.log("createPaymentIntent selectedShipping", selectedShipping);

    // Calculate tax (simplified - in a real implementation, use a tax API)
    const taxRate = 0.07; // 7% tax rate - this should come from a tax service based on location
    const taxAmount = Math.round(summary.subtotal * taxRate);

    // Calculate order total
    const totalAmount = Math.round(
      summary.subtotal + taxAmount + selectedShipping.rate
    );

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "usd",
      customer: data.customerId,
      metadata: {
        cart_id: data.cartId,
        user_id: cart.user_id || "",
        shipping_address_id: data.shipping_address_id,
        billing_address_id: data.billing_address_id,
        shipping_method: data.shipping_method,
        shipping_rate_id: data.shipping_rate_id,
        ...(data.metadata || {}),
      },
    });

    console.log("createPaymentIntent paymentIntent", paymentIntent);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
      subtotal: summary.subtotal,
      tax: taxAmount,
      shipping: selectedShipping.rate,
      currency: "usd",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Full error details:", error);

    // Type guard for error object
    if (error && typeof error === "object") {
      if ("message" in error) console.error("Error message:", error.message);
      if ("stack" in error) console.error("Stack trace:", error.stack);
    }

    logger.error("Unexpected error in createPaymentIntent:", error);
    throw new AppError("Failed to create payment intent", 500);
  }
};

// Confirm a payment intent
export const confirmPaymentIntent = async (paymentIntentId: string) => {
  try {
    console.log("confirmPaymentIntent paymentIntentId", paymentIntentId);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log("confirmPaymentIntent paymentIntent", paymentIntent);

    if (paymentIntent.status === "succeeded") {
      // Create order from payment intent metadata
      if (paymentIntent.metadata.cart_id) {
        console.log("confirmPaymentIntent creating order");
        await createOrderFromPaymentIntent(paymentIntent);
      }

      return {
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
      };
    }

    return {
      status: paymentIntent.status,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    logger.error("Error confirming payment intent:", error);
    throw new AppError("Failed to confirm payment", 500);
  }
};

// Handle Stripe webhook events
export const handleStripeWebhook = async (event: any) => {
  try {
    logger.info(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "charge.succeeded":
        await handleChargeSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      case "payment_intent.refunded":
      case "charge.refunded":
        await handleRefund(event.data.object);
        break;

      // Dispute handling events
      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object);
        break;

      case "charge.dispute.updated":
        await handleDisputeUpdated(event.data.object);
        break;

      case "charge.dispute.closed":
        await handleDisputeClosed(event.data.object);
        break;

      // Fraud warning events
      case "radar.early_fraud_warning.created":
        await handleFraudWarningCreated(event.data.object);
        break;

      case "radar.early_fraud_warning.updated":
        await handleFraudWarningUpdated(event.data.object);
        break;

      default:
        // Unexpected event type
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    logger.error("Error handling Stripe webhook:", error);
    // Important: Don't throw errors from webhook handlers
    // Instead, log them and return a success response to Stripe
    // This prevents Stripe from retrying the webhook repeatedly
    return { received: true, error: true };
  }
};

/**
 * Handle payment_intent.succeeded event
 * Creates an order from the payment intent
 */
const handlePaymentIntentSucceeded = async (paymentIntent: any) => {
  try {
    logger.info(`Processing payment_intent.succeeded: ${paymentIntent.id}`);

    // Create order from payment intent metadata
    if (paymentIntent.metadata.cart_id) {
      await createOrderFromPaymentIntent(paymentIntent);
    } else {
      logger.warn(
        `Payment intent ${paymentIntent.id} succeeded but cart_id missing in metadata`
      );
    }
  } catch (error) {
    logger.error(
      `Error processing payment_intent.succeeded for ${paymentIntent.id}:`,
      error
    );
    throw error;
  }
};

/**
 * Handle charge.succeeded event
 * Updates order with receipt URL and payment method details
 */
const handleChargeSucceeded = async (charge: any) => {
  try {
    logger.info(`Processing charge.succeeded: ${charge.id}`);

    // Get the payment intent ID to find the order
    const paymentIntentId = charge.payment_intent;

    if (!paymentIntentId) {
      logger.warn(`Charge ${charge.id} has no associated payment intent`);
      return;
    }

    const adminClient = getAdminClient();

    // Find the order associated with this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (orderError || !order) {
      logger.warn(
        `No order found for payment intent ${paymentIntentId} from charge ${charge.id}`
      );
      return;
    }

    // Extract payment method details
    const paymentMethodDetails = charge.payment_method_details || {};

    // Update the order with receipt URL and payment method details
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        receipt_url: charge.receipt_url,
        payment_method_details: paymentMethodDetails,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logger.error(
        `Error updating order ${order.id} with charge details:`,
        updateError
      );
      throw updateError;
    }

    logger.info(
      `Successfully updated order ${order.id} with charge details from ${charge.id}`
    );
  } catch (error) {
    logger.error(`Error processing charge.succeeded for ${charge.id}:`, error);
    throw error;
  }
};

/**
 * Handle payment_intent.payment_failed event
 * Updates order status if an order exists, or logs failure
 */
const handlePaymentIntentFailed = async (paymentIntent: any) => {
  try {
    logger.info(
      `Processing payment_intent.payment_failed: ${paymentIntent.id}`
    );

    const adminClient = getAdminClient();

    // Check if an order was created for this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, status")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .maybeSingle();

    if (orderError) {
      logger.error(
        `Error checking for order with payment intent ${paymentIntent.id}:`,
        orderError
      );
      throw orderError;
    }

    // If an order exists, update its status
    if (order) {
      // Only update if order is in a pending or processing state
      if (["pending", "processing", "paid"].includes(order.status)) {
        const { error: updateError } = await adminClient
          .from("orders")
          .update({
            status: "payment_failed",
            notes:
              paymentIntent.last_payment_error?.message || "Payment failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        if (updateError) {
          logger.error(
            `Error updating order ${order.id} status to payment_failed:`,
            updateError
          );
          throw updateError;
        }

        logger.info(
          `Updated order ${order.id} status to payment_failed due to failed payment intent ${paymentIntent.id}`
        );
      } else {
        logger.info(
          `Order ${order.id} in status "${order.status}" was not updated for failed payment intent ${paymentIntent.id}`
        );
      }
    } else {
      // No order exists yet, just log the failure
      logger.info(
        `Payment intent ${
          paymentIntent.id
        } failed but no order was created yet. Error: ${
          paymentIntent.last_payment_error?.message || "Unknown error"
        }`
      );
    }
  } catch (error) {
    logger.error(
      `Error processing payment_intent.payment_failed for ${paymentIntent.id}:`,
      error
    );
    throw error;
  }
};

/**
 * Handle refund events (payment_intent.refunded or charge.refunded)
 * Updates order status to reflect the refund
 */
const handleRefund = async (event: any) => {
  try {
    // The event could be either a payment intent or a charge
    const paymentIntentId = event.id || event.payment_intent;

    logger.info(`Processing refund for payment intent: ${paymentIntentId}`);

    if (!paymentIntentId) {
      logger.warn("Refund event has no associated payment intent ID");
      return;
    }

    const adminClient = getAdminClient();

    // Find the order associated with this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, status, total_amount")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (orderError || !order) {
      logger.warn(`No order found for payment intent ${paymentIntentId}`);
      return;
    }

    // Determine if it's a full or partial refund
    let refundStatus = "refunded";
    let refundNotes = "Order fully refunded";

    // For charge.refunded, we can check if it's partial
    if (event.amount_refunded && event.amount) {
      const isPartialRefund = event.amount_refunded < event.amount;
      if (isPartialRefund) {
        refundStatus = "partially_refunded";
        refundNotes = `Order partially refunded (${(
          (event.amount_refunded / event.amount) *
          100
        ).toFixed(2)}%)`;
      }
    }

    // Update the order with refund information
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        status: refundStatus,
        notes: refundNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logger.error(
        `Error updating order ${order.id} with refund details:`,
        updateError
      );
      throw updateError;
    }

    logger.info(
      `Successfully updated order ${order.id} status to ${refundStatus}`
    );
  } catch (error) {
    logger.error(`Error processing refund:`, error);
    throw error;
  }
};

/**
 * Handle dispute.created webhook event
 * Updates order with dispute information
 */
const handleDisputeCreated = async (dispute: any) => {
  try {
    logger.info(`Processing dispute.created: ${dispute.id}`);

    // Get the charge ID associated with the dispute
    const chargeId = dispute.charge;
    if (!chargeId) {
      logger.warn(`Dispute ${dispute.id} has no associated charge`);
      return;
    }

    // Retrieve the charge to get the payment intent
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge || !charge.payment_intent) {
      logger.warn(`Could not find payment intent for charge ${chargeId}`);
      return;
    }

    const paymentIntentId = charge.payment_intent as string;
    const adminClient = getAdminClient();

    // Find the order associated with this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, status")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (orderError || !order) {
      logger.warn(`No order found for payment intent ${paymentIntentId}`);
      return;
    }

    // Update the order with dispute information
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        status: "disputed",
        dispute_status: dispute.status,
        dispute_reason: dispute.reason,
        dispute_evidence: dispute.evidence,
        dispute_created_at: new Date(dispute.created * 1000).toISOString(),
        notes: `Dispute received: ${dispute.reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logger.error(
        `Error updating order ${order.id} with dispute details:`,
        updateError
      );
      throw updateError;
    }

    logger.info(
      `Successfully updated order ${order.id} with dispute information`
    );

    // Here you would typically implement notification logic to alert your team about the dispute
    // e.g., sendDisputeNotification(order.id, dispute);
  } catch (error) {
    logger.error(`Error processing dispute.created for ${dispute.id}:`, error);
    throw error;
  }
};

/**
 * Handle dispute.updated webhook event
 * Updates order with the latest dispute information
 */
const handleDisputeUpdated = async (dispute: any) => {
  try {
    logger.info(`Processing dispute.updated: ${dispute.id}`);

    // Get the charge ID associated with the dispute
    const chargeId = dispute.charge;
    if (!chargeId) {
      logger.warn(`Dispute ${dispute.id} has no associated charge`);
      return;
    }

    // Retrieve the charge to get the payment intent
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge || !charge.payment_intent) {
      logger.warn(`Could not find payment intent for charge ${chargeId}`);
      return;
    }

    const paymentIntentId = charge.payment_intent as string;
    const adminClient = getAdminClient();

    // Find the order associated with this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, dispute_status")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (orderError || !order) {
      logger.warn(`No order found for payment intent ${paymentIntentId}`);
      return;
    }

    // Update the order with the latest dispute information
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        dispute_status: dispute.status,
        dispute_evidence: dispute.evidence,
        notes: `Dispute updated: ${dispute.status}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logger.error(
        `Error updating order ${order.id} with updated dispute details:`,
        updateError
      );
      throw updateError;
    }

    logger.info(
      `Successfully updated order ${order.id} with latest dispute information: ${dispute.status}`
    );
  } catch (error) {
    logger.error(`Error processing dispute.updated for ${dispute.id}:`, error);
    throw error;
  }
};

/**
 * Handle dispute.closed webhook event
 * Updates order with the final dispute resolution
 */
const handleDisputeClosed = async (dispute: any) => {
  try {
    logger.info(`Processing dispute.closed: ${dispute.id}`);

    // Get the charge ID associated with the dispute
    const chargeId = dispute.charge;
    if (!chargeId) {
      logger.warn(`Dispute ${dispute.id} has no associated charge`);
      return;
    }

    // Retrieve the charge to get the payment intent
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge || !charge.payment_intent) {
      logger.warn(`Could not find payment intent for charge ${chargeId}`);
      return;
    }

    const paymentIntentId = charge.payment_intent as string;
    const adminClient = getAdminClient();

    // Find the order associated with this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (orderError || !order) {
      logger.warn(`No order found for payment intent ${paymentIntentId}`);
      return;
    }

    // Determine new order status based on dispute outcome
    let newOrderStatus = "disputed";
    let statusNote = "";

    if (dispute.status === "won") {
      // You won the dispute
      newOrderStatus = "paid"; // Or whatever the original status was
      statusNote = "Dispute resolved in your favor";
    } else if (dispute.status === "lost") {
      // You lost the dispute
      newOrderStatus = "chargeback";
      statusNote = "Dispute lost - chargeback applied";
    } else {
      // Other statuses like 'warning_closed', 'warning_under_review', etc.
      newOrderStatus = `dispute_${dispute.status}`;
      statusNote = `Dispute closed with status: ${dispute.status}`;
    }

    // Update the order with the final dispute resolution
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        status: newOrderStatus,
        dispute_status: dispute.status,
        dispute_resolved_at: new Date(dispute.created * 1000).toISOString(),
        notes: statusNote,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logger.error(
        `Error updating order ${order.id} with dispute resolution:`,
        updateError
      );
      throw updateError;
    }

    logger.info(
      `Successfully updated order ${order.id} with dispute resolution: ${dispute.status}`
    );
  } catch (error) {
    logger.error(`Error processing dispute.closed for ${dispute.id}:`, error);
    throw error;
  }
};

/**
 * Handle radar.early_fraud_warning.created webhook event
 * Flags an order as potentially fraudulent
 */
const handleFraudWarningCreated = async (fraudWarning: any) => {
  try {
    logger.info(`Processing fraud warning created: ${fraudWarning.id}`);

    // Get the charge ID associated with the fraud warning
    const chargeId = fraudWarning.charge;
    if (!chargeId) {
      logger.warn(`Fraud warning ${fraudWarning.id} has no associated charge`);
      return;
    }

    // Retrieve the charge to get the payment intent
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge || !charge.payment_intent) {
      logger.warn(`Could not find payment intent for charge ${chargeId}`);
      return;
    }

    const paymentIntentId = charge.payment_intent as string;
    const adminClient = getAdminClient();

    // Find the order associated with this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, status")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (orderError || !order) {
      logger.warn(`No order found for payment intent ${paymentIntentId}`);
      return;
    }

    // Update the order with fraud warning information
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        status: "flagged_for_review",
        fraud_warning: true,
        fraud_warning_details: {
          id: fraudWarning.id,
          created: fraudWarning.created,
          fraud_type: fraudWarning.fraud_type,
          reason: "Potential fraud detected by Stripe Radar",
        },
        notes: `FRAUD WARNING: ${fraudWarning.fraud_type}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logger.error(
        `Error updating order ${order.id} with fraud warning:`,
        updateError
      );
      throw updateError;
    }

    logger.info(
      `Successfully flagged order ${order.id} for potential fraud: ${fraudWarning.fraud_type}`
    );

    // Need to implement high-priority notification logic
    // to alert security team about the potential fraud
    // e.g., sendFraudAlertNotification(order.id, fraudWarning);
  } catch (error) {
    logger.error(`Error processing fraud warning ${fraudWarning.id}:`, error);
    throw error;
  }
};

/**
 * Handle radar.early_fraud_warning.updated webhook event
 * Updates fraud warning information for an order
 */
const handleFraudWarningUpdated = async (fraudWarning: any) => {
  try {
    logger.info(`Processing fraud warning updated: ${fraudWarning.id}`);

    // Get the charge ID associated with the fraud warning
    const chargeId = fraudWarning.charge;
    if (!chargeId) {
      logger.warn(`Fraud warning ${fraudWarning.id} has no associated charge`);
      return;
    }

    // Retrieve the charge to get the payment intent
    const charge = await stripe.charges.retrieve(chargeId);
    if (!charge || !charge.payment_intent) {
      logger.warn(`Could not find payment intent for charge ${chargeId}`);
      return;
    }

    const paymentIntentId = charge.payment_intent as string;
    const adminClient = getAdminClient();

    // Find the order associated with this payment intent
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .single();

    if (orderError || !order) {
      logger.warn(`No order found for payment intent ${paymentIntentId}`);
      return;
    }

    // Update the order with updated fraud warning information
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        fraud_warning_details: {
          id: fraudWarning.id,
          created: fraudWarning.created,
          fraud_type: fraudWarning.fraud_type,
          actionable: fraudWarning.actionable,
          updated: new Date().toISOString(),
        },
        notes: `FRAUD WARNING UPDATED: ${fraudWarning.fraud_type}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      logger.error(
        `Error updating order ${order.id} with updated fraud warning:`,
        updateError
      );
      throw updateError;
    }

    logger.info(`Successfully updated fraud warning for order ${order.id}`);
  } catch (error) {
    logger.error(
      `Error processing updated fraud warning ${fraudWarning.id}:`,
      error
    );
    throw error;
  }
};

// Create an order from a successful payment intent
export const createOrderFromPaymentIntent = async (paymentIntent: any) => {
  try {
    const { metadata } = paymentIntent;

    // Verify that an order hasn't already been created for this payment
    const { data: existingOrder, error: orderCheckError } = await supabaseClient
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();

    if (orderCheckError) {
      logger.error("Error checking existing order:", orderCheckError);
      throw new AppError("Failed to check existing order", 500);
    }

    // If order already exists, don't create a duplicate
    if (existingOrder) {
      logger.info(`Order ${existingOrder.id} already exists for payment intent ${paymentIntent.id}`);
      return { orderId: existingOrder.id, created: false };
    }

    // Get cart with items
    const { items, summary } = await getCartWithItems(metadata.cart_id);

    if (!items || items.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    // Get shipping address
    const { data: shippingAddress, error: shippingAddressError } =
      await supabaseClient
        .from("addresses")
        .select("*")
        .eq("id", metadata.shipping_address_id)
        .single();

    if (shippingAddressError || !shippingAddress) {
      logger.error("Error retrieving shipping address:", shippingAddressError);
      throw new AppError("Shipping address not found", 404);
    }

    // Get billing address
    const { data: billingAddress, error: billingAddressError } =
      await supabaseClient
        .from("addresses")
        .select("*")
        .eq("id", metadata.billing_address_id)
        .single();

    if (billingAddressError || !billingAddress) {
      logger.error("Error retrieving billing address:", billingAddressError);
      throw new AppError("Billing address not found", 404);
    }

    // Calculate shipping cost (use the saved shipping method from metadata)
    const shippingRates = await calculateShippingRates({
      address: shippingAddress,
      items: items.map((item) => {
        // Ensure product is retrieved correctly whether it's an object or first element of array
        const product = Array.isArray(item.products)
          ? item.products[0]
          : item.products;

        // Ensure dimensions has the expected structure
        const dimensions = product.dimensions as {
          length: number;
          width: number;
          height: number;
        };

        return {
          product_id: product.id,
          quantity: item.quantity,
          weight: product.weight,
          dimensions: dimensions,
        };
      }),
    });

    const selectedShipping = shippingRates.find(
      (rate) => rate.rate_id === metadata.shipping_rate_id
    );

    if (!selectedShipping) {
      throw new AppError("Selected shipping method not available", 400);
    }

    if (selectedShipping.service_code !== metadata.shipping_method) {
      throw new AppError("Shipping method mismatch", 400);
    }

    // Calculate tax
    const taxRate = 0.07; // 7% tax rate
    const taxAmount = Math.round(summary.subtotal * taxRate);

    // Create order
    const adminClient = getAdminClient();

    const { data: order, error: orderError } = await adminClient
    .from("orders")
    .insert([
      {
        user_id: metadata.user_id || null,
        status: "paid",
        total_amount: paymentIntent.amount,
        subtotal: summary.subtotal,
        tax: taxAmount,
        shipping_cost: selectedShipping.rate,
        discount_amount: 0,
        stripe_payment_intent_id: paymentIntent.id,
        billing_address_id: metadata.billing_address_id,
        shipping_address_id: metadata.shipping_address_id,
        shipping_method: metadata.shipping_method,
        shipping_rate_id: metadata.shipping_rate_id, // Add Shippo rate ID
        tracking_number: null,
        notes: null,
        receipt_url: null,
        payment_method_details: null,
      },
    ])
    .select()
    .single();

    if (orderError) {
      logger.error("Error creating order:", orderError);
      throw new AppError("Failed to create order", 500);
    }

    // Add order items
    const orderItems = items.map((item) => {
      // Ensure product is retrieved correctly whether it's an object or first element of array
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;

      return {
        order_id: order.id,
        product_id: product.id,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: product.price * item.quantity,
      };
    });

    const { error: itemsError } = await adminClient
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      logger.error("Error adding order items:", itemsError);
      throw new AppError("Failed to add order items", 500);
    }

    // Update product inventory
    for (const item of items) {
      // Get the product from the array - assuming it's the first item
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products;

      const { error: inventoryError } = await adminClient
        .from("products")
        .update({
          inventory_quantity: product.inventory_quantity - item.quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (inventoryError) {
        logger.error(
          `Error updating inventory for product ${product.id}:`,
          inventoryError
        );
        // Continue with other items
      }
    }

    // Clear the cart
    await adminClient
      .from("cart_items")
      .delete()
      .eq("cart_id", metadata.cart_id);

    return { orderId: order.id, created: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in createOrderFromPaymentIntent:", error);
    throw new AppError("Failed to create order from payment", 500);
  }
};

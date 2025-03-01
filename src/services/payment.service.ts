import stripe from "../config/stripe";
import { supabaseClient, getAdminClient } from "../config/supabase";
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
  metadata?: Record<string, string>;
}

// Interface for payment method data
export interface SetupPaymentMethodDto {
  paymentIntentId: string;
  paymentMethodId: string;
}

// Create a payment intent for checkout
export const createPaymentIntent = async (data: CreatePaymentIntentDto) => {
  try {
    // Get cart with items
    const { cart, items, summary } = await getCartWithItems(data.cartId);

    if (!items || items.length === 0) {
      throw new AppError("Cart is empty", 400);
    }

    // Get shipping address for rate calculation
    const { data: shippingAddress, error: addressError } = await supabaseClient
      .from("addresses")
      .select("*")
      .eq("id", data.shipping_address_id)
      .single();

    if (addressError || !shippingAddress) {
      logger.error("Error retrieving shipping address:", addressError);
      throw new AppError("Shipping address not found", 404);
    }

    // Calculate shipping cost
    const shippingRates = await calculateShippingRates({
      address: shippingAddress,
      items: items.map((item) => ({
        product_id: item.products[0].id,
        quantity: item.quantity,
        weight: item.products[0].weight,
        dimensions: item.products[0].dimensions,
      })),
    });

    // Find selected shipping method
    const selectedShipping = shippingRates.find(
      (rate) => rate.service_code === data.shipping_method
    );

    if (!selectedShipping) {
      throw new AppError("Selected shipping method not available", 400);
    }

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
        ...(data.metadata || {}),
      },
    });

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
    logger.error("Unexpected error in createPaymentIntent:", error);
    throw new AppError("Failed to create payment intent", 500);
  }
};

// Confirm a payment intent
export const confirmPaymentIntent = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Create order from payment intent metadata
      if (paymentIntent.metadata.cart_id) {
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
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        await createOrderFromPaymentIntent(paymentIntent);
        break;

      case "payment_intent.payment_failed":
        // Handle payment failure
        logger.warn("Payment failed:", event.data.object);
        break;

      default:
        // Unexpected event type
        logger.info(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    logger.error("Error handling Stripe webhook:", error);
    throw new AppError("Failed to process webhook", 500);
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
      .maybeSingle();

    if (orderCheckError) {
      logger.error("Error checking existing order:", orderCheckError);
      throw new AppError("Failed to check existing order", 500);
    }

    // If order already exists, don't create a duplicate
    if (existingOrder) {
      logger.info(
        `Order already exists for payment intent ${paymentIntent.id}`
      );
      return { orderId: existingOrder.id };
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
      items: items.map((item, index) => ({
        product_id: item.products[index].id,
        quantity: item.quantity,
        weight: item.products[index].weight,
        dimensions: item.products[index].dimensions,
      })),
    });

    const selectedShipping = shippingRates.find(
      (rate) => rate.service_code === metadata.shipping_method
    );

    if (!selectedShipping) {
      throw new AppError("Selected shipping method not available", 400);
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
          discount_amount: 0, // No discount in this example
          stripe_payment_intent_id: paymentIntent.id,
          billing_address_id: metadata.billing_address_id,
          shipping_address_id: metadata.shipping_address_id,
          shipping_method: metadata.shipping_method,
          tracking_number: null, // Will be added later when shipped
          notes: null,
        },
      ])
      .select()
      .single();

    if (orderError) {
      logger.error("Error creating order:", orderError);
      throw new AppError("Failed to create order", 500);
    }

    // Add order items
    const orderItems = items.map((item, index) => ({
      order_id: order.id,
      product_id: item.products[index].id,
      quantity: item.quantity,
      unit_price: item.products[index].price,
      total_price: item.products[index].price * item.quantity,
    }));

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
      const product = item.products[0];

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

    return { orderId: order.id };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in createOrderFromPaymentIntent:", error);
    throw new AppError("Failed to create order from payment", 500);
  }
};

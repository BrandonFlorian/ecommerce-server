import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  calculateShippingRates,
  validateAddress,
  trackShipment,
  generateShippingLabel,

} from "../services/shipping.service";
import { AppError } from "../utils/appError";
import { supabaseClient,createUserClient, getAdminClient } from "../config/supabase";
import { logger } from "../utils/logger";
import { extractJwtFromRequest } from "@/utils/jwt";
import { ShippingAddress, ShippingRateRequest } from "@/types/shipping";

// Calculate shipping rates for cart items
export const getShippingRates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for validation errors
    console.log("getShippingRates req", req.body);
    const jwt = extractJwtFromRequest(req);
    console.log("getShippingRates jwt", jwt);
    const client = jwt ? createUserClient(jwt) : supabaseClient;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation error", 400));
    }

    // Get the shipping address
    const addressId = req.body.address_id;
    console.log("getShippingRates addressId", addressId);
    const { data: address, error: addressError } = await client
      .from("addresses")
      .select("*")
      .eq("id", addressId)
      .single();

    console.log("getShippingRates address", address);
    if (addressError || !address) {
      logger.error("Error retrieving shipping address:", addressError);
      return next(new AppError("Shipping address not found", 404));
    }

    // Get the cart items
    const cartId = req.body.cart_id;
    const { data: cartItems, error: cartError } = await client
      .from("cart_items")
      .select(
        `
        id, 
        quantity,
        products:product_id (
          id, 
          weight, 
          dimensions
        )
      `
      )
      .eq("cart_id", cartId);

    console.log("getShippingRates cartItems", cartItems);

    if (cartError) {
      logger.error("Error retrieving cart items:", cartError);
      return next(new AppError("Failed to retrieve cart items", 500));
    }

    if (!cartItems || cartItems.length === 0) {
      return next(new AppError("Cart is empty", 400));
    }

    // Prepare the shipping rate request
    const rateRequest: ShippingRateRequest = {
      address: {
        address_line1: address.address_line1,
        address_line2: address.address_line2,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country: address.country,
      },
      items: cartItems.map((item) => {
        // Use this pattern for accessing the product
        const product = Array.isArray(item.products)
          ? item.products[0]
          : item.products;

        return {
          product_id: product.id,
          quantity: item.quantity,
          weight: product.weight,
          dimensions: product.dimensions as {
            length: number;
            width: number;
            height: number;
          },
        };
      }),
    };

    console.log("getShippingRates rateRequest", rateRequest);
    // Calculate shipping rates
    const rates = await calculateShippingRates(rateRequest);

    console.log("getShippingRates rates", rates);

    res.status(200).json({
      status: "success",
      data: rates,
    });
  } catch (error) {
    next(error);
  }
};

// Validate a shipping address
export const validateShippingAddress = async (
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

    const address: ShippingAddress = {
      address_line1: req.body.address_line1,
      address_line2: req.body.address_line2,
      city: req.body.city,
      state: req.body.state,
      postal_code: req.body.postal_code,
      country: req.body.country,
    };

    const addressValidationResult = await validateAddress(address);

    res.status(200).json({
      status: "success",
      data: addressValidationResult,
    });
  } catch (error) {
    next(error);
  }
};

// Track a shipment
export const trackOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return next(new AppError("Tracking number is required", 400));
    }

    const trackingInfo = await trackShipment("usps",trackingNumber);

    res.status(200).json({
      status: "success",
      data: trackingInfo,
    });
  } catch (error) {
    next(error);
  }
};


export const createShippingLabel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const jwt = req.jwt;
    const adminClient = getAdminClient();

    // Get the order with all details
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select(`
        *,
        shipping_address:shipping_address_id(*),
        order_items(
          *,
          products(*)
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return next(new AppError("Order not found", 404));
    }

    // Check if label already exists
    if (order.tracking_number) {
      res.status(200).json({
        status: "success",
        data: {
          trackingNumber: order.tracking_number,
          labelUrl: order.label_url,
          message: "Label already exists"
        }
      });
      return;
    }

    // Check if we have a rate ID
    if (!order.shipping_rate_id) {
      return next(new AppError("No shipping rate selected for this order", 400));
    }

    // Create the label
    const labelResult = await generateShippingLabel(
      order.id,
      order.shipping_rate_id,
      req.body.notes
    );

    res.status(200).json({
      status: "success",
      data: labelResult
    });
  } catch (error) {
    next(error);
  }
};
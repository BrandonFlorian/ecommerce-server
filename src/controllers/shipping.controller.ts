import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  calculateShippingRates,
  validateAddress,
  trackShipment,
  ShippingRateRequest,
  ShippingAddress,
} from "../services/shipping.service";
import { AppError } from "../utils/appError";
import { supabaseClient } from "../config/supabase";
import { logger } from "../utils/logger";

// Calculate shipping rates for cart items
export const getShippingRates = async (
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

    // Get the shipping address
    const addressId = req.body.address_id;
    const { data: address, error: addressError } = await supabaseClient
      .from("addresses")
      .select("*")
      .eq("id", addressId)
      .single();

    if (addressError || !address) {
      logger.error("Error retrieving shipping address:", addressError);
      return next(new AppError("Shipping address not found", 404));
    }

    // Get the cart items
    const cartId = req.body.cart_id;
    const { data: cartItems, error: cartError } = await supabaseClient
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

    // Calculate shipping rates
    const rates = await calculateShippingRates(rateRequest);

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

    const trackingInfo = await trackShipment(trackingNumber);

    res.status(200).json({
      status: "success",
      data: trackingInfo,
    });
  } catch (error) {
    next(error);
  }
};

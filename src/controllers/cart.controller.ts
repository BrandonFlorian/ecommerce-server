import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  getOrCreateCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  getCartWithItems,
  clearCart,
  CartItemDto,
  mergeSessionCartToUserCart,
} from "../services/cart.service";
import { AppError } from "../utils/appError";

// Get cart with items and product details
export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jwt = req.jwt;
    
    // Ensure JWT exists
    if (!jwt) {
      return next(new AppError("Authentication required", 401));
    }
    
    // JWT will be used to extract the user ID in the service
    const { cart } = await getOrCreateCart(jwt);
    
    // Get cart items with product details
    const result = await getCartWithItems(cart.id, jwt);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Add an item to the cart
export const addToCart = async (
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

    const jwt = req.jwt;
    
    // Ensure JWT exists
    if (!jwt) {
      return next(new AppError("Authentication required", 401));
    }
    
    // Validate item data
    const itemData: CartItemDto = {
      product_id: req.body.product_id,
      quantity: req.body.quantity || 1,
    };

    // Get or create cart - JWT will be used to extract user ID
    const { cart } = await getOrCreateCart(jwt);

    // Add item to cart
    const result = await addItemToCart(cart.id, itemData, jwt);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Update cart item
export const updateItem = async (
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

    const jwt = req.jwt;
    
    // Ensure JWT exists
    if (!jwt) {
      return next(new AppError("Authentication required", 401));
    }

    // Get cart using JWT
    const { cart } = await getOrCreateCart(jwt);

    // Update cart item
    await updateCartItem(
      cart.id,
      req.params.itemId,
      req.body.quantity,
      jwt
    );

    // Get updated cart with items
    const updatedCart = await getCartWithItems(cart.id, jwt);

    res.status(200).json({
      status: "success",
      data: updatedCart,
    });
  } catch (error) {
    next(error);
  }
};

// Remove an item from the cart
export const removeItem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jwt = req.jwt;
    
    // Ensure JWT exists
    if (!jwt) {
      return next(new AppError("Authentication required", 401));
    }

    // Get cart using JWT
    const { cart } = await getOrCreateCart(jwt);

    // Remove cart item
    await removeCartItem(cart.id, req.params.itemId, jwt);

    // Get updated cart with items
    const updatedCart = await getCartWithItems(cart.id, jwt);

    res.status(200).json({
      status: "success",
      data: updatedCart,
    });
  } catch (error) {
    next(error);
  }
};

// Clear all items from the cart
export const clearCartItems = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jwt = req.jwt;
    
    // Ensure JWT exists
    if (!jwt) {
      return next(new AppError("Authentication required", 401));
    }

    // Get cart using JWT
    const { cart } = await getOrCreateCart(jwt);

    // Clear the cart
    await clearCart(cart.id, jwt);

    // Get updated empty cart
    const updatedCart = await getCartWithItems(cart.id, jwt);

    res.status(200).json({
      status: "success",
      data: updatedCart,
    });
  } catch (error) {
    next(error);
  }
};

// Merge session cart with user cart
export const mergeSessionCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const jwt = req.jwt;
    const { cartItems } = req.body;

    if (!jwt) {
      return next(new AppError("Authentication required for cart merge", 401));
    }

    if (!cartItems || !Array.isArray(cartItems)) {
      return next(new AppError("Cart items must be provided as an array", 400));
    }

    // Validate cart items structure
    for (const item of cartItems) {
      if (!item.product_id || typeof item.quantity !== 'number' || item.quantity < 1) {
        return next(new AppError("Invalid cart item structure", 400));
      }
    }

    // Perform the merge using JWT
    const mergeResult = await mergeSessionCartToUserCart(jwt, cartItems);

    // Get the updated cart after merge
    const { cart } = await getOrCreateCart(jwt);
    const updatedCart = await getCartWithItems(cart.id, jwt);

    res.status(200).json({
      status: "success",
      data: updatedCart,
      merge: mergeResult
    });
  } catch (error) {
    console.error("Error in mergeSessionCart:", error);
    next(error);
  }
};
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
} from "../services/cart.service";
import { AppError } from "../utils/appError";

// Get cart with all items
export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get cart ID from session or user
    const userId = req.userId;
    const sessionId = req.cookies?.cartSessionId || req.body.sessionId;

    // Get or create cart
    const {
      cart,
      isNew,
      sessionId: newSessionId,
    } = await getOrCreateCart(userId, sessionId);

    // If this is a new session cart, set cookie
    if (isNew && newSessionId && !userId) {
      res.cookie("cartSessionId", newSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    // Get cart with items
    const cartWithItems = await getCartWithItems(cart.id);

    res.status(200).json({
      status: "success",
      data: cartWithItems,
    });
  } catch (error) {
    next(error);
  }
};

// Add item to cart
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

    // Get cart ID from session or user
    const userId = req.userId;
    const sessionId = req.cookies?.cartSessionId || req.body.sessionId;

    // Get or create cart
    const {
      cart,
      isNew,
      sessionId: newSessionId,
    } = await getOrCreateCart(userId, sessionId);

    // If this is a new session cart, set cookie
    if (isNew && newSessionId && !userId) {
      res.cookie("cartSessionId", newSessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    // Add item to cart
    const itemData: CartItemDto = {
      product_id: req.body.product_id,
      quantity: req.body.quantity,
    };

    await addItemToCart(cart.id, itemData);

    // Get updated cart with items
    const updatedCart = await getCartWithItems(cart.id);

    res.status(200).json({
      status: "success",
      data: updatedCart,
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

    // Get cart ID from session or user
    const userId = req.userId;
    const sessionId = req.cookies?.cartSessionId || req.body.sessionId;

    // Get cart (must exist)
    const { cart } = await getOrCreateCart(userId, sessionId);

    // Update cart item
    await updateCartItem(cart.id, req.params.itemId, req.body.quantity);

    // Get updated cart with items
    const updatedCart = await getCartWithItems(cart.id);

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
    // Get cart ID from session or user
    const userId = req.userId;
    const sessionId = req.cookies?.cartSessionId || req.body.sessionId;

    // Get cart (must exist)
    const { cart } = await getOrCreateCart(userId, sessionId);

    // Remove cart item
    await removeCartItem(cart.id, req.params.itemId);

    // Get updated cart with items
    const updatedCart = await getCartWithItems(cart.id);

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
    // Get cart ID from session or user
    const userId = req.userId;
    const sessionId = req.cookies?.cartSessionId || req.body.sessionId;

    // Get cart (must exist)
    const { cart } = await getOrCreateCart(userId, sessionId);

    // Clear the cart
    await clearCart(cart.id);

    // Get updated empty cart
    const updatedCart = await getCartWithItems(cart.id);

    res.status(200).json({
      status: "success",
      data: updatedCart,
    });
  } catch (error) {
    next(error);
  }
};

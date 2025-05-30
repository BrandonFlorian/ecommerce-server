import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { randomUUID } from "crypto";
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

// Get cart with all items
export const getCart = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("getCart headers", req.headers);
    console.log("getCart cookies", req.cookies);
    console.log("getCart body", req.body);
    console.log("getCart query", req.query);
    console.log("getCart params", req.params);
    console.log("getCart userId", req.userId);
    console.log("getCart jwt", req.jwt);
    //console.log("getCart sessionId", getSessionId(req));
    // Get cart ID from session or user
    const userId = req.userId;
    const jwt = req.jwt;
    //const sessionId = getSessionId(req);

    // Get or create cart
    const {
      cart,
      isNew,
      //sessionId: newSessionId,
    } = await getOrCreateCart(userId, jwt);

    // If this is a new session cart, set cookie
    if (isNew && !userId) {
      res.cookie("cartSessionId", randomUUID(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    // Get cart with items
    const cartWithItems = await getCartWithItems(cart.id, jwt);

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
    console.log("addToCart headers", req.headers);
    console.log("addToCart cookies", req.cookies);
    console.log("addToCart body", req.body);
    console.log("addToCart query", req.query);
    console.log("addToCart params", req.params);
    console.log("addToCart userId", req.userId);
    console.log("addToCart jwt", req.jwt);
    //console.log("addToCart sessionId", getSessionId(req));
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation error", 400));
    }

    // Get cart ID from session or user
    const userId = req.userId;
    const jwt = req.jwt;
    //const sessionId = getSessionId(req);

    // Get or create cart
    const {
      cart,
      isNew,
    } = await getOrCreateCart(userId, jwt);

    // If this is a new session cart, set cookie
    if (isNew && !userId) {
      res.cookie("cartSessionId", randomUUID(), {
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

    // Pass the session ID to the service function
    await addItemToCart(cart.id, itemData, jwt);

    // Get updated cart with items
    const updatedCart = await getCartWithItems(
      cart.id,
      jwt
    );

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
    console.log("updateItem headers", req.headers);
    console.log("updateItem cookies", req.cookies);
    console.log("updateItem body", req.body);
    console.log("updateItem query", req.query);
    console.log("updateItem params", req.params);
    console.log("updateItem userId", req.userId);
    console.log("updateItem jwt", req.jwt);
    //console.log("updateItem sessionId", getSessionId(req));
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation error", 400));
    }

    // Get cart ID from session or user
    const userId = req.userId;
    const jwt = req.jwt;
    //const sessionId = getSessionId(req);

    // Get cart (must exist)
    const { cart } = await getOrCreateCart(userId, jwt);

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
    console.log("removeItem headers", req.headers);
    console.log("removeItem cookies", req.cookies);
    console.log("removeItem body", req.body);
    console.log("removeItem query", req.query);
    console.log("removeItem params", req.params);
    console.log("removeItem userId", req.userId);
    console.log("removeItem jwt", req.jwt);
    //console.log("removeItem sessionId", getSessionId(req));
    // Get cart ID from session or user
    const userId = req.userId;
    const jwt = req.jwt;
    //const sessionId = getSessionId(req);

    // Get cart (must exist)
    const { cart } = await getOrCreateCart(userId, jwt);

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
    console.log("clearCartItems headers", req.headers);
    console.log("clearCartItems cookies", req.cookies);
    console.log("clearCartItems body", req.body);
    console.log("clearCartItems query", req.query);
    console.log("clearCartItems params", req.params);
    console.log("clearCartItems userId", req.userId);
    console.log("clearCartItems jwt", req.jwt);
    //console.log("clearCartItems sessionId", getSessionId(req));
    // Get cart ID from session or user
    const userId = req.userId;
    const jwt = req.jwt;
    //const sessionId = getSessionId(req);

    // Get cart (must exist)
    const { cart } = await getOrCreateCart(userId, jwt);

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
    
    const userId = req.userId;
    const jwt = req.jwt;
    const { cartItems } = req.body;

    if (!userId || !jwt) {
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

    // Perform the merge with the provided cart items
    const mergeResult = await mergeSessionCartToUserCart(userId, jwt, cartItems);

    // Get the updated cart after merge
    const { cart } = await getOrCreateCart(userId, jwt);
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
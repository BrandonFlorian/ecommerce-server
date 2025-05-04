import express from "express";
import {
  getCart,
  addToCart,
  updateItem,
  removeItem,
  clearCartItems,
  mergeSessionCart,
} from "../controllers/cart.controller";
import {
  addToCartValidator,
  updateCartItemValidator,
} from "../utils/validators/cart.validator";
import { optionalAuth } from "../middlewares/auth.middleware";

const router = express.Router();

// These routes work with or without authentication
// If authenticated, cart is tied to user
// If not, cart is tied to session cookie

router.get("/", optionalAuth, getCart);
router.post("/items", optionalAuth, addToCartValidator, addToCart);
router.put("/items/:itemId", optionalAuth, updateCartItemValidator, updateItem);
router.delete("/items/:itemId", optionalAuth, removeItem);
router.delete("/", optionalAuth, clearCartItems);
router.post("/merge", optionalAuth, mergeSessionCart);

export default router;

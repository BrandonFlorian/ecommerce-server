import express from "express";
import {
  getCart,
  addToCart,
  updateItem,
  removeItem,
  clearCartItems,
} from "../controllers/cart.controller";
import {
  addToCartValidator,
  updateCartItemValidator,
} from "../utils/validators/cart.validator";
import { protect } from "../middlewares/auth.middleware";

const router = express.Router();

// These routes work with or without authentication
// If authenticated, cart is tied to user
// If not, cart is tied to session cookie

router.get("/", getCart);
router.post("/items", addToCartValidator, addToCart);
router.put("/items/:itemId", updateCartItemValidator, updateItem);
router.delete("/items/:itemId", removeItem);
router.delete("/", clearCartItems);

export default router;

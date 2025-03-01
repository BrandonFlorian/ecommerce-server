import express from "express";
import {
  getAllProducts,
  getProduct,
  createNewProduct,
  updateExistingProduct,
  removeProduct,
  searchAllProducts,
  getAllCategories,
  getCategory,
  getProductsInCategory,
} from "../controllers/product.controller";
import {
  createProductValidator,
  updateProductValidator,
} from "../utils/validators/product.validator";
import { protect, restrictTo } from "../middlewares/auth.middleware";

const router = express.Router();

// Public routes
router.get("/", getAllProducts);
router.get("/search", searchAllProducts);
router.get("/categories", getAllCategories);
router.get("/categories/:id", getCategory);
router.get("/categories/:id/products", getProductsInCategory);
router.get("/:id", getProduct);

// Protected routes (admin only)
router.use(protect);
router.use(restrictTo("admin"));

router.post("/", createProductValidator, createNewProduct);
router.put("/:id", updateProductValidator, updateExistingProduct);
router.delete("/:id", removeProduct);

export default router;

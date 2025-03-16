import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  searchProducts,
  getCategories,
  getCategoryById,
  ProductDto,
  PaginationParams,
} from "../services/product.service";
import { AppError } from "../utils/appError";

// Get all products with pagination and filtering
export const getAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const params: PaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as "asc" | "desc",
      min_price: req.query.min_price
        ? parseFloat(req.query.min_price as string)
        : undefined,
      max_price: req.query.max_price
        ? parseFloat(req.query.max_price as string)
        : undefined,
      in_stock: req.query.in_stock === "true",
      category_id: req.query.category_id as string,
      query: req.query.query as string,
    };

    const result = await getProducts(params);

    res.status(200).json({
      status: "success",
      pagination: result.pagination,
      data: result.products,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single product by ID
export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const product = await getProductById(req.params.id);

    res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new product (admin only)
export const createNewProduct = async (
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

    const productData: ProductDto = req.body;
    const product = await createProduct(productData);

    res.status(201).json({
      status: "success",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Update an existing product (admin only)
export const updateExistingProduct = async (
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

    const productData: Partial<ProductDto> = req.body;
    const product = await updateProduct(req.params.id, productData);

    res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a product (admin only)
export const removeProduct = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await deleteProduct(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// Search products
export const searchAllProducts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return next(new AppError("Search query is required", 400));
    }

    const params: PaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as "asc" | "desc",
      min_price: req.query.min_price
        ? parseFloat(req.query.min_price as string)
        : undefined,
      max_price: req.query.max_price
        ? parseFloat(req.query.max_price as string)
        : undefined,
      in_stock: req.query.in_stock === "true",
    };

    const result = await searchProducts(query, params);

    res.status(200).json({
      status: "success",
      pagination: result.pagination,
      data: result.products,
    });
  } catch (error) {
    next(error);
  }
};

// Get all product categories
export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await getCategories();

    res.status(200).json({
      status: "success",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single category by ID
export const getCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const category = await getCategoryById(req.params.id);

    res.status(200).json({
      status: "success",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// Get products by category
export const getProductsInCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categoryId = req.params.id;

    const params: PaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as "asc" | "desc",
      min_price: req.query.min_price
        ? parseFloat(req.query.min_price as string)
        : undefined,
      max_price: req.query.max_price
        ? parseFloat(req.query.max_price as string)
        : undefined,
      in_stock: req.query.in_stock === "true",
    };

    const result = await getProductsByCategory(categoryId, params);

    res.status(200).json({
      status: "success",
      pagination: result.pagination,
      data: result.products,
    });
  } catch (error) {
    next(error);
  }
};

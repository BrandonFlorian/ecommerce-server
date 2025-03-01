import { body } from "express-validator";

// Validation rules for creating a product
export const createProductValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 200 })
    .withMessage("Product name must be at most 200 characters"),

  body("description")
    .trim()
    .notEmpty()
    .withMessage("Product description is required"),

  body("price")
    .isNumeric()
    .withMessage("Price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Price cannot be negative"),

  body("compare_at_price")
    .optional()
    .isNumeric()
    .withMessage("Compare at price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Compare at price cannot be negative"),

  body("cost_price")
    .isNumeric()
    .withMessage("Cost price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Cost price cannot be negative"),

  body("sku")
    .trim()
    .notEmpty()
    .withMessage("SKU is required")
    .isLength({ max: 50 })
    .withMessage("SKU must be at most 50 characters"),

  body("barcode")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Barcode must be at most 50 characters"),

  body("weight")
    .isNumeric()
    .withMessage("Weight must be a number")
    .custom((value) => value > 0)
    .withMessage("Weight must be greater than 0"),

  body("dimensions").isObject().withMessage("Dimensions must be an object"),

  body("dimensions.length")
    .isNumeric()
    .withMessage("Length must be a number")
    .custom((value) => value > 0)
    .withMessage("Length must be greater than 0"),

  body("dimensions.width")
    .isNumeric()
    .withMessage("Width must be a number")
    .custom((value) => value > 0)
    .withMessage("Width must be greater than 0"),

  body("dimensions.height")
    .isNumeric()
    .withMessage("Height must be a number")
    .custom((value) => value > 0)
    .withMessage("Height must be greater than 0"),

  body("inventory_quantity")
    .isInt()
    .withMessage("Inventory quantity must be an integer")
    .custom((value) => value >= 0)
    .withMessage("Inventory quantity cannot be negative"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("Is active must be a boolean"),

  body("category_id").notEmpty().withMessage("Category ID is required"),

  body("images").optional().isArray().withMessage("Images must be an array"),

  body("images.*.url")
    .notEmpty()
    .withMessage("Image URL is required")
    .isURL()
    .withMessage("Image URL must be a valid URL"),

  body("images.*.alt_text")
    .notEmpty()
    .withMessage("Image alt text is required"),

  body("images.*.position")
    .isInt()
    .withMessage("Image position must be an integer"),

  body("images.*.is_primary")
    .optional()
    .isBoolean()
    .withMessage("Is primary must be a boolean"),
];

// Validation rules for updating a product
export const updateProductValidator = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product name cannot be empty")
    .isLength({ max: 200 })
    .withMessage("Product name must be at most 200 characters"),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Product description cannot be empty"),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Price cannot be negative"),

  body("compare_at_price")
    .optional()
    .isNumeric()
    .withMessage("Compare at price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Compare at price cannot be negative"),

  body("cost_price")
    .optional()
    .isNumeric()
    .withMessage("Cost price must be a number")
    .custom((value) => value >= 0)
    .withMessage("Cost price cannot be negative"),

  body("sku")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("SKU cannot be empty")
    .isLength({ max: 50 })
    .withMessage("SKU must be at most 50 characters"),

  body("barcode")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Barcode must be at most 50 characters"),

  body("weight")
    .optional()
    .isNumeric()
    .withMessage("Weight must be a number")
    .custom((value) => value > 0)
    .withMessage("Weight must be greater than 0"),

  body("dimensions")
    .optional()
    .isObject()
    .withMessage("Dimensions must be an object"),

  body("dimensions.length")
    .optional()
    .isNumeric()
    .withMessage("Length must be a number")
    .custom((value) => value > 0)
    .withMessage("Length must be greater than 0"),

  body("dimensions.width")
    .optional()
    .isNumeric()
    .withMessage("Width must be a number")
    .custom((value) => value > 0)
    .withMessage("Width must be greater than 0"),

  body("dimensions.height")
    .optional()
    .isNumeric()
    .withMessage("Height must be a number")
    .custom((value) => value > 0)
    .withMessage("Height must be greater than 0"),

  body("inventory_quantity")
    .optional()
    .isInt()
    .withMessage("Inventory quantity must be an integer")
    .custom((value) => value >= 0)
    .withMessage("Inventory quantity cannot be negative"),

  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("Is active must be a boolean"),

  body("category_id")
    .optional()
    .notEmpty()
    .withMessage("Category ID cannot be empty"),

  body("images").optional().isArray().withMessage("Images must be an array"),

  body("images.*.url")
    .optional()
    .notEmpty()
    .withMessage("Image URL cannot be empty")
    .isURL()
    .withMessage("Image URL must be a valid URL"),

  body("images.*.alt_text")
    .optional()
    .notEmpty()
    .withMessage("Image alt text cannot be empty"),

  body("images.*.position")
    .optional()
    .isInt()
    .withMessage("Image position must be an integer"),

  body("images.*.is_primary")
    .optional()
    .isBoolean()
    .withMessage("Is primary must be a boolean"),
];

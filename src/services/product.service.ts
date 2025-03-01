import { applyFilterIf, getPaginatedData } from "@/utils/query-helper";
import { supabaseClient, getAdminClient } from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

// Interface for product data
export interface ProductDto {
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  cost_price: number;
  sku: string;
  barcode?: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  inventory_quantity: number;
  is_active?: boolean;
  category_id: string;
  images?: {
    url: string;
    alt_text: string;
    position: number;
    is_primary?: boolean;
  }[];
}

// Interface for pagination parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  category_id?: string;
  query?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
}

// Get all products with pagination and filtering
export const getProducts = async (params: PaginationParams = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort_by = "created_at",
      sort_order = "desc",
      category_id,
      query: searchQuery,
      min_price,
      max_price,
      in_stock,
    } = params;

    // Define filters function
    const applyFilters = (query: any) => {
      // Build filter chain
      return applyFilterIf(
        applyFilterIf(
          applyFilterIf(
            applyFilterIf(
              applyFilterIf(query, !!category_id, (q) =>
                q.eq("category_id", category_id)
              ),
              !!searchQuery,
              (q) =>
                q.or(
                  `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`
                )
            ),
            min_price !== undefined,
            (q) => q.gte("price", min_price)
          ),
          max_price !== undefined,
          (q) => q.lte("price", max_price)
        ),
        !!in_stock,
        (q) => q.gt("inventory_quantity", 0)
      ).eq("is_active", true);
    };

    // Use the utility function to get paginated data
    const result = await getPaginatedData({
      client: supabaseClient,
      table: "products",
      options: {
        page,
        limit,
        sortBy: sort_by,
        sortOrder: sort_order as "asc" | "desc",
      },
      select: `
        *,
        product_images (*),
        categories:category_id (id, name, slug)
      `,
      applyFilters,
    });

    return {
      products: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in getProducts:", error);
    throw new AppError("Failed to get products", 500);
  }
};

// Get a single product by ID
export const getProductById = async (productId: string) => {
  try {
    const { data: product, error } = await supabaseClient
      .from("products")
      .select(
        `
        *,
        product_images (*),
        categories:category_id (id, name, slug)
      `
      )
      .eq("id", productId)
      .eq("is_active", true)
      .single();

    if (error) {
      logger.error(`Error getting product ${productId}:`, error);
      throw new AppError("Product not found", 404);
    }

    return product;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in getProductById for ${productId}:`, error);
    throw new AppError("Failed to get product", 500);
  }
};

// Create a new product (admin only)
export const createProduct = async (productData: ProductDto) => {
  try {
    const adminClient = getAdminClient();

    // Start a transaction by using the supabase connection directly
    const { data: product, error } = await adminClient
      .from("products")
      .insert([
        {
          name: productData.name,
          description: productData.description,
          price: productData.price,
          compare_at_price: productData.compare_at_price,
          cost_price: productData.cost_price,
          sku: productData.sku,
          barcode: productData.barcode,
          weight: productData.weight,
          dimensions: productData.dimensions,
          inventory_quantity: productData.inventory_quantity,
          is_active:
            productData.is_active !== undefined ? productData.is_active : true,
          category_id: productData.category_id,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Error creating product:", error);
      throw new AppError(error.message, 400);
    }

    // If there are images, add them
    if (productData.images && productData.images.length > 0) {
      const imagesToInsert = productData.images.map((image) => ({
        product_id: product.id,
        url: image.url,
        alt_text: image.alt_text,
        position: image.position,
        is_primary: image.is_primary !== undefined ? image.is_primary : false,
      }));

      const { error: imageError } = await adminClient
        .from("product_images")
        .insert(imagesToInsert);

      if (imageError) {
        logger.error("Error adding product images:", imageError);
        throw new AppError("Failed to add product images", 500);
      }
    }

    // Get the complete product with images
    const { data: completeProduct, error: fetchError } = await adminClient
      .from("products")
      .select(
        `
        *,
        product_images (*),
        categories:category_id (id, name, slug)
      `
      )
      .eq("id", product.id)
      .single();

    if (fetchError) {
      logger.error("Error fetching complete product:", fetchError);
      throw new AppError("Failed to fetch complete product", 500);
    }

    return completeProduct;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in createProduct:", error);
    throw new AppError("Failed to create product", 500);
  }
};

// Update an existing product (admin only)
export const updateProduct = async (
  productId: string,
  productData: Partial<ProductDto>
) => {
  try {
    const adminClient = getAdminClient();

    // Check if product exists
    const { data: existingProduct, error: checkError } = await adminClient
      .from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (checkError || !existingProduct) {
      logger.error(`Product with ID ${productId} not found:`, checkError);
      throw new AppError("Product not found", 404);
    }

    // Update product
    const { data: product, error } = await adminClient
      .from("products")
      .update({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        compare_at_price: productData.compare_at_price,
        cost_price: productData.cost_price,
        sku: productData.sku,
        barcode: productData.barcode,
        weight: productData.weight,
        dimensions: productData.dimensions,
        inventory_quantity: productData.inventory_quantity,
        is_active: productData.is_active,
        category_id: productData.category_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      logger.error(`Error updating product ${productId}:`, error);
      throw new AppError(error.message, 400);
    }

    // If there are images, update them
    if (productData.images) {
      // First, delete existing images
      const { error: deleteError } = await adminClient
        .from("product_images")
        .delete()
        .eq("product_id", productId);

      if (deleteError) {
        logger.error(
          `Error deleting product images for ${productId}:`,
          deleteError
        );
        throw new AppError("Failed to update product images", 500);
      }

      // Then, add new images
      const imagesToInsert = productData.images.map((image) => ({
        product_id: productId,
        url: image.url,
        alt_text: image.alt_text,
        position: image.position,
        is_primary: image.is_primary !== undefined ? image.is_primary : false,
      }));

      if (imagesToInsert.length > 0) {
        const { error: imageError } = await adminClient
          .from("product_images")
          .insert(imagesToInsert);

        if (imageError) {
          logger.error(
            `Error adding new product images for ${productId}:`,
            imageError
          );
          throw new AppError("Failed to add new product images", 500);
        }
      }
    }

    // Get the complete updated product with images
    const { data: completeProduct, error: fetchError } = await adminClient
      .from("products")
      .select(
        `
        *,
        product_images (*),
        categories:category_id (id, name, slug)
      `
      )
      .eq("id", productId)
      .single();

    if (fetchError) {
      logger.error(
        `Error fetching complete updated product ${productId}:`,
        fetchError
      );
      throw new AppError("Failed to fetch complete updated product", 500);
    }

    return completeProduct;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in updateProduct for ${productId}:`, error);
    throw new AppError("Failed to update product", 500);
  }
};

// Delete a product (admin only)
export const deleteProduct = async (productId: string) => {
  try {
    const adminClient = getAdminClient();

    // Check if product exists
    const { data: existingProduct, error: checkError } = await adminClient
      .from("products")
      .select("id")
      .eq("id", productId)
      .single();

    if (checkError || !existingProduct) {
      logger.error(`Product with ID ${productId} not found:`, checkError);
      throw new AppError("Product not found", 404);
    }

    // First, delete related images
    const { error: imageError } = await adminClient
      .from("product_images")
      .delete()
      .eq("product_id", productId);

    if (imageError) {
      logger.error(
        `Error deleting product images for ${productId}:`,
        imageError
      );
      throw new AppError("Failed to delete product images", 500);
    }

    // Then, delete the product
    const { error } = await adminClient
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      logger.error(`Error deleting product ${productId}:`, error);
      throw new AppError("Failed to delete product", 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in deleteProduct for ${productId}:`, error);
    throw new AppError("Failed to delete product", 500);
  }
};

// Get products by category
export const getProductsByCategory = async (
  categoryId: string,
  params: PaginationParams = {}
) => {
  try {
    // Set category filter and call getProducts
    return await getProducts({
      ...params,
      category_id: categoryId,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(
      `Unexpected error in getProductsByCategory for ${categoryId}:`,
      error
    );
    throw new AppError("Failed to get products by category", 500);
  }
};

// Search products
export const searchProducts = async (
  searchQuery: string,
  params: PaginationParams = {}
) => {
  try {
    // Set search query and call getProducts
    return await getProducts({
      ...params,
      query: searchQuery,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(
      `Unexpected error in searchProducts for query "${searchQuery}":`,
      error
    );
    throw new AppError("Failed to search products", 500);
  }
};

// Get all product categories
export const getCategories = async () => {
  try {
    const { data: categories, error } = await supabaseClient
      .from("categories")
      .select("*")
      .order("name");

    if (error) {
      logger.error("Error getting categories:", error);
      throw new AppError("Failed to get categories", 500);
    }

    return categories;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in getCategories:", error);
    throw new AppError("Failed to get categories", 500);
  }
};

// Get a single category by ID
export const getCategoryById = async (categoryId: string) => {
  try {
    const { data: category, error } = await supabaseClient
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (error) {
      logger.error(`Error getting category ${categoryId}:`, error);
      throw new AppError("Category not found", 404);
    }

    return category;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(
      `Unexpected error in getCategoryById for ${categoryId}:`,
      error
    );
    throw new AppError("Failed to get category", 500);
  }
};

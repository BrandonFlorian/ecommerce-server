import {
  createUserClient,
  getAdminClient,
  supabaseClient,
} from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { getUserFromToken } from "@/utils/auth-helper";

// Interface for cart item data
export interface CartItemDto {
  product_id: string;
  quantity: number;
}

// Get or create a cart for a user
export const getOrCreateCart = async (jwt: string) => {
  try {
    // Extract user ID from JWT
    const { userId } = getUserFromToken(jwt);
    
    // Use authenticated client
    const client = createUserClient(jwt);

    // Try to find an existing cart
    const { data: existingCart, error: findError } = await client
      .from("carts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (findError) {
      logger.error("Error finding cart:", findError);
      throw new AppError("Failed to retrieve cart", 500);
    }

    // If cart exists, return it
    if (existingCart) {
      return {
        cart: existingCart,
        isNew: false,
      };
    }

    // Identify which client to use (admin client for inserts)
    const adminClient = getAdminClient();

    // Create a new cart
    const { data: newCart, error: createError } = await adminClient
      .from("carts")
      .insert([
        {
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (createError) {
      logger.error("Error creating cart:", createError);
      throw new AppError("Failed to create cart", 500);
    }

    return {
      cart: newCart,
      isNew: true,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in getOrCreateCart:", error);
    throw new AppError("Failed to manage cart", 500);
  }
};

// Merge cart items to user cart
export const mergeSessionCartToUserCart = async (
  jwt: string,
  cartItems?: Array<{ product_id: string; quantity: number }>
) => {
  try {
    // Extract user ID from JWT
    const { userId } = getUserFromToken(jwt);
    
    // Get or create user cart
    const { cart: userCart } = await getOrCreateCart(jwt);

    // If no items provided, nothing to merge
    if (!cartItems || cartItems.length === 0) {
      return { merged: 0 };
    }

    const client = createUserClient(jwt);
    let mergedCount = 0;

    // Process each item to add or update in the user's cart
    for (const item of cartItems) {
      // Check if the product already exists in the user's cart
      const { data: existingItem, error: findError } = await client
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", userCart.id)
        .eq("product_id", item.product_id)
        .maybeSingle();

      if (findError) {
        logger.error(`Error checking for existing cart item:`, findError);
        continue; // Skip this item but continue with others
      }

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + item.quantity;
        const { error: updateError } = await client
          .from("cart_items")
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq("id", existingItem.id);

        if (updateError) {
          logger.error(`Error updating cart item:`, updateError);
          continue; // Skip this item but continue with others
        }
        mergedCount++;
      } else {
        // Add new item to cart
        const { error: insertError } = await client
          .from("cart_items")
          .insert([
            {
              cart_id: userCart.id,
              product_id: item.product_id,
              quantity: item.quantity,
            },
          ])
          .select()
          .single();

        if (insertError) {
          logger.error(`Error adding item to cart:`, insertError);
          continue; // Skip this item but continue with others
        }
        mergedCount++;
      }
    }

    return {
      merged: mergedCount,
      total: cartItems.length,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in mergeSessionCartToUserCart:`, error);
    throw new AppError("Failed to merge carts", 500);
  }
};

// Add an item to the cart
export const addItemToCart = async (
  cartId: string,
  itemData: CartItemDto,
  jwt: string
) => {
  try {
    const client = createUserClient(jwt);

    // Check if the product already exists in the cart
    const { data: existingItem, error: findError } = await client
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", itemData.product_id)
      .maybeSingle();

    if (findError) {
      logger.error(`Error checking for existing cart item:`, findError);
      throw new AppError("Failed to check cart", 500);
    }

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + itemData.quantity;
      
      const { data: updatedItem, error: updateError } = await client
        .from("cart_items")
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (updateError) {
        logger.error(`Error updating cart item:`, updateError);
        throw new AppError("Failed to update cart item", 500);
      }

      return await getCartWithItems(cartId, jwt);
    } else {
      // Add new item to cart
      const { data: newItem, error: insertError } = await client
        .from("cart_items")
        .insert([
          {
            cart_id: cartId,
            product_id: itemData.product_id,
            quantity: itemData.quantity,
          },
        ])
        .select()
        .single();

      if (insertError) {
        logger.error(`Error adding item to cart:`, insertError);
        throw new AppError("Failed to add item to cart", 500);
      }

      return await getCartWithItems(cartId, jwt);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in addItemToCart:`, error);
    throw new AppError("Failed to add item to cart", 500);
  }
};

// Update cart item quantity
export const updateCartItem = async (
  cartId: string,
  itemId: string,
  quantity: number,
  jwt?: string
) => {
  try {
    // Clean the item ID to ensure no extra quotes
    const cleanItemId = itemId.replace(/"/g, "");

    // Create a client with session ID header if available
    const client = createUserClient(jwt);
    const cartItemClient = client.from("cart_items");

    // Check if item exists in the cart
    const { data: existingItem, error: itemError } = await cartItemClient
      .select("id, product_id")
      .eq("id", cleanItemId)
      .eq("cart_id", cartId)
      .single();

    if (itemError || !existingItem) {
      logger.error("Error finding cart item:", itemError);
      throw new AppError("Cart item not found", 404);
    }

    // Check if product exists and is active
    const { data: product, error: productError } = await client
      .from("products")
      .select("id, inventory_quantity, is_active")
      .eq("id", existingItem.product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      logger.error("Error finding product:", productError);
      throw new AppError("Product not found or not available", 404);
    }

    // Check if product is in stock
    if (product.inventory_quantity < quantity) {
      throw new AppError(
        `Only ${product.inventory_quantity} items available in stock`,
        400
      );
    }

    // Update the item quantity
    const { data: updatedItem, error: updateError } = await cartItemClient
      .update({
        quantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cleanItemId)
      .select()
      .single();

    if (updateError) {
      logger.error("Error updating cart item:", updateError);
      throw new AppError("Failed to update cart item", 500);
    }

    return updatedItem;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in updateCartItem:", error);
    throw new AppError("Failed to update cart item", 500);
  }
};

// Remove an item from the cart
export const removeCartItem = async (
  cartId: string,
  itemId: string,
  jwt?: string
) => {
  try {
    const client = createUserClient(jwt);
    // Clean the item ID to ensure no extra quotes
    const cleanItemId = itemId.replace(/"/g, "");

    // Create a client with session ID header if available
    const cartItemClient = client.from("cart_items");

    // Check if item exists in the cart
    const { data: existingItem, error: itemError } = await cartItemClient
      .select("id")
      .eq("id", cleanItemId)
      .eq("cart_id", cartId)
      .single();

    if (itemError || !existingItem) {
      logger.error("Error finding cart item:", itemError);
      throw new AppError("Cart item not found", 404);
    }

    // Remove the item
    const { data: deletedItem, error: deleteError } = await cartItemClient
      .delete()
      .eq("id", cleanItemId);

    if (deleteError) {
      logger.error("Error removing cart item:", deleteError);
      throw new AppError("Failed to remove cart item", 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in removeCartItem:", error);
    throw new AppError("Failed to remove cart item", 500);
  }
};

// Get cart with items and product details
export const getCartWithItems = async (
  cartId: string,
  jwt?: string
) => {
  try {

    const client = jwt ? createUserClient(jwt) : supabaseClient;
    // Create clients with session ID header if available
    const cartClient = client.from("carts");
    const itemsClient = client.from("cart_items");

    // Get cart
    const { data: cart, error: cartError } = await cartClient
      .select("id, user_id, created_at, updated_at")
      .eq("id", cartId)
      .single();

    console.log("getCartWithItems cart", cart);

    if (cartError || !cart) {
      logger.error("Error finding cart:", cartError);
      throw new AppError("Cart not found", 404);
    }

    // Get cart items with product details
    const { data: cartItems, error: itemsError } = await itemsClient
      .select(
        `
        id, 
        quantity, 
        created_at, 
        updated_at,
        products:product_id (
          id, 
          name, 
          price, 
          compare_at_price, 
          sku, 
          weight, 
          dimensions,
          inventory_quantity,
          product_images (
            url, 
            alt_text, 
            is_primary
          )
        )
      `
      )
      .eq("cart_id", cartId);

    console.log("getCartWithItems cartItems", cartItems);

    if (itemsError) {
      logger.error("Error retrieving cart items:", itemsError);
      throw new AppError("Failed to retrieve cart items", 500);
    }

    // Calculate cart totals
    let subtotal = 0;
    let totalItems = 0;

    if (cartItems) {
      cartItems.forEach((item) => {
        // Check if products is an array or object
        const product = Array.isArray(item.products)
          ? item.products[0]
          : item.products;

        // Check that we have valid product data
        if (product && product.price) {
          subtotal += product.price * item.quantity;
        }
        totalItems += item.quantity;
      });
    }

    return {
      cart,
      items: cartItems || [],
      summary: {
        subtotal,
        totalItems,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    // Add detailed error logging
    logger.error("Unexpected error in getCartWithItems:", error);
    throw new AppError("Failed to retrieve cart", 500);
  }
};

// Clear all items from the cart
export const clearCart = async (
  cartId: string,
  jwt?: string
) => {
  try {
    const client = createUserClient(jwt);

    const cartItemClient = client.from("cart_items");

    // Delete all items in the cart
    const { error: deleteError } = await cartItemClient
      .delete()
      .eq("cart_id", cartId);

    if (deleteError) {
      logger.error("Error clearing cart:", deleteError);
      throw new AppError("Failed to clear cart", 500);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in clearCart:", error);
    throw new AppError("Failed to clear cart", 500);
  }
};

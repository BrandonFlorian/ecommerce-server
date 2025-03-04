import { getAdminClient, supabaseClient } from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";

// Interface for cart item data
export interface CartItemDto {
  product_id: string;
  quantity: number;
}

// Get or create a cart for a user or session
export const getOrCreateCart = async (userId?: string, sessionId?: string) => {
  try {
    if (!userId && !sessionId) {
      // Generate a new session ID if neither userId nor sessionId is provided
      sessionId = uuidv4();
      console.log("Generated new sessionId:", sessionId);
    }

    // Try to find an existing cart
    let query = supabaseClient.from("carts").select("*");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data: existingCart, error: findError } = await query.maybeSingle();

    if (findError) {
      logger.error("Error finding cart:", findError);
      throw new AppError("Failed to retrieve cart", 500);
    }

    // If cart exists, return it
    if (existingCart) {
      return {
        cart: existingCart,
        isNew: false,
        sessionId: sessionId || null,
      };
    }

    // Identify which client to use (admin client for inserts)
    const adminClient = getAdminClient();

    console.log(
      "Creating new cart with userId:",
      userId,
      "sessionId:",
      sessionId
    );

    // Create a new cart
    const { data: newCart, error: createError } = await adminClient
      .from("carts")
      .insert([
        {
          user_id: userId || null,
          session_id: sessionId || null,
        },
      ])
      .select()
      .single();

    if (createError) {
      logger.error("Error creating cart:", createError);
      throw new AppError("Failed to create cart", 500);
    }

    console.log("New cart created:", newCart);

    return {
      cart: newCart,
      isNew: true,
      sessionId: sessionId || null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in getOrCreateCart:", error);
    throw new AppError("Failed to manage cart", 500);
  }
};

// Transfer items from session cart to user cart after login
export const mergeSessionCartToUserCart = async (
  userId: string,
  sessionId: string
) => {
  try {
    // Get session cart
    const { data: sessionCart, error: sessionError } = await supabaseClient
      .from("carts")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (sessionError) {
      logger.error("Error finding session cart:", sessionError);
      throw new AppError("Failed to retrieve session cart", 500);
    }

    // If no session cart, nothing to merge
    if (!sessionCart) {
      return;
    }

    // Get or create user cart
    const { cart: userCart } = await getOrCreateCart(userId);

    // Get items from session cart
    const { data: sessionItems, error: itemsError } = await supabaseClient
      .from("cart_items")
      .select("product_id, quantity")
      .eq("cart_id", sessionCart.id);

    if (itemsError) {
      logger.error("Error retrieving session cart items:", itemsError);
      throw new AppError("Failed to retrieve session cart items", 500);
    }

    if (!sessionItems || sessionItems.length === 0) {
      // No items to transfer
      return;
    }

    // Get existing items in user cart
    const { data: userItems, error: userItemsError } = await supabaseClient
      .from("cart_items")
      .select("id, product_id, quantity")
      .eq("cart_id", userCart.id);

    if (userItemsError) {
      logger.error("Error retrieving user cart items:", userItemsError);
      throw new AppError("Failed to retrieve user cart items", 500);
    }

    // Map product IDs to existing cart items for quick lookup
    const userItemMap = (userItems || []).reduce((map, item) => {
      map[item.product_id] = item;
      return map;
    }, {} as Record<string, any>);

    // Process each session item
    for (const sessionItem of sessionItems) {
      if (userItemMap[sessionItem.product_id]) {
        // Product already in user cart, update quantity
        const { error: updateError } = await supabaseClient
          .from("cart_items")
          .update({
            quantity:
              userItemMap[sessionItem.product_id].quantity +
              sessionItem.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userItemMap[sessionItem.product_id].id);

        if (updateError) {
          logger.error("Error updating cart item quantity:", updateError);
          // Continue with other items
        }
      } else {
        // Add item to user cart
        const { error: insertError } = await supabaseClient
          .from("cart_items")
          .insert([
            {
              cart_id: userCart.id,
              product_id: sessionItem.product_id,
              quantity: sessionItem.quantity,
            },
          ]);

        if (insertError) {
          logger.error("Error adding item to user cart:", insertError);
          // Continue with other items
        }
      }
    }

    // Delete session cart and its items (cascade should handle items)
    const { error: deleteError } = await supabaseClient
      .from("carts")
      .delete()
      .eq("id", sessionCart.id);

    if (deleteError) {
      logger.error("Error deleting session cart:", deleteError);
      // Not critical, continue
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in mergeSessionCartToUserCart:", error);
    throw new AppError("Failed to merge carts", 500);
  }
};

// Add an item to the cart
export const addItemToCart = async (
  cartId: string,
  itemData: CartItemDto,
  sessionId?: string
) => {
  try {
    // Check if product exists and is active
    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("id, inventory_quantity, is_active")
      .eq("id", itemData.product_id)
      .eq("is_active", true)
      .single();

    if (productError || !product) {
      logger.error("Error finding product:", productError);
      throw new AppError("Product not found or not available", 404);
    }

    // Check if product is in stock
    if (product.inventory_quantity < itemData.quantity) {
      throw new AppError(
        `Only ${product.inventory_quantity} items available in stock`,
        400
      );
    }

    // Create a client with session ID header if available
    const client = supabaseClient.from("cart_items");
    if (sessionId) {
      client.headers = { "cart-session-id": sessionId };
    }

    // Check if item already exists in cart
    const { data: existingItem, error: itemError } = await client
      .select("id, quantity")
      .eq("cart_id", cartId)
      .eq("product_id", itemData.product_id)
      .maybeSingle();

    if (itemError) {
      logger.error("Error checking existing cart item:", itemError);
      throw new AppError("Failed to check existing cart item", 500);
    }

    if (existingItem) {
      // Update existing item quantity
      const newQuantity = existingItem.quantity + itemData.quantity;

      // Check updated quantity against inventory
      if (newQuantity > product.inventory_quantity) {
        throw new AppError(
          `Cannot add more items. Only ${product.inventory_quantity} available in stock`,
          400
        );
      }

      const { data: updatedItem, error: updateError } = await client
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (updateError) {
        logger.error("Error updating cart item:", updateError);
        throw new AppError("Failed to update cart item", 500);
      }

      return updatedItem;
    } else {
      // Add new item to cart
      const { data: newItem, error: addError } = await client
        .insert([
          {
            cart_id: cartId,
            product_id: itemData.product_id,
            quantity: itemData.quantity,
          },
        ])
        .select()
        .single();

      if (addError) {
        logger.error("Error adding item to cart:", addError);
        throw new AppError("Failed to add item to cart", 500);
      }

      return newItem;
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in addItemToCart:", error);
    throw new AppError("Failed to add item to cart", 500);
  }
};

// Update cart item quantity
export const updateCartItem = async (
  cartId: string,
  itemId: string,
  quantity: number,
  sessionId?: string
) => {
  try {
    // Clean the item ID to ensure no extra quotes
    const cleanItemId = itemId.replace(/"/g, "");

    // Create a client with session ID header if available
    const client = supabaseClient.from("cart_items");
    if (sessionId) {
      client.headers = { "cart-session-id": sessionId };
    }

    // Check if item exists in the cart
    const { data: existingItem, error: itemError } = await client
      .select("id, product_id")
      .eq("id", cleanItemId)
      .eq("cart_id", cartId)
      .single();

    if (itemError || !existingItem) {
      logger.error("Error finding cart item:", itemError);
      throw new AppError("Cart item not found", 404);
    }

    // Check if product exists and is active
    const { data: product, error: productError } = await supabaseClient
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
    const { data: updatedItem, error: updateError } = await client
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
  sessionId?: string
) => {
  try {
    console.log("Removing item from cart:", itemId);
    // Clean the item ID to ensure no extra quotes
    const cleanItemId = itemId.replace(/"/g, "");

    // Create a client with session ID header if available
    const client = supabaseClient.from("cart_items");
    if (sessionId) {
      client.headers = { "cart-session-id": sessionId };
    }
    // Check if item exists in the cart
    const { data: existingItem, error: itemError } = await client
      .select("id")
      .eq("id", cleanItemId)
      .eq("cart_id", cartId)
      .single();

    if (itemError || !existingItem) {
      logger.error("Error finding cart item:", itemError);
      throw new AppError("Cart item not found", 404);
    }

    // Remove the item
    const { error: deleteError } = await supabaseClient
      .from("cart_items")
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
export const getCartWithItems = async (cartId: string, sessionId?: string) => {
  try {
    // Create clients with session ID header if available
    const cartClient = supabaseClient.from("carts");
    const itemsClient = supabaseClient.from("cart_items");

    if (sessionId) {
      cartClient.headers = { "cart-session-id": sessionId };
      itemsClient.headers = { "cart-session-id": sessionId };
    }

    // Get cart
    const { data: cart, error: cartError } = await cartClient
      .select("id, user_id, session_id, created_at, updated_at")
      .eq("id", cartId)
      .single();

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

    if (itemsError) {
      logger.error("Error retrieving cart items:", itemsError);
      throw new AppError("Failed to retrieve cart items", 500);
    }

    // Calculate cart totals
    let subtotal = 0;
    let totalItems = 0;

    cartItems?.forEach((item) => {
      // Check the structure of products and handle accordingly
      if (item.products) {
        // Check if products is an array
        if (Array.isArray(item.products)) {
          if (item.products.length > 0) {
            subtotal += item.products[0].price * item.quantity;
          }
        }
        totalItems += item.quantity;
      }
    });

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
    console.log("Error details:", error);
    throw new AppError("Failed to retrieve cart", 500);
  }
};

// Clear all items from the cart
export const clearCart = async (cartId: string) => {
  try {
    // Delete all items in the cart
    const { error: deleteError } = await supabaseClient
      .from("cart_items")
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

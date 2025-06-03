import {
  createUserClient,
  getAdminClient,
  supabaseClient,
} from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

// Interface for cart item data
export interface CartItemDto {
  product_id: string;
  quantity: number;
}

// Get or create a cart for a user or session
export const getOrCreateCart = async (
  userId?: string,
  //sessionId?: string,
  jwt?: string
) => {
  try {
    if (!userId) {
      throw new AppError("User ID is required", 400);
    }
    // Choose client based on JWT
    const client = createUserClient(jwt);

    // Try to find an existing cart
    let query = client.from("carts").select("*");

    if (userId) {
      query = query.eq("user_id", userId);
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
        //sessionId: sessionId || null,
      };
    }

    // Identify which client to use (admin client for inserts)
    const adminClient = getAdminClient();

    // Create a new cart
    const { data: newCart, error: createError } = await adminClient
      .from("carts")
      .insert([
        {
          user_id: userId || null,
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

// Transfer items from session cart to user cart after login
export const mergeSessionCartToUserCart = async (
  userId: string,
  jwt: string,
  cartItems?: Array<{ product_id: string; quantity: number }> // Accept cart items directly
) => {
  try {
    const client = createUserClient(jwt)
    
    // Get or create user cart
    const { cart: userCart } = await getOrCreateCart(userId, jwt);

    // If no items provided, nothing to merge
    if (!cartItems || cartItems.length === 0) {
      console.log("No items to merge");
      return {
        merged: 0,
        added: 0,
        total: 0
      };
    }
    // Get existing items in user cart
    const { data: userItems, error: userItemsError } = await client
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
    // Process each provided item
    let mergedCount = 0;
    let addedCount = 0;
    
    for (const item of cartItems) {
      // Validate the product exists and is active
      const { data: product, error: productError } = await client
        .from("products")
        .select("id, inventory_quantity, is_active")
        .eq("id", item.product_id)
        .eq("is_active", true)
        .single();

      if (productError || !product) {
        logger.error(`Product ${item.product_id} not found or inactive, skipping`);
        continue;
      }

      if (userItemMap[item.product_id]) {
        // Product already in user cart, update quantity
        const newQuantity = userItemMap[item.product_id].quantity + item.quantity;
        
        // Check inventory
        if (newQuantity > product.inventory_quantity) {
          logger.warn(`Quantity for product ${item.product_id} exceeds inventory, capping at ${product.inventory_quantity}`);
          continue;
        }

        const { error: updateError } = await client
          .from("cart_items")
          .update({
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userItemMap[item.product_id].id);

        if (updateError) {
          logger.error("Error updating cart item quantity:", updateError);
          // Continue with other items
        } else {
          mergedCount++;
        }
      } else {
        // Check inventory
        if (item.quantity > product.inventory_quantity) {
          logger.warn(`Quantity for product ${item.product_id} exceeds inventory, skipping`);
          continue;
        }

        // Add item to user cart
        const { error: insertError } = await client.from("cart_items").insert([
          {
            cart_id: userCart.id,
            product_id: item.product_id,
            quantity: item.quantity,
          },
        ]);

        if (insertError) {
          logger.error("Error adding item to user cart:", insertError);
          // Continue with other items
        } else {
          addedCount++;
        }
      }
    }

    return {
      merged: mergedCount,
      added: addedCount,
      total: mergedCount + addedCount
    };
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
  jwt?: string
) => {
  try {
    // Check if product exists and is active
    const client = createUserClient(jwt);
    const productClient = client.from("products");
    const { data: product, error: productError } = await productClient
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

    let cartItemClient = client.from("cart_items");

    // Check if item already exists in cart
    const { data: existingItem, error: itemError } = await cartItemClient
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

      const { data: updatedItem, error: updateError } = await cartItemClient
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
      const { data: newItem, error: addError } = await cartItemClient
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

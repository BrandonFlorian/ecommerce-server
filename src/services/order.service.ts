import { applyFilterIf, getPaginatedData } from "@/utils/query-helper";
import {
  supabaseClient,
  getAdminClient,
  createUserClient,
} from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import { generateShippingLabel } from "./shipping.service";

// Interface for pagination parameters
export interface OrderPaginationParams {
  page?: number;
  limit?: number;
  status?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  start_date?: string;
  end_date?: string;
}

// Get all orders for a user
export const getUserOrders = async (
  userId: string,
  params: OrderPaginationParams = {},
  jwt?: string
) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sort_by = "created_at",
      sort_order = "desc",
      start_date,
      end_date,
    } = params;

    const client = jwt ? createUserClient(jwt) : supabaseClient;

    // Define filters function
    const applyFilters = (query: any) => {
      // First filter by user ID
      query = query.eq("user_id", userId);

      // Apply other filters conditionally
      return applyFilterIf(
        applyFilterIf(
          applyFilterIf(query, !!status, (q) => q.eq("status", status)),
          !!start_date,
          (q) => q.gte("created_at", start_date)
        ),
        !!end_date,
        (q) => q.lte("created_at", end_date)
      );
    };

    // Use the utility function to get paginated data
    const result = await getPaginatedData({
      client: client,
      table: "orders",
      options: {
        page,
        limit,
        sortBy: sort_by,
        sortOrder: sort_order as "asc" | "desc",
      },
      select: `
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products:product_id (
            id,
            name,
            sku,
            product_images (
              url,
              alt_text,
              is_primary
            )
          )
        ),
        shipping_addresses:shipping_address_id (
          *
        ),
        billing_addresses:billing_address_id (
          *
        )
      `,
      applyFilters,
    });

    return {
      orders: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in getUserOrders:", error);
    throw new AppError("Failed to get orders", 500);
  }
};

// Get a single order by ID
export const getOrderById = async (
  orderId: string,
  userId?: string,
  jwt?: string
) => {
  try {
    const client = jwt ? createUserClient(jwt) : supabaseClient;

    let orderQuery = client
      .from("orders")
      .select(
        `
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products:product_id (
            id,
            name,
            sku,
            product_images (
              url,
              alt_text,
              is_primary
            )
          )
        ),
        shipping_addresses:shipping_address_id (
          *
        ),
        billing_addresses:billing_address_id (
          *
        )
      `
      )
      .eq("id", orderId);

    // If userId is provided, restrict to that user's orders
    if (userId) {
      orderQuery = orderQuery.eq("user_id", userId);
    }

    const { data: order, error } = await orderQuery.single();

    if (error || !order) {
      logger.error(`Error getting order ${orderId}:`, error);
      throw new AppError("Order not found", 404);
    }

    return order;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in getOrderById for ${orderId}:`, error);
    throw new AppError("Failed to get order", 500);
  }
};

// Cancel an order
export const cancelOrder = async (
  orderId: string,
  userId: string,
  jwt?: string
) => {
  try {
    const client = jwt ? createUserClient(jwt) : supabaseClient;

    // Check if order exists and belongs to user
    const { data: order, error: orderError } = await client
      .from("orders")
      .select("id, status, user_id")
      .eq("id", orderId)
      .eq("user_id", userId)
      .single();

    if (orderError || !order) {
      logger.error(
        `Order ${orderId} not found for user ${userId}:`,
        orderError
      );
      throw new AppError("Order not found", 404);
    }

    // Check if order can be canceled
    const cancelableStatuses = ["pending", "paid", "processing"];
    if (!cancelableStatuses.includes(order.status)) {
      throw new AppError(
        `Order in ${order.status} status cannot be cancelled`,
        400
      );
    }

    // Update order status
    const adminClient = getAdminClient();
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      logger.error(`Error cancelling order ${orderId}:`, updateError);
      throw new AppError("Failed to cancel order", 500);
    }

    // Get order items to update inventory
    const { data: orderItems, error: itemsError } = await client
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);

    if (itemsError) {
      logger.error(`Error getting order items for ${orderId}:`, itemsError);
      // Continue with the process
    } else if (orderItems && orderItems.length > 0) {
      // Restore inventory
      for (const item of orderItems) {
        const { error: inventoryError } = await adminClient
          //.from("products")
          .rpc("increment_inventory", {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });

        if (inventoryError) {
          logger.error(
            `Error restoring inventory for product ${item.product_id}:`,
            inventoryError
          );
          // Continue with other items
        }
      }
    }

    return { success: true, message: "Order cancelled successfully" };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in cancelOrder for ${orderId}:`, error);
    throw new AppError("Failed to cancel order", 500);
  }
};

// Update order status (admin only)
export const updateOrderStatus = async (
  orderId: string,
  status: string,
  trackingNumber?: string
) => {
  try {
    const adminClient = getAdminClient();

    // Check if order exists
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      logger.error(`Order ${orderId} not found:`, orderError);
      throw new AppError("Order not found", 404);
    }

    // Valid order statuses
    const validStatuses = [
      "pending",
      "paid",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ];
    if (!validStatuses.includes(status)) {
      throw new AppError("Invalid order status", 400);
    }

    // If status is shipped and no tracking number provided, generate one
    if (status === "shipped" && !trackingNumber) {
      // Get order details to generate label
      const { data: fullOrder, error: fetchError } = await adminClient
        .from("orders")
        .select(
          `
            id,
            shipping_method,
            shipping_rate_id,
            shipping_address_id,
            order_items (
              id,
              product_id,
              quantity,
              products:product_id (id, weight, dimensions)
            )
          `
        )
        .eq("id", orderId)
        .single();

      if (fetchError || !fullOrder) {
        logger.error(
          `Error fetching full order details for ${orderId}:`,
          fetchError
        );
        throw new AppError("Failed to fetch order details", 500);
      }

      // Now fetch the shipping address separately
      const { data: shippingAddress, error: addressError } = await adminClient
        .from("addresses")
        .select("*")
        .eq("id", fullOrder.shipping_address_id)
        .single();

      if (addressError || !shippingAddress) {
        logger.error(
          `Error fetching shipping address for ${orderId}:`,
          addressError
        );
        throw new AppError("Failed to fetch shipping address", 500);
      }

      // Check if we have a shipping rate ID
      if (!fullOrder.shipping_rate_id) {
        throw new AppError("No shipping rate ID found for order", 400);
      }

      const { trackingNumber: newTrackingNumber } = await generateShippingLabel(
        orderId,
        fullOrder.shipping_rate_id
      );
      trackingNumber = newTrackingNumber;
    }

    // Update order
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }

    const { error: updateError } = await adminClient
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      logger.error(`Error updating order ${orderId}:`, updateError);
      throw new AppError("Failed to update order", 500);
    }

    return {
      success: true,
      message: `Order status updated to ${status}`,
      trackingNumber: trackingNumber || null,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(
      `Unexpected error in updateOrderStatus for ${orderId}:`,
      error
    );
    throw new AppError("Failed to update order status", 500);
  }
};

// Get all orders (admin only)
export const getAllOrders = async (params: OrderPaginationParams = {}) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sort_by = "created_at",
      sort_order = "desc",
      start_date,
      end_date,
    } = params;

    // Get admin client
    const adminClient = getAdminClient();

    // Define filters function
    const applyFilters = (query: any) => {
      // Apply filters conditionally
      return applyFilterIf(
        applyFilterIf(
          applyFilterIf(query, !!status, (q) => q.eq("status", status)),
          !!start_date,
          (q) => q.gte("created_at", start_date)
        ),
        !!end_date,
        (q) => q.lte("created_at", end_date)
      );
    };

    // Use the utility function to get paginated data
    const result = await getPaginatedData({
      client: adminClient,
      table: "orders",
      options: {
        page,
        limit,
        sortBy: sort_by,
        sortOrder: sort_order as "asc" | "desc",
      },
      select: `
        *,
        users:user_id (
          id,
          email,
          first_name,
          last_name
        )
      `,
      applyFilters,
    });

    return {
      orders: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in getAllOrders:", error);
    throw new AppError("Failed to get orders", 500);
  }
};

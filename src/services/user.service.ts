import { getPaginatedData } from "@/utils/query-helper";
import {
  supabaseClient,
  getAdminClient,
  createUserClient,
} from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";

// Interface for user profile data
export interface UserProfileDto {
  first_name: string;
  last_name: string;
  phone?: string;
}

// Interface for address data
export interface AddressDto {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default?: boolean;
}

// Get user profile
export const getUserProfile = async (userId: string, jwt?: string) => {
  try {
    // Determine which client to use
    let client;
    if (jwt) {
      // If JWT is provided, create a client with the user's token
      client = createUserClient(jwt);
    } else {
      // Fall back to normal client if no JWT is provided
      client = supabaseClient;
    }
    const { data: user, error } = await client
      .from("user_profiles")
      .select("id, email, first_name, last_name, phone, role, created_at")
      .eq("id", userId)
      .single();

    if (error) {
      logger.error(`Error getting user profile for ${userId}:`, error);
      throw new AppError("User not found", 404);
    }

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in getUserProfile for ${userId}:`, error);
    throw new AppError("Failed to get user profile", 500);
  }
};

// Update user profile
export const updateUserProfile = async (
  userId: string,
  profileData: UserProfileDto
) => {
  try {
    const { data: user, error } = await supabaseClient
      .from("user_profiles")
      .update({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        phone: profileData.phone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select(
        "id, email, first_name, last_name, phone, role, created_at, updated_at"
      )
      .single();

    if (error) {
      logger.error(`Error updating user profile for ${userId}:`, error);
      throw new AppError("Failed to update user profile", 500);
    }

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in updateUserProfile for ${userId}:`, error);
    throw new AppError("Failed to update user profile", 500);
  }
};

// Get user addresses
export const getUserAddresses = async (userId: string) => {
  try {
    const { data: addresses, error } = await supabaseClient
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      logger.error(`Error getting addresses for user ${userId}:`, error);
      throw new AppError("Failed to get addresses", 500);
    }

    return addresses || [];
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in getUserAddresses for ${userId}:`, error);
    throw new AppError("Failed to get addresses", 500);
  }
};

// Add a new address
export const addUserAddress = async (
  userId: string,
  addressData: AddressDto
) => {
  try {
    // If this is the first address or is set as default, update other addresses
    if (addressData.is_default) {
      const { error: updateError } = await supabaseClient
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);

      if (updateError) {
        logger.error(
          `Error updating default addresses for user ${userId}:`,
          updateError
        );
        // Continue anyway
      }
    }

    // Check if this is the first address for the user
    const {
      data,
      error: countError,
      count,
    } = await supabaseClient
      .from("addresses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      logger.error(`Error counting addresses for user ${userId}:`, countError);
      // Continue anyway
    }

    // If this is the first address, make it default regardless of input
    const isDefault = count === 0 ? true : addressData.is_default;

    // Add the new address
    const { data: address, error } = await supabaseClient
      .from("addresses")
      .insert([
        {
          user_id: userId,
          name: addressData.name,
          address_line1: addressData.address_line1,
          address_line2: addressData.address_line2 || null,
          city: addressData.city,
          state: addressData.state,
          postal_code: addressData.postal_code,
          country: addressData.country,
          is_default: isDefault,
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error(`Error adding address for user ${userId}:`, error);
      throw new AppError("Failed to add address", 500);
    }

    return address;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in addUserAddress for ${userId}:`, error);
    throw new AppError("Failed to add address", 500);
  }
};

// Update an address
export const updateUserAddress = async (
  userId: string,
  addressId: string,
  addressData: Partial<AddressDto>
) => {
  try {
    // Check if address exists and belongs to user
    const { data: existingAddress, error: checkError } = await supabaseClient
      .from("addresses")
      .select("id, is_default")
      .eq("id", addressId)
      .eq("user_id", userId)
      .single();

    if (checkError || !existingAddress) {
      logger.error(
        `Address ${addressId} not found for user ${userId}:`,
        checkError
      );
      throw new AppError("Address not found", 404);
    }

    // If setting as default, update other addresses
    if (addressData.is_default && !existingAddress.is_default) {
      const { error: updateError } = await supabaseClient
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", userId)
        .eq("is_default", true);

      if (updateError) {
        logger.error(
          `Error updating default addresses for user ${userId}:`,
          updateError
        );
        // Continue anyway
      }
    }

    // Update the address
    const { data: address, error } = await supabaseClient
      .from("addresses")
      .update({
        name: addressData.name,
        address_line1: addressData.address_line1,
        address_line2: addressData.address_line2,
        city: addressData.city,
        state: addressData.state,
        postal_code: addressData.postal_code,
        country: addressData.country,
        is_default: addressData.is_default,
        updated_at: new Date().toISOString(),
      })
      .eq("id", addressId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      logger.error(
        `Error updating address ${addressId} for user ${userId}:`,
        error
      );
      throw new AppError("Failed to update address", 500);
    }

    return address;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(
      `Unexpected error in updateUserAddress for ${userId}, ${addressId}:`,
      error
    );
    throw new AppError("Failed to update address", 500);
  }
};

// Delete an address
export const deleteUserAddress = async (userId: string, addressId: string) => {
  try {
    // Check if address exists and belongs to user
    const { data: existingAddress, error: checkError } = await supabaseClient
      .from("addresses")
      .select("id, is_default")
      .eq("id", addressId)
      .eq("user_id", userId)
      .single();

    if (checkError || !existingAddress) {
      logger.error(
        `Address ${addressId} not found for user ${userId}:`,
        checkError
      );
      throw new AppError("Address not found", 404);
    }

    // Delete the address
    const { error } = await supabaseClient
      .from("addresses")
      .delete()
      .eq("id", addressId)
      .eq("user_id", userId);

    if (error) {
      logger.error(
        `Error deleting address ${addressId} for user ${userId}:`,
        error
      );
      throw new AppError("Failed to delete address", 500);
    }

    // If deleted address was default, set a new default
    if (existingAddress.is_default) {
      const { data: addresses, error: fetchError } = await supabaseClient
        .from("addresses")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!fetchError && addresses && addresses.length > 0) {
        // Set the first address as default
        const { error: updateError } = await supabaseClient
          .from("addresses")
          .update({ is_default: true })
          .eq("id", addresses[0].id)
          .eq("user_id", userId);

        if (updateError) {
          logger.error(
            `Error setting new default address for user ${userId}:`,
            updateError
          );
          // Not critical, continue
        }
      }
    }

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(
      `Unexpected error in deleteUserAddress for ${userId}, ${addressId}:`,
      error
    );
    throw new AppError("Failed to delete address", 500);
  }
};

// Admin: Get all users
export const getAllUsers = async (page = 1, limit = 20) => {
  try {
    const adminClient = getAdminClient();

    // Use the utility function to get paginated data
    const result = await getPaginatedData({
      client: adminClient,
      table: "users",
      options: {
        page,
        limit,
        sortBy: "created_at",
        sortOrder: "desc",
      },
      select:
        "id, email, first_name, last_name, phone, role, created_at, updated_at",
    });

    return {
      users: result.data,
      pagination: result.pagination,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in getAllUsers:", error);
    throw new AppError("Failed to get users", 500);
  }
};
// Admin: Get user details
export const getUserDetails = async (userId: string) => {
  try {
    const adminClient = getAdminClient();

    // Get user details
    const { data: user, error } = await adminClient
      .from("user_profiles")
      .select(
        `
        id, 
        email, 
        first_name, 
        last_name, 
        phone, 
        role, 
        created_at, 
        updated_at,
        addresses (*)
      `
      )
      .eq("id", userId)
      .single();

    if (error) {
      logger.error(`Error getting user details for ${userId}:`, error);
      throw new AppError("User not found", 404);
    }

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error(`Unexpected error in getUserDetails for ${userId}:`, error);
    throw new AppError("Failed to get user details", 500);
  }
};

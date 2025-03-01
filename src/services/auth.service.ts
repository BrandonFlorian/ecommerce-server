import jwt, { SignOptions } from "jsonwebtoken";
import { getAdminClient, supabaseClient } from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import type { StringValue } from "ms";
// Interface for user registration data
export interface RegisterUserDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// Interface for user login data
export interface LoginUserDto {
  email: string;
  password: string;
}

// Generate JWT token for a user
export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  const period: number = parseInt(process.env.JWT_EXPIRES_IN || "7");
  const expiresIn: StringValue = `${period}d`;

  const options: SignOptions = {
    expiresIn: expiresIn,
  };

  return jwt.sign({ id: userId }, secret, options);
};

// Register a new user
export const registerUser = async (userData: RegisterUserDto): Promise<any> => {
  try {
    // First, create auth user in Supabase
    const { data: authData, error: authError } =
      await supabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

    if (authError) {
      logger.error("Error registering auth user:", authError);
      throw new AppError(authError.message, 400);
    }

    if (!authData.user) {
      throw new AppError("Failed to create user", 500);
    }
    const adminClient = getAdminClient();
    // Then create the user profile in our users table
    const { data: profileData, error: profileError } = await adminClient
      .from("users")
      .insert([
        {
          id: authData.user.id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone || null,
          role: "customer", // Default role
        },
      ])
      .select()
      .single();

    if (profileError) {
      logger.error("Error creating user profile:", profileError);

      // Attempt to clean up the auth user if profile creation fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id);

      throw new AppError(profileError.message, 400);
    }

    return {
      user: profileData,
      token: generateToken(profileData.id),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in registerUser:", error);
    throw new AppError("Failed to register user", 500);
  }
};

// Login a user
export const loginUser = async (loginData: LoginUserDto): Promise<any> => {
  try {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

    if (authError) {
      logger.error("Error logging in user:", authError);
      throw new AppError("Invalid email or password", 401);
    }

    if (!authData.user) {
      throw new AppError("User not found", 404);
    }

    // Get the user profile from our users table
    const { data: profileData, error: profileError } = await supabaseClient
      .from("users")
      .select("id, email, first_name, last_name, phone, role")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      logger.error("Error retrieving user profile:", profileError);
      throw new AppError("User profile not found", 404);
    }

    return {
      user: profileData,
      token: generateToken(profileData.id),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in loginUser:", error);
    throw new AppError("Failed to login", 500);
  }
};

// Send password reset email
export const forgotPassword = async (email: string): Promise<void> => {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });

    if (error) {
      logger.error("Error sending password reset email:", error);
      throw new AppError(error.message, 400);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in forgotPassword:", error);
    throw new AppError("Failed to send password reset email", 500);
  }
};

// Reset password with token
export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<void> => {
  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      logger.error("Error resetting password:", error);
      throw new AppError(error.message, 400);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in resetPassword:", error);
    throw new AppError("Failed to reset password", 500);
  }
};

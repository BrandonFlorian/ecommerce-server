import jwt, { SignOptions } from "jsonwebtoken";
import { getAdminClient, supabaseClient } from "../config/supabase";
import { AppError } from "../utils/appError";
import { logger } from "../utils/logger";
import type { StringValue } from "ms";
import { Response } from "express";
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

    if (!authData.user || !authData.session) {
      throw new AppError("Failed to create user", 500);
    }

    const adminClient = getAdminClient();
    // Then create the user profile in our users table
    const { data: profileData, error: profileError } = await adminClient
      .from("user_profiles")
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
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
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
export const loginUser = async (
  loginData: LoginUserDto,
  res?: Response
): Promise<any> => {
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

    if (!authData.user || !authData.session) {
      throw new AppError("User not found", 404);
    }

    // Get the user profile from our users table
    const { data: profileData, error: profileError } = await supabaseClient
      .from("user_profiles")
      .select("id, email, first_name, last_name, phone, role")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      logger.error("Error retrieving user profile:", profileError);
      throw new AppError("User profile not found", 404);
    }

    // Generate JWT token (you might want to use the Supabase session token directly)
    const token = authData.session.access_token;

    // If response object is provided, set the tokens as HTTP-only cookies
    if (res) {
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: authData.session.expires_in * 1000, // Use Supabase's expiry time
        sameSite: "lax",
      });

      res.cookie("refreshToken", authData.session.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: "lax",
        path: "/api/auth", // Restrict to auth endpoints for added security
      });
    }

    return {
      user: profileData,
      token,
      refresh_token: authData.session.refresh_token,
      expires_in: authData.session.expires_in,
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

// Refresh tokens
export const refreshTokens = async (refreshToken: string): Promise<any> => {
  try {
    // Use Supabase's built-in refresh mechanism
    const { data, error } = await supabaseClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      logger.error("Error refreshing token:", error);
      throw new AppError("Invalid or expired refresh token", 401);
    }

    if (!data.session) {
      throw new AppError("Failed to refresh session", 500);
    }

    if (!data.user) {
      throw new AppError("Failed to refresh session", 500);
    }

    // Get the user profile from our users table
    const { data: profileData, error: profileError } = await supabaseClient
      .from("user_profiles")
      .select("id, email, first_name, last_name, phone, role")
      .eq("id", data.user.id)
      .single();

    if (profileError) {
      logger.error("Error retrieving user profile:", profileError);
      throw new AppError("User profile not found", 404);
    }

    return {
      user: profileData,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in refreshTokens:", error);
    throw new AppError("Failed to refresh token", 500);
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      logger.error("Error signing out user:", error);
      throw new AppError("Failed to sign out", 500);
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error("Unexpected error in logoutUser:", error);
    throw new AppError("Failed to logout", 500);
  }
};

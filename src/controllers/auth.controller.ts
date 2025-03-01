import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  RegisterUserDto,
  LoginUserDto,
} from "../services/auth.service";
import { AppError } from "../utils/appError";

// Register a new user
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError("Validation error", 400, errors.array()));
    }

    const userData: RegisterUserDto = {
      email: req.body.email,
      password: req.body.password,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone,
    };

    const result = await registerUser(userData);

    res.status(201).json({
      status: "success",
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          role: result.user.role,
        },
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login a user
export const login = async (
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

    const loginData: LoginUserDto = {
      email: req.body.email,
      password: req.body.password,
    };

    const result = await loginUser(loginData);

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          first_name: result.user.first_name,
          last_name: result.user.last_name,
          role: result.user.role,
        },
        token: result.token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Request password reset
export const forgotPasswordController = async (
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

    await forgotPassword(req.body.email);

    res.status(200).json({
      status: "success",
      message: "Password reset instructions sent to your email",
    });
  } catch (error) {
    next(error);
  }
};

// Reset password
export const resetPasswordController = async (
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

    const { token, password } = req.body;

    await resetPassword(token, password);

    res.status(200).json({
      status: "success",
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // User is already attached to req object by the protect middleware
    res.status(200).json({
      status: "success",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

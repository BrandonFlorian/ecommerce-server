import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getAllUsers,
  getUserDetails,
  UserProfileDto,
  AddressDto,
} from "../services/user.service";
import { AppError } from "../utils/appError";

// Get current user profile
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    // Extract the JWT from the request (without 'Bearer ' prefix)
    let jwt: string | undefined;
    if (req.headers.authorization?.startsWith("Bearer ")) {
      jwt = req.headers.authorization.substring(7);
    }

    const user = await getUserProfile(userId, jwt);

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Update current user profile
export const updateProfile = async (
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

    const userId = req.userId!;
    const profileData: UserProfileDto = {
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      phone: req.body.phone,
    };

    const user = await updateUserProfile(userId, profileData);

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Get user addresses
export const getAddresses = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;

    const addresses = await getUserAddresses(userId);

    res.status(200).json({
      status: "success",
      data: addresses,
    });
  } catch (error) {
    next(error);
  }
};

// Add a new address
export const addAddress = async (
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

    const userId = req.userId!;
    const addressData: AddressDto = {
      name: req.body.name,
      address_line1: req.body.address_line1,
      address_line2: req.body.address_line2,
      city: req.body.city,
      state: req.body.state,
      postal_code: req.body.postal_code,
      country: req.body.country,
      is_default: req.body.is_default,
    };

    const address = await addUserAddress(userId, addressData);

    res.status(201).json({
      status: "success",
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// Update an address
export const updateAddress = async (
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

    const userId = req.userId!;
    const addressId = req.params.id;
    const addressData: Partial<AddressDto> = req.body;

    const address = await updateUserAddress(userId, addressId, addressData);

    res.status(200).json({
      status: "success",
      data: address,
    });
  } catch (error) {
    next(error);
  }
};

// Delete an address
export const removeAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const addressId = req.params.id;

    await deleteUserAddress(userId, addressId);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Admin: Get all users
export const adminGetAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await getAllUsers(page, limit);

    res.status(200).json({
      status: "success",
      pagination: result.pagination,
      data: result.users,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get user details
export const adminGetUserDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.id;

    const user = await getUserDetails(userId);

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

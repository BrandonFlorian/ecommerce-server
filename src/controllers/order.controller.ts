import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import {
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getAllOrders,
  OrderPaginationParams,
} from "../services/order.service";
import { AppError } from "../utils/appError";

// Get all orders for the current user
export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("getMyOrders req", req);

    const userId = req.userId!;
    const jwt = req.jwt;
    const params: OrderPaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as "asc" | "desc",
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };

    const result = await getUserOrders(userId, params, jwt);

    res.status(200).json({
      status: "success",
      pagination: result.pagination,
      data: result.orders,
    });
  } catch (error) {
    next(error);
  }
};

// Get a single order by ID
export const getOrderDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("getOrderDetails req", req);

    const userId = req.userId!;
    const jwt = req.jwt;
    const orderId = req.params.id;

    const order = await getOrderById(orderId, userId, jwt);

    res.status(200).json({
      status: "success",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel an order
export const cancelMyOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId!;
    const jwt = req.jwt;
    const orderId = req.params.id;

    const result = await cancelOrder(orderId, userId, jwt);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Get all orders (admin only)
export const adminGetAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const params: OrderPaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      status: req.query.status as string,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as "asc" | "desc",
      start_date: req.query.start_date as string,
      end_date: req.query.end_date as string,
    };

    const result = await getAllOrders(params);

    res.status(200).json({
      status: "success",
      pagination: result.pagination,
      data: result.orders,
    });
  } catch (error) {
    next(error);
  }
};

// Get order details (admin)
export const adminGetOrderDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orderId = req.params.id;

    const order = await getOrderById(orderId);

    res.status(200).json({
      status: "success",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Update order status (admin only)
export const adminUpdateOrderStatus = async (
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

    const orderId = req.params.id;
    const { status, tracking_number } = req.body;

    const result = await updateOrderStatus(orderId, status, tracking_number);

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

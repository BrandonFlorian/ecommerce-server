# E-commerce Backend

A production-grade e-commerce backend for selling products. Built with Node.js, Express, TypeScript, Supabase, and Stripe integration.

## Features

- **User Authentication**: Registration, login, password recovery with Supabase Auth
- **Product Management**: Categories, products, images, inventory management
- **Shopping Cart**: Cart management with user and guest session support
- **Order Processing**: Comprehensive order management workflow
- **Payment Integration**: Secure checkout with Stripe
- **Shipping**: Shipping calculation, address validation, and tracking
- **User Management**: User profiles and address book
- **Admin Panel**: Admin-specific endpoints for managing products, orders, and users
- **Security**: Input validation, error handling, CORS, and JWT authentication

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Payment Processing**: Stripe
- **Validation**: Express Validator & Joi
- **Error Handling**: Custom error classes and middleware
- **Logging**: Custom logger implementation

## Project Structure

```
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Route controllers
│   ├── middlewares/      # Express middlewares
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   │   ├── validators/   # Input validation schemas
│   ├── app.ts            # Express app setup
│   └── server.ts         # Server entry point
├── dist/                 # Compiled JavaScript
├── .env                  # Environment variables
├── .env.example          # Example environment variables
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/me` - Get current user profile

### Products

- `GET /api/products` - List all products (with pagination, filtering, sorting)
- `GET /api/products/search` - Search products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (admin only)
- `PUT /api/products/:id` - Update product (admin only)
- `DELETE /api/products/:id` - Delete product (admin only)
- `GET /api/products/categories` - List all categories
- `GET /api/products/categories/:id` - Get category details
- `GET /api/products/categories/:id/products` - Get products by category

### User Management

- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update current user profile
- `GET /api/users/me/addresses` - Get user addresses
- `POST /api/users/me/addresses` - Add new address
- `PUT /api/users/me/addresses/:id` - Update address
- `DELETE /api/users/me/addresses/:id` - Delete address

### Cart & Orders

- `GET /api/cart` - Get cart contents
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:id` - Update cart item
- `DELETE /api/cart/items/:id` - Remove item from cart
- `DELETE /api/cart` - Clear cart
- `GET /api/orders/my-orders` - List user orders
- `GET /api/orders/my-orders/:id` - Get order details
- `POST /api/orders/my-orders/:id/cancel` - Cancel order

### Shipping

- `POST /api/shipping/calculate` - Calculate shipping rates
- `POST /api/shipping/validate-address` - Validate shipping address
- `GET /api/shipping/tracking/:trackingNumber` - Get tracking information

### Payment

- `POST /api/payment/create-payment-intent` - Create payment intent
- `GET /api/payment/payment-status/:paymentIntentId` - Check payment status
- `POST /api/payment/webhook` - Handle Stripe webhook events

### Admin

- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/orders` - List all orders
- `GET /api/admin/orders/:id` - Get order details
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - Get user details

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm or yarn
- Supabase account
- Stripe account

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/e-commerce-backend.git
   cd e-commerce-backend
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`

   ```bash
   cp .env.example .env
   ```

4. Set up your Supabase database

   - Create a new Supabase project
   - Run the database schema SQL from `supabase-schema.sql` in the Supabase SQL editor
   - Update your `.env` file with your Supabase credentials

5. Set up Stripe

   - Create a Stripe account
   - Get your API keys and update your `.env` file
   - Set up webhooks to point to your `/api/payment/webhook` endpoint

6. Build the project

   ```bash
   npm run build
   ```

7. Start the server

   ```bash
   npm start
   ```

   For development:

   ```bash
   npm run dev
   ```

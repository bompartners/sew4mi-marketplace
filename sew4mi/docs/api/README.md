# API Documentation

## Overview

The Sew4Mi API provides RESTful endpoints for managing the marketplace operations.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://sew4mi.com/api`

## Authentication

All API requests require authentication using JWT tokens.

```bash
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout

### Users

- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

### Orders

- `GET /orders` - List orders
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order details
- `PUT /orders/:id` - Update order

### Tailors

- `GET /tailors` - List tailors
- `GET /tailors/:id` - Get tailor profile

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## Rate Limiting

- 100 requests per minute per IP for authenticated requests
- 20 requests per minute per IP for unauthenticated requests

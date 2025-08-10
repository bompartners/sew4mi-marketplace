# API Specification

Based on the hybrid REST/GraphQL approach defined in our Tech Stack, here's the API specification:

## REST API Specification

```yaml
openapi: 3.0.0
info:
  title: Sew4Mi Marketplace API
  version: 1.0.0
  description: REST API for core CRUD operations and webhook endpoints
servers:
  - url: https://api.sew4mi.com/v1
    description: Production API
  - url: https://staging-api.sew4mi.com/v1
    description: Staging API

paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, phone, password, fullName, role]
              properties:
                email: { type: string, format: email }
                phone: { type: string, pattern: '^\\+233[0-9]{9}$' }
                password: { type: string, minLength: 8 }
                fullName: { type: string }
                role: { type: string, enum: [CUSTOMER, TAILOR] }
      responses:
        201:
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'

  /orders:
    post:
      summary: Create new order
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrderRequest'
      responses:
        201:
          description: Order created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Order'
    
    get:
      summary: List user's orders
      security: [{ bearerAuth: [] }]
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [DRAFT, IN_PROGRESS, DELIVERED, DISPUTED]
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
      responses:
        200:
          description: Orders list
          content:
            application/json:
              schema:
                type: object
                properties:
                  orders: { type: array, items: { $ref: '#/components/schemas/Order' } }
                  total: { type: integer }

  /orders/{orderId}/milestones:
    post:
      summary: Add order milestone with photo
      security: [{ bearerAuth: [] }]
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [milestone, photo]
              properties:
                milestone: { type: string }
                photo: { type: string, format: binary }
                notes: { type: string }
      responses:
        201:
          description: Milestone added

  /payments/initiate:
    post:
      summary: Initiate mobile money payment
      security: [{ bearerAuth: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [orderId, type, provider]
              properties:
                orderId: { type: string, format: uuid }
                type: { type: string, enum: [DEPOSIT, FITTING_PAYMENT, FINAL_PAYMENT] }
                provider: { type: string, enum: [MTN_MOMO, VODAFONE_CASH] }
      responses:
        200:
          description: Payment initiated
          content:
            application/json:
              schema:
                type: object
                properties:
                  transactionId: { type: string }
                  paymentUrl: { type: string }

  /webhooks/whatsapp:
    post:
      summary: WhatsApp webhook for incoming messages
      security: [{ whatsappWebhook: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WhatsAppWebhook'
      responses:
        200:
          description: Webhook processed

  /webhooks/payment/{provider}:
    post:
      summary: Payment provider webhook
      parameters:
        - name: provider
          in: path
          required: true
          schema: { type: string, enum: [mtn, vodafone] }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
      responses:
        200:
          description: Payment status updated

components:
  schemas:
    Order:
      type: object
      properties:
        id: { type: string, format: uuid }
        orderNumber: { type: string }
        status: { type: string }
        totalAmount: { type: number }
        estimatedDelivery: { type: string, format: date }
        # ... other fields from data model

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

## GraphQL Schema

```graphql
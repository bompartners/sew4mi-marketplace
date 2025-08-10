# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** Always define types in `packages/shared/src/types` and import from `@sew4mi/shared/types` - never duplicate type definitions
- **API Calls:** Never make direct HTTP calls - use the service layer (`services/api.service.ts`) for all external communication  
- **Environment Variables:** Access only through config objects (`lib/config.ts`), never `process.env` directly in components
- **Error Handling:** All API routes must use the standard error handler middleware (`middleware/error.ts`)
- **State Updates:** Never mutate state directly - use Zustand actions or React Query mutations for all state changes
- **Database Access:** Repository pattern only - never call Supabase client directly from API routes, use repository layer
- **WhatsApp Integration:** All WhatsApp operations through `services/whatsapp.service.ts` - maintain webhook signature verification
- **Payment Processing:** Escrow calculations through `utils/escrow.ts` - never hardcode payment amounts or percentages
- **File Uploads:** Use Supabase Storage service (`services/storage.service.ts`) with automatic image optimization
- **Authentication:** JWT validation in middleware only - never validate tokens in individual route handlers

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `OrderCard.tsx`, `TailorProfile.tsx` |
| Hooks | camelCase with 'use' | - | `useAuth.ts`, `useOrders.ts` |
| API Routes | - | kebab-case | `/api/orders/create`, `/api/tailor-profiles` |
| Database Tables | - | snake_case | `user_profiles`, `order_milestones` |
| GraphQL Types | - | PascalCase | `OrderStatus`, `TailorProfile` |
| Environment Variables | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL` |
| Constants | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `ORDER_STATUSES`, `PAYMENT_PROVIDERS` |
| Services | camelCase with Service suffix | camelCase with Service suffix | `orderService`, `paymentService` |

## Documentation Standards

### JSDoc Requirements

All public functions, interfaces, classes, and modules must include comprehensive JSDoc comments:

```typescript
/**
 * Creates a new order with progressive escrow system
 * @param orderData - The order details including customer, tailor, and garment info
 * @param customerProfile - Customer's measurement profile and preferences  
 * @param options - Additional options for order creation
 * @returns Promise resolving to created order with escrow breakdown
 * @throws {TailorNotAvailableError} When selected tailor is at capacity
 * @throws {ValidationError} When order data is invalid
 * @example
 * ```typescript
 * const order = await createOrder(
 *   { tailorId: 'tailor_123', garmentType: 'suit' },
 *   { customerId: 'cust_456', measurements: {...} },
 *   { priorityProcessing: true }
 * );
 * ```
 */
export async function createOrder(
  orderData: CreateOrderRequest,
  customerProfile: CustomerProfile,
  options: OrderOptions = {}
): Promise<Order> {
  // Implementation
}

/**
 * Represents a customer's measurement profile for garment creation
 * @interface CustomerProfile
 */
export interface CustomerProfile {
  /** Unique customer identifier */
  customerId: string;
  
  /** Customer's body measurements in centimeters */
  measurements: BodyMeasurements;
  
  /** Preferred fit style (slim, regular, loose) */
  fitPreference: FitStyle;
  
  /** Optional fabric preferences */
  fabricPreferences?: FabricPreferences;
}
```

### Documentation Requirements

- **Public APIs:** Must include purpose, parameters, return values, exceptions, and usage examples
- **Interfaces/Types:** Document all properties with clear descriptions and units where applicable
- **Complex Logic:** Include inline comments explaining business rules and calculations
- **External Integrations:** Document API versions, rate limits, and error handling
- **Ghana-Specific Features:** Include cultural context and local requirements

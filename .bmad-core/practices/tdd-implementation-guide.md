# Test-Driven Development (TDD) Implementation Guide

## Purpose

This guide establishes **mandatory TDD practices** for all story implementations in the Sew4Mi Marketplace project. Following these practices prevents testability issues, ensures high code quality, and reduces post-implementation bugs.

---

## 🚨 MANDATORY REQUIREMENT

**ALL stories MUST be implemented using Test-Driven Development (TDD).**

This is not optional. Stories implemented without TDD will be rejected during QA review.

---

## Why TDD Is Required

Based on lessons learned from Story 4.4:
- **Testability Issues:** Code written without tests often has poor dependency injection
- **Late Bug Discovery:** Issues found after implementation are 10x more expensive to fix
- **Design Problems:** Hard-to-test code usually indicates poor design
- **Missing Edge Cases:** Tests written after code often miss critical scenarios
- **Lower Quality:** Non-TDD code has higher defect rates and lower maintainability

---

## The TDD Cycle: RED-GREEN-REFACTOR

```
┌─────────────────────────────────────────────┐
│                                             │
│     1. 🔴 RED                               │
│     Write a failing test                    │
│                                             │
│              ↓                              │
│                                             │
│     2. 🟢 GREEN                             │
│     Write minimal code to pass              │
│                                             │
│              ↓                              │
│                                             │
│     3. 🔵 REFACTOR                          │
│     Clean up while keeping tests green      │
│                                             │
│              ↓                              │
│                                             │
│     ↻ REPEAT for next feature              │
│                                             │
└─────────────────────────────────────────────┘
```

### Detailed Steps

#### 1. 🔴 RED Phase
```typescript
// FIRST: Write a test that describes what you want
describe('OrderService', () => {
  it('should calculate correct escrow amounts', () => {
    const service = new OrderService();
    const result = service.calculateEscrow(100);

    expect(result.deposit).toBe(25);      // 25%
    expect(result.fitting).toBe(50);      // 50%
    expect(result.final).toBe(25);        // 25%
  });
});

// Run test: ❌ FAILS (TypeError: service.calculateEscrow is not a function)
```

#### 2. 🟢 GREEN Phase
```typescript
// THEN: Write MINIMAL code to make test pass
export class OrderService {
  calculateEscrow(totalAmount: number) {
    return {
      deposit: totalAmount * 0.25,
      fitting: totalAmount * 0.50,
      final: totalAmount * 0.25
    };
  }
}

// Run test: ✅ PASSES
```

#### 3. 🔵 REFACTOR Phase
```typescript
// FINALLY: Clean up code (extract constants, improve naming)
export class OrderService {
  private readonly ESCROW_PERCENTAGES = {
    DEPOSIT: 0.25,
    FITTING: 0.50,
    FINAL: 0.25
  };

  calculateEscrow(totalAmount: number): EscrowAmounts {
    return {
      deposit: totalAmount * this.ESCROW_PERCENTAGES.DEPOSIT,
      fitting: totalAmount * this.ESCROW_PERCENTAGES.FITTING,
      final: totalAmount * this.ESCROW_PERCENTAGES.FINAL
    };
  }
}

// Run test: ✅ STILL PASSES
```

---

## Implementation Order by Layer

### 1. Repository Layer (Data Access)

**Start Here - This is your foundation**

```typescript
// Test-first approach for repositories
class ReviewRepository {
  // 1. Constructor with dependency injection
  constructor(private client?: SupabaseClient) {}

  // 2. Private method to get client (test or production)
  private getClient(): SupabaseClient {
    return this.client || createServerClient();
  }
}
```

**TDD Sequence:**
1. Test CRUD operations (Create, Read, Update, Delete)
2. Test query builders and filters
3. Test error handling (not found, constraints)
4. Test RLS policy enforcement
5. Test pagination and sorting

### 2. Service Layer (Business Logic)

**After Repository - Depends on data layer**

```typescript
// Service with injected dependencies
class ReviewService {
  constructor(
    private repo?: ReviewRepository,
    private storage?: StorageService,
    private notifier?: NotificationService
  ) {
    this.repo = repo || new ReviewRepository();
    this.storage = storage || new StorageService();
    this.notifier = notifier || new NotificationService();
  }
}
```

**TDD Sequence:**
1. Test business rules and validation
2. Test orchestration of multiple repositories
3. Test error handling and recovery
4. Test external service integration
5. Test transaction management

### 3. API Routes (HTTP Layer)

**After Service - Depends on business logic**

```typescript
// API route test example
describe('POST /api/reviews/create', () => {
  it('returns 401 when not authenticated', async () => {
    const response = await request(app)
      .post('/api/reviews/create')
      .send({ rating: 5 });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });
});
```

**TDD Sequence:**
1. Test authentication/authorization
2. Test input validation (Zod schemas)
3. Test successful responses
4. Test error responses
5. Test rate limiting

### 4. UI Components (Presentation Layer)

**After API - Depends on backend**

```typescript
// Component test example
describe('ReviewForm', () => {
  it('disables submit when ratings incomplete', () => {
    render(<ReviewForm onSubmit={jest.fn()} />);

    const submitButton = screen.getByRole('button', { name: /submit/i });
    expect(submitButton).toBeDisabled();
  });
});
```

**TDD Sequence:**
1. Test component rendering
2. Test user interactions
3. Test form validation
4. Test accessibility (ARIA, keyboard nav)
5. Test error states

---

## Testability Patterns

### 1. Dependency Injection Pattern

**❌ BAD: Hard dependencies (untestable)**
```typescript
export class OrderService {
  async createOrder(data: CreateOrderInput) {
    // Direct dependency - can't mock for tests
    const supabase = createServerClient();
    const result = await supabase.from('orders').insert(data);
    return result;
  }
}
```

**✅ GOOD: Injected dependencies (testable)**
```typescript
export class OrderService {
  constructor(private supabase?: SupabaseClient) {
    this.supabase = supabase || createServerClient();
  }

  async createOrder(data: CreateOrderInput) {
    const result = await this.supabase.from('orders').insert(data);
    return result;
  }
}

// In tests:
const mockSupabase = createMockSupabaseClient();
const service = new OrderService(mockSupabase);
```

### 2. Mock Objects Pattern

```typescript
// Create reusable mock factories
export function createMockSupabaseClient(data?: any) {
  return {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data, error: null }))
        }))
      })),
      insert: jest.fn(() => Promise.resolve({ data, error: null })),
      update: jest.fn(() => Promise.resolve({ data, error: null })),
      delete: jest.fn(() => Promise.resolve({ data, error: null }))
    }))
  };
}
```

### 3. Test Data Builders Pattern

```typescript
// Create test data builders for complex objects
class OrderBuilder {
  private order: Partial<Order> = {
    id: 'order-123',
    status: 'PENDING_DEPOSIT',
    totalAmount: 100
  };

  withStatus(status: OrderStatus): this {
    this.order.status = status;
    return this;
  }

  withAmount(amount: number): this {
    this.order.totalAmount = amount;
    return this;
  }

  build(): Order {
    return this.order as Order;
  }
}

// Usage in tests:
const order = new OrderBuilder()
  .withStatus('DELIVERED')
  .withAmount(250)
  .build();
```

---

## Common TDD Scenarios

### Testing Async Operations

```typescript
describe('OrderRepository', () => {
  it('fetches order by id', async () => {
    const mockOrder = { id: '123', status: 'DELIVERED' };
    const mockSupabase = createMockSupabaseClient(mockOrder);
    const repo = new OrderRepository(mockSupabase);

    const result = await repo.findById('123');

    expect(result).toEqual(mockOrder);
    expect(mockSupabase.from).toHaveBeenCalledWith('orders');
  });
});
```

### Testing Error Handling

```typescript
describe('ReviewService', () => {
  it('throws when order not eligible for review', async () => {
    const mockRepo = {
      checkEligibility: jest.fn().mockResolvedValue({
        canReview: false,
        reason: 'NOT_DELIVERED'
      })
    };
    const service = new ReviewService(mockRepo);

    await expect(service.createReview({ orderId: '123' }))
      .rejects
      .toThrow('Order not eligible for review: NOT_DELIVERED');
  });
});
```

### Testing Time-Dependent Code

```typescript
describe('ReviewEligibility', () => {
  beforeEach(() => {
    // Freeze time for consistent tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('expires review after 90 days', () => {
    const deliveryDate = new Date('2024-02-01T00:00:00Z');
    const result = calculateDaysSinceDelivery(deliveryDate);

    expect(result).toBe(120); // More than 90 days
    expect(isEligibleForReview(result)).toBe(false);
  });
});
```

### Testing UI Interactions

```typescript
describe('StarRating', () => {
  it('updates rating on star click', async () => {
    const onRate = jest.fn();
    render(<StarRating onRate={onRate} />);

    const fourthStar = screen.getByLabelText('Rate 4 stars');
    await userEvent.click(fourthStar);

    expect(onRate).toHaveBeenCalledWith(4);
    expect(fourthStar).toHaveAttribute('aria-checked', 'true');
  });
});
```

---

## TDD Checklist for Every Story

Before starting implementation:

### Pre-Implementation
- [ ] Read story acceptance criteria
- [ ] Identify all testable behaviors
- [ ] Plan test scenarios for each AC
- [ ] Set up test file structure
- [ ] Configure test environment

### During Implementation

#### For Each Feature:
- [ ] 🔴 Write failing test first
- [ ] ✅ Verify test fails with expected error
- [ ] 🟢 Write minimal code to pass
- [ ] ✅ Verify test passes
- [ ] 🔵 Refactor if needed
- [ ] ✅ Verify test still passes
- [ ] Commit with descriptive message

#### For Each Component:
- [ ] Design dependency injection
- [ ] Create mock objects
- [ ] Test happy path first
- [ ] Test edge cases
- [ ] Test error conditions
- [ ] Test accessibility

### Post-Implementation
- [ ] Run full test suite
- [ ] Check code coverage (>60% minimum, 80% target)
- [ ] Review untested code paths
- [ ] Add integration tests
- [ ] Document complex test scenarios
- [ ] Update story with test results

---

## Red Flags - Stop and Fix

If you find yourself doing any of these, **STOP IMMEDIATELY** and correct:

### ⛔ Critical Anti-Patterns

1. **Writing code before tests**
   - Stop, delete the code, write test first

2. **Test always passes (even with broken code)**
   - Your mock is wrong, fix it

3. **Can't test without real database**
   - Missing dependency injection, refactor

4. **Test is testing implementation, not behavior**
   - Rewrite to test what it does, not how

5. **Skipping tests "temporarily"**
   - Never skip, fix the issue now

6. **"I'll add tests later"**
   - No, you won't. Write them now.

---

## Testing Tools & Commands

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test review.repository.test.ts

# Run with coverage
pnpm test:coverage

# Run only tests matching pattern
pnpm test --grep "ReviewRepository"
```

### Debugging Tests

```bash
# Run test with debugging
node --inspect-brk ./node_modules/.bin/vitest

# Run single test in isolation
pnpm test -t "should calculate escrow amounts"

# Show full error traces
pnpm test --reporter=verbose
```

### Coverage Requirements

```javascript
// vitest.config.ts
export default {
  test: {
    coverage: {
      statements: 60,    // Minimum
      branches: 50,      // Minimum
      functions: 60,     // Minimum
      lines: 60,         // Minimum

      // Aim for these targets:
      // statements: 80
      // branches: 75
      // functions: 80
      // lines: 80
    }
  }
};
```

---

## TDD Success Metrics

Your TDD implementation is successful when:

### ✅ Process Metrics
- [ ] 100% of code has tests written first
- [ ] All tests initially failed (RED phase)
- [ ] All tests now pass (GREEN phase)
- [ ] Code has been refactored (REFACTOR phase)
- [ ] Tests run on every commit

### ✅ Quality Metrics
- [ ] >60% code coverage (80% target)
- [ ] Zero untested public methods
- [ ] All edge cases have tests
- [ ] Tests are readable and documented
- [ ] Tests run in <30 seconds

### ✅ Design Metrics
- [ ] All dependencies are injected
- [ ] No hard-coded dependencies
- [ ] Mocks are reusable
- [ ] Tests don't touch external services
- [ ] Code is modular and testable

---

## Example: Complete TDD Session

Here's a full example of implementing a feature with TDD:

```typescript
// FEATURE: Review eligibility checking

// ========== CYCLE 1: Basic eligibility ==========

// 🔴 RED: Write first failing test
describe('ReviewEligibilityService', () => {
  it('allows review for delivered order', async () => {
    const service = new ReviewEligibilityService();
    const result = await service.checkEligibility('order-1');
    expect(result.canReview).toBe(true);
  });
});
// Run: ❌ FAILS - ReviewEligibilityService is not defined

// 🟢 GREEN: Minimal implementation
export class ReviewEligibilityService {
  async checkEligibility(orderId: string) {
    return { canReview: true };
  }
}
// Run: ✅ PASSES

// ========== CYCLE 2: Add order status check ==========

// 🔴 RED: Add test for non-delivered order
it('prevents review for non-delivered order', async () => {
  const mockRepo = {
    findOrder: jest.fn().mockResolvedValue({
      status: 'IN_PROGRESS'
    })
  };
  const service = new ReviewEligibilityService(mockRepo);
  const result = await service.checkEligibility('order-1');
  expect(result.canReview).toBe(false);
  expect(result.reason).toBe('NOT_DELIVERED');
});
// Run: ❌ FAILS - constructor doesn't accept repo

// 🟢 GREEN: Add dependency injection
export class ReviewEligibilityService {
  constructor(private repo?: OrderRepository) {
    this.repo = repo || new OrderRepository();
  }

  async checkEligibility(orderId: string) {
    const order = await this.repo.findOrder(orderId);

    if (order.status !== 'DELIVERED') {
      return { canReview: false, reason: 'NOT_DELIVERED' };
    }

    return { canReview: true };
  }
}
// Run: ✅ PASSES

// 🔵 REFACTOR: Extract constants
export class ReviewEligibilityService {
  private readonly ELIGIBLE_STATUS = 'DELIVERED';

  constructor(private repo?: OrderRepository) {
    this.repo = repo || new OrderRepository();
  }

  async checkEligibility(orderId: string): Promise<EligibilityResult> {
    const order = await this.repo.findOrder(orderId);

    if (order.status !== this.ELIGIBLE_STATUS) {
      return {
        canReview: false,
        reason: 'NOT_DELIVERED' as EligibilityReason
      };
    }

    return { canReview: true };
  }
}
// Run: ✅ STILL PASSES

// ========== CYCLE 3: Add time window check ==========

// 🔴 RED: Test for expired review window
it('prevents review after 90 days', async () => {
  const mockRepo = {
    findOrder: jest.fn().mockResolvedValue({
      status: 'DELIVERED',
      deliveredAt: '2024-01-01T00:00:00Z'
    })
  };

  vi.setSystemTime(new Date('2024-05-01T00:00:00Z')); // 120 days later

  const service = new ReviewEligibilityService(mockRepo);
  const result = await service.checkEligibility('order-1');

  expect(result.canReview).toBe(false);
  expect(result.reason).toBe('TIME_EXPIRED');
});
// Run: ❌ FAILS - time check not implemented

// 🟢 GREEN: Add time window logic
export class ReviewEligibilityService {
  private readonly ELIGIBLE_STATUS = 'DELIVERED';
  private readonly REVIEW_WINDOW_DAYS = 90;

  constructor(private repo?: OrderRepository) {
    this.repo = repo || new OrderRepository();
  }

  async checkEligibility(orderId: string): Promise<EligibilityResult> {
    const order = await this.repo.findOrder(orderId);

    if (order.status !== this.ELIGIBLE_STATUS) {
      return {
        canReview: false,
        reason: 'NOT_DELIVERED'
      };
    }

    const daysSinceDelivery = this.calculateDaysSince(order.deliveredAt);

    if (daysSinceDelivery > this.REVIEW_WINDOW_DAYS) {
      return {
        canReview: false,
        reason: 'TIME_EXPIRED'
      };
    }

    return {
      canReview: true,
      daysRemaining: this.REVIEW_WINDOW_DAYS - daysSinceDelivery
    };
  }

  private calculateDaysSince(date: string): number {
    const then = new Date(date).getTime();
    const now = Date.now();
    return Math.floor((now - then) / (1000 * 60 * 60 * 24));
  }
}
// Run: ✅ PASSES

// Continue cycles for:
// - Already reviewed check
// - Disputed order check
// - Group order handling
// - Edge cases
```

---

## Integration with Story Workflow

### 1. Story Validation Phase
- Validator checks for TDD section in story
- Ensures testability requirements are specified
- Flags stories without TDD guidance

### 2. Implementation Phase
- Dev agent follows TDD workflow
- Commits show RED-GREEN-REFACTOR cycle
- Test files created before implementation files

### 3. QA Review Phase
- Verify tests were written first (check commit history)
- Run test coverage analysis
- Validate all ACs have test coverage
- Check for untested edge cases

---

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Mocking](https://jestjs.io/docs/mock-functions)

### Books & Articles
- "Test Driven Development" by Kent Beck
- "Growing Object-Oriented Software, Guided by Tests" by Freeman & Pryce
- "Refactoring" by Martin Fowler

### Project-Specific
- Story 4.4 QA Report (testability lessons)
- Story 4.5 TDD Section (example implementation)
- `.bmad-core/practices/tdd-implementation-guide.md` (this document)

---

## Enforcement

### Automated Checks
```yaml
# .github/workflows/tdd-check.yml
- name: Check test coverage
  run: |
    coverage=$(pnpm test:coverage --json | jq '.total.statements.pct')
    if [ $coverage -lt 60 ]; then
      echo "Coverage too low: $coverage%"
      exit 1
    fi

- name: Check tests exist
  run: |
    for file in $(git diff --name-only HEAD~1 | grep -E '\.(ts|tsx)$' | grep -v test); do
      testfile="${file%.*}.test.${file##*.}"
      if [ ! -f "$testfile" ]; then
        echo "Missing test for $file"
        exit 1
      fi
    done
```

### Manual Review
- Code reviews must verify TDD was followed
- Check commit history for test-first approach
- Validate test quality, not just presence

---

## Summary

**TDD is not optional. It is the standard.**

Every story, every feature, every bug fix - all must follow TDD.

The pattern is simple:
1. 🔴 Test fails
2. 🟢 Code passes
3. 🔵 Refactor
4. ↻ Repeat

This discipline results in:
- Better design
- Fewer bugs
- Higher confidence
- Easier maintenance
- Happier developers

**Start with tests. Always.**

---

*Last Updated: 2025-10-15*
*Version: 1.0*
*Owner: Engineering Team*
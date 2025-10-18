<!-- 4b6fefd4-a585-45cb-9fe6-03d72f55759e 8e913c83-f9d3-492c-96af-d14f9b890e24 -->
# Fix Chat Messages Network Error

## Problem

Chat tab shows error: "Failed to load messages: TypeError: NetworkError when attempting to fetch resource"

## Root Cause Analysis

The network error could be caused by several issues:

1. **Authentication**: Browser may not be sending auth cookies properly
2. **Order doesn't exist**: The order ID might not be in the database
3. **API route not loading**: Hot reload issue or route not registered
4. **CORS/Fetch configuration**: Missing credentials in fetch request

## Diagnostic Steps

### 1. Check Browser Network Tab

Look at the actual HTTP request to `/api/orders/[id]/messages`:

- What status code is returned? (401, 404, 500?)
- Are cookies being sent?
- What's the actual error response?

### 2. Verify Order Exists

Check if the order ID being accessed actually exists in the database.

### 3. Test API Route Directly

Try accessing the API route directly in browser to see if it works.

## Solution

### Fix 1: Add Credentials to Fetch Requests

**File:** `sew4mi/apps/web/components/features/orders/OrderChat.tsx`

The fetch requests need to include credentials to send authentication cookies:

**Line 211** (loadMessages function):

```typescript
// Before
const response = await fetch(`/api/orders/${orderId}/messages`);

// After
const response = await fetch(`/api/orders/${orderId}/messages`, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
});
```

**Line 237** (markMessagesAsRead function):

```typescript
// Before
await fetch(`/api/orders/${orderId}/messages/mark-read`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
});

// After
await fetch(`/api/orders/${orderId}/messages/mark-read`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
});
```

**Line ~250** (handleSendMessage function):

Add credentials to the send message fetch as well.

### Fix 2: Improve Error Messages

Update the error handling to show more details:

```typescript
// In loadMessages
catch (error) {
  console.error('Failed to load messages:', error);
  const errorMessage = error instanceof Error 
    ? `Failed to load chat messages: ${error.message}`
    : 'Failed to load chat messages';
  setError(errorMessage);
}
```

### Fix 3: Add Fallback for Missing Order

If the order doesn't exist, show a helpful message:

```typescript
if (!response.ok) {
  if (response.status === 404) {
    throw new Error('Order not found');
  } else if (response.status === 401) {
    throw new Error('Please log in to view messages');
  } else {
    throw new Error(`Server error: ${response.status}`);
  }
}
```

## Verification Steps

After applying fixes:

1. **Clear browser cache** and refresh
2. **Check browser console** for detailed error logs
3. **Open Network tab** and verify:

   - Request includes cookies
   - Status code is 200
   - Response contains messages array

4. **Test both roles**:

   - As customer viewing their order
   - As tailor viewing assigned order

## Expected Behavior After Fix

- ✅ Chat loads without network errors
- ✅ Messages display if any exist
- ✅ Empty state shows if no messages
- ✅ Authentication cookies sent with requests
- ✅ Proper error messages for different failure scenarios

## Files to Modify

1. `sew4mi/apps/web/components/features/orders/OrderChat.tsx`

   - Add `credentials: 'include'` to fetch calls
   - Improve error handling
   - Add better error messages
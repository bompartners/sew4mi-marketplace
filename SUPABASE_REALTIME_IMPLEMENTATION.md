# Real-time Order Tracking Implementation - Supabase Realtime

## Overview

This document describes the Supabase Realtime implementation for real-time order tracking and messaging, replacing the previous WebSocket approach. This implementation provides:

1. **Real-time order updates** - Automatic updates when order status, milestones, or details change
2. **Real-time chat messages** - Instant message delivery between customers and tailors
3. **Typing indicators** - Shows when the other party is typing
4. **Read receipts** - Tracks when messages are read
5. **Automatic reconnection** - Built-in connection management by Supabase

## Implementation Components

### 1. Hooks

#### `useRealtimeOrder.ts`

Subscribes to real-time updates for individual orders.

**Features:**
- Monitors order table changes (status, delivery dates, etc.)
- Tracks milestone updates (new milestones, status changes, photo uploads)
- Provides connection status feedback
- Automatic cleanup on unmount

**Usage:**
```tsx
const { isConnected } = useRealtimeOrder({
  orderId: '123',
  onOrderUpdate: (updates) => {
    // Handle order field updates
    setOrder(prev => ({ ...prev, ...updates }));
  },
  onStatusChange: (newStatus) => {
    // Handle status changes specifically
    console.log('New status:', newStatus);
  },
  onMilestoneUpdate: (milestoneId) => {
    // Reload order data to get fresh milestone info
    loadOrder();
  },
  enabled: true
});
```

**Subscription Details:**
- **Table**: `orders`
- **Event**: `UPDATE`
- **Filter**: `id=eq.{orderId}`

- **Table**: `order_milestones`
- **Event**: `*` (INSERT, UPDATE, DELETE)
- **Filter**: `order_id=eq.{orderId}`

#### `useRealtimeOrderMessages.ts`

Subscribes to real-time chat messages for orders.

**Features:**
- Receives new messages instantly
- Tracks message read status
- Sends/receives typing indicators via broadcast
- Provides helper function for typing notifications

**Usage:**
```tsx
const { isConnected, sendTypingIndicator } = useRealtimeOrderMessages({
  orderId: '123',
  userId: 'user-id',
  onNewMessage: (message) => {
    setMessages(prev => [...prev, message]);
  },
  onMessageRead: (messageId, readerId) => {
    // Update message read status
  },
  onTypingIndicator: (userId, isTyping) => {
    // Show/hide typing indicator
  },
  enabled: true
});

// Send typing indicator
sendTypingIndicator(true); // User started typing
sendTypingIndicator(false); // User stopped typing
```

**Subscription Details:**
- **Table**: `order_messages`
- **Event**: `INSERT`
- **Filter**: `order_id=eq.{orderId}`

- **Table**: `order_messages`
- **Event**: `UPDATE`
- **Filter**: `order_id=eq.{orderId}`

- **Broadcast**: `typing` event for typing indicators

### 2. Updated Components

#### `OrderTrackingPage.tsx`

**Changes:**
- Removed WebSocket connection logic (`wsRef`, `reconnectTimeoutRef`, `connectWebSocket`)
- Added `useRealtimeOrder` hook integration
- Simplified initialization logic (no manual connection management)
- Real-time updates trigger automatic order reload

**Benefits:**
- Cleaner code (removed ~60 lines of WebSocket boilerplate)
- Better error handling via Supabase
- Automatic reconnection without manual retry logic
- No console errors when server is not running

#### `OrderChat.tsx`

**Changes:**
- Removed WebSocket connection logic
- Added `useRealtimeOrderMessages` hook integration
- Integrated typing indicator support
- Simplified message state management

**Benefits:**
- Real-time message delivery without custom WebSocket server
- Built-in connection resilience
- Typing indicators via broadcast channel
- Cleaner component code

## Database Setup

### Required Tables

Ensure your Supabase database has these tables with proper RLS policies:

1. **orders** - Main order table
2. **order_milestones** - Order progress milestones
3. **order_messages** - Chat messages

### RLS Policies

Both tables need RLS policies allowing:
- Customers to read/update their own orders
- Tailors to read/update orders assigned to them

Example RLS policy for `orders`:
```sql
-- Customers can view their orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
USING (auth.uid() = customer_id);

-- Tailors can view assigned orders
CREATE POLICY "Tailors can view assigned orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tailor_profiles 
    WHERE tailor_profiles.user_id = auth.uid() 
    AND tailor_profiles.id = orders.tailor_id
  )
);
```

## Supabase Realtime Configuration

### Enable Realtime

In your Supabase dashboard:

1. Go to **Database** → **Replication**
2. Enable replication for:
   - `orders`
   - `order_milestones`
   - `order_messages`

### Enable Broadcast

Broadcast is enabled by default in Supabase projects. No additional configuration needed for typing indicators.

## Testing

### Test Real-time Order Updates

1. Open an order detail page as a customer
2. In another browser/tab, update the order status via Supabase dashboard or tailor interface
3. Verify the customer page updates automatically without refresh

### Test Real-time Messages

1. Open the Chat tab on an order detail page
2. In another browser/tab (or as the tailor), send a message to the same order
3. Verify the message appears instantly without refresh

### Test Typing Indicators

1. Open Chat tab as customer
2. Open same order as tailor in another tab
3. Start typing in one tab
4. Verify typing indicator appears in the other tab

## Benefits Over WebSocket

| Feature | WebSocket (Old) | Supabase Realtime (New) |
|---------|----------------|------------------------|
| Server Setup | Requires separate WebSocket server on port 3001 | No separate server needed |
| Connection Management | Manual reconnection logic with exponential backoff | Built-in reconnection by Supabase |
| Authorization | Custom JWT validation | Uses existing Supabase auth |
| Scaling | Need to scale WebSocket server separately | Scales with Supabase infrastructure |
| Error Handling | Manual error handling and logging | Built-in error states |
| Development | Errors when server not running | Graceful degradation |
| Code Complexity | ~150 lines per component | ~20 lines per component |

## Migration Notes

### Removed Code

- `wsRef` and `reconnectTimeoutRef` refs in components
- `connectWebSocket()` functions
- Manual WebSocket error handling
- Reconnection retry logic

### Added Code

- Two new hooks (`useRealtimeOrder`, `useRealtimeOrderMessages`)
- Import statements for hooks in components
- Hook integration (~10 lines per component)

## Performance Considerations

### Connection Limits

Supabase Realtime has connection limits per project tier:
- **Free tier**: 500 concurrent connections
- **Pro tier**: 1000+ concurrent connections
- **Enterprise**: Custom limits

### Best Practices

1. **Enable only when needed**: Use the `enabled` parameter to conditionally enable subscriptions
2. **Cleanup on unmount**: Hooks automatically clean up subscriptions
3. **Batch updates**: The hooks trigger callbacks which can batch UI updates
4. **Lazy loading**: Only load order details when user navigates to the page

## Troubleshooting

### No Real-time Updates Received

1. **Check Replication**:
   - Verify tables have replication enabled in Supabase dashboard
   
2. **Check RLS Policies**:
   - Ensure user has SELECT permission on the table
   - Test with RLS disabled temporarily to isolate issue

3. **Check Browser Console**:
   - Look for "Realtime subscription status: SUBSCRIBED" log
   - Check for any error messages from Supabase client

### Connection Not Established

1. **Verify Auth**:
   - User must be authenticated
   - Check `supabase.auth.getSession()` returns valid session

2. **Check Network**:
   - Verify Supabase URL is correct in `.env.local`
   - Check browser developer tools → Network tab for WebSocket connections

### Typing Indicators Not Working

1. **Check Broadcast Configuration**:
   - Broadcast should be enabled by default
   - Verify channel name matches between sender and receiver

2. **Check Callbacks**:
   - Ensure `onTypingIndicator` callback is provided
   - Verify `sendTypingIndicator()` is called on input change

## Related Stories

- **Story 2.3**: Real-time Order Tracking
- **Story 3.4**: Order Messaging System
- **Story 4.5**: Customer Reviews (uses similar real-time patterns)

## Future Enhancements

1. **Presence**: Show online/offline status of tailors
2. **Conflict Resolution**: Handle simultaneous edits to orders
3. **Optimistic Updates**: Update UI before server confirmation
4. **Notification Integration**: Trigger push notifications on updates

## References

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Broadcast Documentation](https://supabase.com/docs/guides/realtime/broadcast)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)


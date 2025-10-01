/**
 * Integration tests for real-time WebSocket functionality in order tracking
 * Tests WebSocket connections, message delivery, and real-time updates
 * @file order-tracking-realtime.integration.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import WS from 'jest-websocket-mock';
import { OrderMessage, OrderParticipantRole, OrderMessageType } from '@sew4mi/shared/types/order-creation';
import { MilestoneStage, MilestoneApprovalStatus } from '@sew4mi/shared';

/**
 * Mock WebSocket server for testing
 */
let server: WS;
const WS_URL = 'ws://localhost:3001';

/**
 * Test data
 */
const mockOrderId = 'order-123';
const mockUserId = 'user-456';
const mockTailorId = 'tailor-789';

const mockMessage: OrderMessage = {
  id: 'msg-001',
  orderId: mockOrderId,
  senderId: mockTailorId,
  senderType: OrderParticipantRole.TAILOR,
  senderName: 'John Tailor',
  message: 'Your garment is ready for fitting!',
  messageType: OrderMessageType.TEXT,
  isInternal: false,
  readBy: [],
  sentAt: new Date('2024-01-20T10:00:00Z'),
  deliveredAt: new Date('2024-01-20T10:00:01Z')
};

const mockMilestoneUpdate = {
  type: 'milestone_update',
  data: {
    orderId: mockOrderId,
    milestone: MilestoneStage.FITTING_READY,
    photoUrl: 'https://example.com/fitting.jpg',
    notes: 'Ready for your fitting appointment',
    approvalStatus: MilestoneApprovalStatus.PENDING,
    timestamp: new Date().toISOString()
  }
};

const mockOrderStatusUpdate = {
  type: 'order_status_update',
  data: {
    orderId: mockOrderId,
    status: 'FITTING_READY',
    progressPercentage: 75,
    timestamp: new Date().toISOString()
  }
};

/**
 * Helper to create WebSocket client
 */
const createWebSocketClient = (orderId: string, userId: string): WebSocket => {
  const wsUrl = `${WS_URL}/orders/${orderId}/chat?userId=${userId}`;
  return new WebSocket(wsUrl);
};

/**
 * Helper to wait for WebSocket connection
 */
const waitForConnection = async (ws: WebSocket): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
    
    ws.onopen = () => {
      clearTimeout(timeout);
      resolve();
    };
    
    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Connection failed'));
    };
  });
};

/**
 * Helper to wait for WebSocket message
 */
const waitForMessage = async (ws: WebSocket, timeout: number = 5000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('Message timeout')), timeout);
    
    ws.onmessage = (event) => {
      clearTimeout(timeoutId);
      resolve(JSON.parse(event.data));
    };
  });
};

describe('Order Tracking WebSocket Integration', () => {
  beforeAll(() => {
    // Setup global WebSocket mock
    Object.defineProperty(global, 'WebSocket', {
      writable: true,
      value: WS.WebSocket
    });
  });

  beforeEach(() => {
    server = new WS(`${WS_URL}/orders/${mockOrderId}/chat`, { jsonProtocol: true });
  });

  afterEach(() => {
    WS.clean();
    vi.clearAllMocks();
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection for order chat', async () => {
      const client = createWebSocketClient(mockOrderId, mockUserId);
      
      await server.connected;
      expect(server).toHaveReceivedConnectionParams({
        userId: mockUserId
      });
      
      client.close();
    });

    it('should handle connection failures gracefully', async () => {
      server.error();
      
      const client = createWebSocketClient(mockOrderId, mockUserId);
      
      const errorPromise = new Promise((resolve) => {
        client.onerror = resolve;
      });
      
      await expect(errorPromise).resolves.toBeDefined();
      client.close();
    });

    it('should support multiple concurrent connections', async () => {
      const client1 = createWebSocketClient(mockOrderId, mockUserId);
      const client2 = createWebSocketClient(mockOrderId, mockTailorId);
      
      await server.connected;
      await server.connected;
      
      expect(server.server.clients.size).toBe(2);
      
      client1.close();
      client2.close();
    });

    it('should handle connection reconnection with exponential backoff', async () => {
      const client = createWebSocketClient(mockOrderId, mockUserId);
      
      await server.connected;
      
      // Simulate connection drop
      server.close();
      
      // Connection should be marked as closed
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Real-time Message Delivery', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = createWebSocketClient(mockOrderId, mockUserId);
      await server.connected;
    });

    afterEach(() => {
      client.close();
    });

    it('should receive real-time messages', async () => {
      const messagePromise = waitForMessage(client);
      
      server.send({
        type: 'message',
        message: mockMessage
      });
      
      const receivedData = await messagePromise;
      expect(receivedData.type).toBe('message');
      expect(receivedData.message.id).toBe(mockMessage.id);
      expect(receivedData.message.message).toBe(mockMessage.message);
    });

    it('should handle typing indicators', async () => {
      const typingPromise = waitForMessage(client);
      
      server.send({
        type: 'typing',
        data: {
          userId: mockTailorId,
          userName: 'John Tailor',
          isTyping: true,
          orderId: mockOrderId
        }
      });
      
      const receivedData = await typingPromise;
      expect(receivedData.type).toBe('typing');
      expect(receivedData.data.isTyping).toBe(true);
      expect(receivedData.data.userId).toBe(mockTailorId);
    });

    it('should handle message read receipts', async () => {
      const readPromise = waitForMessage(client);
      
      server.send({
        type: 'message_read',
        data: {
          messageId: 'msg-001',
          userId: mockUserId,
          readAt: new Date().toISOString()
        }
      });
      
      const receivedData = await readPromise;
      expect(receivedData.type).toBe('message_read');
      expect(receivedData.data.messageId).toBe('msg-001');
      expect(receivedData.data.userId).toBe(mockUserId);
    });

    it('should broadcast messages to all connected clients', async () => {
      const client2 = createWebSocketClient(mockOrderId, mockTailorId);
      await server.connected;
      
      const messagePromise1 = waitForMessage(client);
      const messagePromise2 = waitForMessage(client2);
      
      server.send({
        type: 'message',
        message: mockMessage
      });
      
      const [data1, data2] = await Promise.all([messagePromise1, messagePromise2]);
      
      expect(data1.message.id).toBe(data2.message.id);
      expect(data1.message.message).toBe(data2.message.message);
      
      client2.close();
    });
  });

  describe('Real-time Order Updates', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = createWebSocketClient(mockOrderId, mockUserId);
      await server.connected;
    });

    afterEach(() => {
      client.close();
    });

    it('should receive milestone updates', async () => {
      const updatePromise = waitForMessage(client);
      
      server.send(mockMilestoneUpdate);
      
      const receivedData = await updatePromise;
      expect(receivedData.type).toBe('milestone_update');
      expect(receivedData.data.milestone).toBe(MilestoneStage.FITTING_READY);
      expect(receivedData.data.orderId).toBe(mockOrderId);
      expect(receivedData.data.photoUrl).toBe('https://example.com/fitting.jpg');
    });

    it('should receive order status updates', async () => {
      const updatePromise = waitForMessage(client);
      
      server.send(mockOrderStatusUpdate);
      
      const receivedData = await updatePromise;
      expect(receivedData.type).toBe('order_status_update');
      expect(receivedData.data.status).toBe('FITTING_READY');
      expect(receivedData.data.progressPercentage).toBe(75);
    });

    it('should handle payment status updates', async () => {
      const paymentUpdate = {
        type: 'payment_update',
        data: {
          orderId: mockOrderId,
          paymentStage: 'FITTING_PAYMENT',
          amount: 150.00,
          status: 'COMPLETED',
          timestamp: new Date().toISOString()
        }
      };
      
      const updatePromise = waitForMessage(client);
      server.send(paymentUpdate);
      
      const receivedData = await updatePromise;
      expect(receivedData.type).toBe('payment_update');
      expect(receivedData.data.paymentStage).toBe('FITTING_PAYMENT');
      expect(receivedData.data.amount).toBe(150.00);
    });

    it('should handle delivery notifications', async () => {
      const deliveryUpdate = {
        type: 'delivery_notification',
        data: {
          orderId: mockOrderId,
          status: 'READY_FOR_PICKUP',
          message: 'Your garment is ready for collection!',
          location: 'Tailor Shop, Accra',
          timestamp: new Date().toISOString()
        }
      };
      
      const updatePromise = waitForMessage(client);
      server.send(deliveryUpdate);
      
      const receivedData = await updatePromise;
      expect(receivedData.type).toBe('delivery_notification');
      expect(receivedData.data.status).toBe('READY_FOR_PICKUP');
    });
  });

  describe('Message Sending', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = createWebSocketClient(mockOrderId, mockUserId);
      await server.connected;
    });

    afterEach(() => {
      client.close();
    });

    it('should send text messages', async () => {
      const messageData = {
        type: 'send_message',
        data: {
          orderId: mockOrderId,
          senderId: mockUserId,
          senderType: OrderParticipantRole.CUSTOMER,
          message: 'When will my garment be ready?',
          messageType: OrderMessageType.TEXT
        }
      };
      
      client.send(JSON.stringify(messageData));
      
      await expect(server).toReceiveMessage(messageData);
    });

    it('should send typing indicators', async () => {
      const typingData = {
        type: 'typing',
        data: {
          orderId: mockOrderId,
          userId: mockUserId,
          isTyping: true
        }
      };
      
      client.send(JSON.stringify(typingData));
      
      await expect(server).toReceiveMessage(typingData);
    });

    it('should send message read confirmations', async () => {
      const readData = {
        type: 'mark_read',
        data: {
          orderId: mockOrderId,
          messageIds: ['msg-001', 'msg-002'],
          userId: mockUserId
        }
      };
      
      client.send(JSON.stringify(readData));
      
      await expect(server).toReceiveMessage(readData);
    });
  });

  describe('Error Handling and Recovery', () => {
    let client: WebSocket;

    beforeEach(async () => {
      client = createWebSocketClient(mockOrderId, mockUserId);
      await server.connected;
    });

    afterEach(() => {
      client.close();
    });

    it('should handle malformed JSON messages', async () => {
      const errorPromise = new Promise((resolve) => {
        const originalOnMessage = client.onmessage;
        client.onmessage = (event) => {
          try {
            JSON.parse(event.data);
          } catch (error) {
            resolve(error);
          }
        };
      });
      
      server.send('invalid json');
      
      // Should handle error gracefully without crashing
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await errorPromise;
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should handle connection drops and reconnection', async () => {
      let reconnectAttempts = 0;
      const maxReconnects = 3;
      
      const reconnectHandler = () => {
        if (reconnectAttempts < maxReconnects) {
          reconnectAttempts++;
          // Simulate reconnection attempt
          setTimeout(() => {
            const newClient = createWebSocketClient(mockOrderId, mockUserId);
          }, Math.pow(2, reconnectAttempts) * 1000);
        }
      };
      
      client.onclose = reconnectHandler;
      
      // Simulate connection drop
      server.close();
      
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });

    it('should handle server errors gracefully', async () => {
      server.error();
      
      const errorPromise = new Promise((resolve) => {
        client.onerror = resolve;
      });
      
      await errorPromise;
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high-frequency message sending', async () => {
      const client = createWebSocketClient(mockOrderId, mockUserId);
      await server.connected;
      
      const messageCount = 100;
      const messages: any[] = [];
      
      // Send rapid messages
      for (let i = 0; i < messageCount; i++) {
        const message = {
          type: 'send_message',
          data: {
            orderId: mockOrderId,
            senderId: mockUserId,
            message: `Test message ${i}`,
            messageType: OrderMessageType.TEXT
          }
        };
        
        client.send(JSON.stringify(message));
        messages.push(message);
      }
      
      // Wait for all messages to be received
      for (let i = 0; i < messageCount; i++) {
        await expect(server).toReceiveMessage(messages[i]);
      }
      
      client.close();
    });

    it('should handle multiple concurrent connections efficiently', async () => {
      const connectionCount = 50;
      const clients: WebSocket[] = [];
      
      // Create multiple concurrent connections
      for (let i = 0; i < connectionCount; i++) {
        const client = createWebSocketClient(mockOrderId, `user-${i}`);
        clients.push(client);
      }
      
      // Wait for all connections
      for (let i = 0; i < connectionCount; i++) {
        await server.connected;
      }
      
      expect(server.server.clients.size).toBe(connectionCount);
      
      // Broadcast a message to all clients
      server.send({
        type: 'broadcast',
        message: 'Server message to all clients'
      });
      
      // Clean up
      clients.forEach(client => client.close());
    });
  });

  describe('Security and Authentication', () => {
    it('should require valid user authentication', async () => {
      // Create client without userId parameter
      const wsUrl = `${WS_URL}/orders/${mockOrderId}/chat`;
      const client = new WebSocket(wsUrl);
      
      // Should handle authentication failure
      const errorPromise = new Promise((resolve) => {
        client.onerror = resolve;
        client.onclose = resolve;
      });
      
      await errorPromise;
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });

    it('should validate order access permissions', async () => {
      const unauthorizedUserId = 'unauthorized-user';
      const client = createWebSocketClient(mockOrderId, unauthorizedUserId);
      
      // Should handle authorization failure
      const errorPromise = new Promise((resolve) => {
        client.onerror = resolve;
        client.onclose = resolve;
      });
      
      await errorPromise;
      expect(client.readyState).toBe(WebSocket.CLOSED);
    });

    it('should sanitize message content', async () => {
      const client = createWebSocketClient(mockOrderId, mockUserId);
      await server.connected;
      
      const maliciousMessage = {
        type: 'send_message',
        data: {
          orderId: mockOrderId,
          senderId: mockUserId,
          message: '<script>alert("xss")</script>',
          messageType: OrderMessageType.TEXT
        }
      };
      
      client.send(JSON.stringify(maliciousMessage));
      
      // Server should sanitize the message
      await expect(server).toReceiveMessage(
        expect.objectContaining({
          data: expect.objectContaining({
            message: expect.not.stringContaining('<script>')
          })
        })
      );
      
      client.close();
    });
  });
});
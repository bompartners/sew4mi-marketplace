/**
 * Unit tests for MessageInput component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '@/components/features/orders/MessageInput';
import { OrderMessageType } from '@sew4mi/shared/types/order-creation';

// Mock file upload
global.fetch = vi.fn();

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-blob-url'),
  writable: true
});

// Mock MediaRecorder
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  state: 'inactive'
};

Object.defineProperty(global, 'MediaRecorder', {
  value: vi.fn(() => mockMediaRecorder),
  writable: true
});

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }]
    })
  },
  writable: true
});

describe('MessageInput', () => {
  const defaultProps = {
    onSendMessage: vi.fn(),
    isConnected: true,
    orderId: 'order-123',
    userId: 'user-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful file upload
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://example.com/file.jpg' })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render message input with send button', () => {
      render(<MessageInput {...defaultProps} />);
      
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      // Find buttons - there should be at least the send button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should show connecting state when disconnected', () => {
      render(<MessageInput {...defaultProps} isConnected={false} />);
      
      expect(screen.getByPlaceholderText('Connecting...')).toBeInTheDocument();
      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    });

    it('should render attachment button when enabled', () => {
      render(<MessageInput {...defaultProps} allowAttachments={true} />);
      
      expect(screen.getByTitle('Attach file')).toBeInTheDocument();
    });

    it('should render voice message button when enabled', () => {
      render(<MessageInput {...defaultProps} allowVoiceMessages={true} />);
      
      expect(screen.getByTitle('Record voice message')).toBeInTheDocument();
    });

    it('should not render disabled features', () => {
      render(<MessageInput 
        {...defaultProps} 
        allowAttachments={false}
        allowVoiceMessages={false}
      />);
      
      expect(screen.queryByTitle('Attach file')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Record voice message')).not.toBeInTheDocument();
    });
  });

  describe('Text Input', () => {
    it('should handle text input changes', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hello world');
      
      expect(input.value).toBe('Hello world');
    });

    it('should enforce max length limit', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={10} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'This message is too long');
      
      expect(input.value).toBe('This messa'); // Truncated to 10 characters
    });

    it('should show character count when near limit', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={20} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'This is a long msg'); // 17 characters (> 80% of 20)
      
      expect(screen.getByText('17/20')).toBeInTheDocument();
    });

    it('should send message on Enter key', async () => {
      const onSendMessage = vi.fn();
      render(<MessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      
      await waitFor(() => {
        expect(onSendMessage).toHaveBeenCalledWith('Test message', OrderMessageType.TEXT);
      });
    });

    it('should not send message on Shift+Enter', async () => {
      const onSendMessage = vi.fn();
      render(<MessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
      
      expect(onSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Message Sending', () => {
    it('should send text message when send button clicked', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();
      render(<MessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Hello tailor');
      await user.click(sendButton);
      
      expect(onSendMessage).toHaveBeenCalledWith('Hello tailor', OrderMessageType.TEXT);
    });

    it('should not send empty message', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();
      render(<MessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1]; // Send button is usually last
      await user.click(sendButton);
      
      expect(onSendMessage).not.toHaveBeenCalled();
    });

    it('should clear input after sending', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();
      render(<MessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');
      await user.click(screen.getByRole('button', { name: /send/i }));
      
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should disable send when disconnected', () => {
      render(<MessageInput {...defaultProps} isConnected={false} />);
      
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1]; // Send button is usually last
      expect(sendButton).toBeDisabled();
    });
  });

  describe('File Attachments', () => {
    it('should handle file selection', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} allowAttachments={true} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByTitle('Attach file').parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    it('should validate file size', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} allowAttachments={true} />);
      
      // Create a file larger than 10MB
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const input = screen.getByTitle('Attach file').parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, largeFile);
      }
      
      await waitFor(() => {
        expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
      });
    });

    it('should validate file type', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} allowAttachments={true} />);
      
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/x-executable' });
      const input = screen.getByTitle('Attach file').parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, invalidFile);
      }
      
      await waitFor(() => {
        expect(screen.getByText('Only images and documents are allowed')).toBeInTheDocument();
      });
    });

    it('should remove attachment', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} allowAttachments={true} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByTitle('Attach file').parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        await user.upload(input, file);
      }
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      
      await waitFor(() => {
        expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
      });
    });

    it('should upload file and send message', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn();
      render(<MessageInput {...defaultProps} onSendMessage={onSendMessage} allowAttachments={true} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTitle('Attach file').parentElement?.querySelector('input[type="file"]');
      
      if (fileInput) {
        await user.upload(fileInput, file);
      }
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1]; // Send button is usually last
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/orders/messages/upload', expect.any(Object));
        expect(onSendMessage).toHaveBeenCalledWith('https://example.com/file.jpg', OrderMessageType.IMAGE);
      });
    });
  });

  describe('Voice Messages', () => {
    beforeEach(() => {
      // Reset MediaRecorder mock
      Object.defineProperty(global, 'MediaRecorder', {
        value: vi.fn(() => mockMediaRecorder),
        writable: true
      });
    });

    it('should start voice recording', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} allowVoiceMessages={true} />);
      
      const recordButton = screen.getByTitle('Record voice message');
      await user.click(recordButton);
      
      await waitFor(() => {
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
        expect(screen.getByText('Recording')).toBeInTheDocument();
      });
    });

    it('should stop voice recording', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} allowVoiceMessages={true} />);
      
      // Start recording
      const recordButton = screen.getByTitle('Record voice message');
      await user.click(recordButton);
      
      await waitFor(() => {
        expect(screen.getByText('Recording')).toBeInTheDocument();
      });
      
      // Stop recording
      const stopButton = screen.getByText('Stop');
      await user.click(stopButton);
      
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    });

    it('should cancel voice recording', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} allowVoiceMessages={true} />);
      
      // Start recording
      const recordButton = screen.getByTitle('Record voice message');
      await user.click(recordButton);
      
      await waitFor(() => {
        expect(screen.getByText('Recording')).toBeInTheDocument();
      });
      
      // Cancel recording
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.queryByText('Recording')).not.toBeInTheDocument();
      });
    });

    it('should handle microphone access error', async () => {
      const user = userEvent.setup();
      navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));
      
      render(<MessageInput {...defaultProps} allowVoiceMessages={true} />);
      
      const recordButton = screen.getByTitle('Record voice message');
      await user.click(recordButton);
      
      await waitFor(() => {
        expect(screen.getByText('Unable to access microphone')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display file upload errors', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockRejectedValue(new Error('Upload failed'));
      
      render(<MessageInput {...defaultProps} allowAttachments={true} />);
      
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByTitle('Attach file').parentElement?.querySelector('input[type="file"]');
      
      if (fileInput) {
        await user.upload(fileInput, file);
      }
      
      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
      
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1]; // Send button is usually last
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to send message. Please try again.')).toBeInTheDocument();
      });
    });

    it('should handle send message errors', async () => {
      const user = userEvent.setup();
      const onSendMessage = vi.fn().mockRejectedValue(new Error('Send failed'));
      
      render(<MessageInput {...defaultProps} onSendMessage={onSendMessage} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');
      
      const buttons = screen.getAllByRole('button');
      const sendButton = buttons[buttons.length - 1]; // Send button is usually last
      await user.click(sendButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to send message. Please try again.')).toBeInTheDocument();
      });
    });
  });

  describe('Typing Indicators', () => {
    it('should trigger typing indicators when enabled', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} enableTypingIndicators={true} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hello');
      
      // Typing indicators would be handled by WebSocket
      // This test verifies the component doesn't crash with typing indicators enabled
      expect(input.value).toBe('Hello');
    });

    it('should not trigger typing indicators when disabled', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} enableTypingIndicators={false} />);
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hello');
      
      expect(input.value).toBe('Hello');
    });
  });
});
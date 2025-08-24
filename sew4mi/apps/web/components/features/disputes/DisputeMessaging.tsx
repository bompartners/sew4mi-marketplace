/**
 * DisputeMessaging component for three-way communication
 * Features real-time messaging between customer, tailor, and admin
 * @file DisputeMessaging.tsx
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  MessageSquare, 
  Clock, 
  User, 
  Shield, 
  Hammer,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Message interface
 */
interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderRole: 'customer' | 'tailor' | 'admin';
  senderName: string;
  message: string;
  sentAt: Date;
  readBy: string[];
  isInternal: boolean; // Admin-only internal notes
}

/**
 * User role interface
 */
interface UserRole {
  id: string;
  name: string;
  role: 'customer' | 'tailor' | 'admin';
  isOnline?: boolean;
}

/**
 * Props for DisputeMessaging component
 */
interface DisputeMessagingProps {
  /** Dispute ID for message organization */
  disputeId: string;
  /** Current user information */
  currentUser: UserRole;
  /** Other participants in the dispute */
  participants: UserRole[];
  /** Existing messages */
  messages?: DisputeMessage[];
  /** Callback when new message is sent */
  onMessageSent?: (message: Omit<DisputeMessage, 'id' | 'sentAt' | 'readBy'>) => void;
  /** Callback when messages are marked as read */
  onMessagesRead?: (messageIds: string[]) => void;
  /** Whether component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Role configuration
 */
const ROLE_CONFIG = {
  customer: {
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Customer'
  },
  tailor: {
    icon: Hammer,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Tailor'
  },
  admin: {
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Admin'
  }
};

/**
 * DisputeMessaging Component
 * Provides three-way messaging interface for dispute resolution
 */
export function DisputeMessaging({
  disputeId,
  currentUser,
  participants,
  messages = [],
  onMessageSent,
  onMessagesRead,
  disabled = false,
  className
}: DisputeMessagingProps) {
  // State management
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Scrolls to bottom of messages
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /**
   * Formats timestamp for display
   */
  const formatTimestamp = useCallback((date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }, []);

  /**
   * Gets user role configuration
   */
  const getRoleConfig = useCallback((role: UserRole['role']) => {
    return ROLE_CONFIG[role];
  }, []);

  /**
   * Checks if message is from current user
   */
  const isCurrentUserMessage = useCallback((message: DisputeMessage): boolean => {
    return message.senderId === currentUser.id;
  }, [currentUser.id]);

  /**
   * Checks if message is unread by current user
   */
  const isUnreadMessage = useCallback((message: DisputeMessage): boolean => {
    return !message.readBy.includes(currentUser.id) && !isCurrentUserMessage(message);
  }, [currentUser.id, isCurrentUserMessage]);

  /**
   * Handles message submission
   */
  const handleSendMessage = useCallback(async () => {
    const messageText = newMessage.trim();
    if (!messageText || isSending) {
      return;
    }

    // Validate message length
    if (messageText.length > 1000) {
      return;
    }

    setIsSending(true);

    try {
      const messageData = {
        disputeId,
        senderId: currentUser.id,
        senderRole: currentUser.role,
        senderName: currentUser.name,
        message: messageText,
        isInternal: isInternalNote && currentUser.role === 'admin'
      };

      // Call parent callback
      onMessageSent?.(messageData);

      // Clear form
      setNewMessage('');
      setIsInternalNote(false);
      textareaRef.current?.focus();

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isSending, disputeId, currentUser, isInternalNote, onMessageSent]);

  /**
   * Handles keyboard shortcuts
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  /**
   * Marks messages as read
   */
  const markMessagesAsRead = useCallback(() => {
    const unreadMessageIds = messages
      .filter(isUnreadMessage)
      .map(message => message.id);

    if (unreadMessageIds.length > 0) {
      onMessagesRead?.(unreadMessageIds);
    }
  }, [messages, isUnreadMessage, onMessagesRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Mark messages as read when component becomes visible
  useEffect(() => {
    if (isExpanded) {
      const timer = setTimeout(markMessagesAsRead, 1000);
      return () => clearTimeout(timer);
    }
  }, [isExpanded, markMessagesAsRead]);

  // Calculate unread count
  const unreadCount = messages.filter(isUnreadMessage).length;

  // Filter messages based on current user role
  const visibleMessages = messages.filter(message => {
    // Admin can see all messages including internal notes
    if (currentUser.role === 'admin') {
      return true;
    }
    
    // Customer and tailor cannot see internal admin notes
    return !message.isInternal;
  });

  return (
    <div className={cn('border rounded-lg bg-white', className)}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium">Dispute Messages</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unreadCount} new
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Participant Avatars */}
          <div className="flex -space-x-2">
            {participants.map((participant) => {
              const roleConfig = getRoleConfig(participant.role);
              const Icon = roleConfig.icon;
              
              return (
                <Avatar key={participant.id} className="h-6 w-6 border-2 border-white">
                  <AvatarFallback className={cn('text-xs', roleConfig.color, roleConfig.bgColor)}>
                    <Icon className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
              );
            })}
          </div>
          
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Messages Area */}
      {isExpanded && (
        <div className="flex flex-col h-96">
          {/* Messages List */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {visibleMessages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                visibleMessages.map((message) => {
                  const roleConfig = getRoleConfig(message.senderRole);
                  const Icon = roleConfig.icon;
                  const isCurrentUser = isCurrentUserMessage(message);
                  const isUnread = isUnreadMessage(message);

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={cn(roleConfig.color, roleConfig.bgColor)}>
                          <Icon className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>

                      {/* Message Content */}
                      <div className={cn(
                        'flex-1 max-w-xs md:max-w-md',
                        isCurrentUser ? 'text-right' : 'text-left'
                      )}>
                        {/* Sender Info */}
                        <div className={cn(
                          'flex items-center gap-2 mb-1',
                          isCurrentUser ? 'justify-end' : 'justify-start'
                        )}>
                          <span className="text-sm font-medium text-gray-900">
                            {isCurrentUser ? 'You' : message.senderName}
                          </span>
                          <Badge variant="outline" className={cn('text-xs', roleConfig.color)}>
                            {roleConfig.label}
                          </Badge>
                          {message.isInternal && (
                            <Badge variant="secondary" className="text-xs">
                              Internal
                            </Badge>
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div className={cn(
                          'rounded-lg px-3 py-2 break-words',
                          isCurrentUser 
                            ? 'bg-primary text-primary-foreground ml-auto'
                            : cn(roleConfig.bgColor, roleConfig.borderColor, 'border'),
                          isUnread && 'ring-2 ring-blue-200 ring-opacity-50',
                          message.isInternal && 'bg-yellow-50 border-yellow-200'
                        )}>
                          <p className="text-sm">{message.message}</p>
                        </div>

                        {/* Timestamp */}
                        <div className={cn(
                          'flex items-center gap-1 mt-1 text-xs text-gray-500',
                          isCurrentUser ? 'justify-end' : 'justify-start'
                        )}>
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(message.sentAt)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4 space-y-3">
            {/* Admin Internal Note Toggle */}
            {currentUser.role === 'admin' && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="internal-note"
                  checked={isInternalNote}
                  onChange={(e) => setIsInternalNote(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="internal-note" className="text-sm text-gray-600">
                  Internal admin note (not visible to customer/tailor)
                </label>
              </div>
            )}

            {/* Message Input */}
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isInternalNote 
                    ? "Add internal note..."
                    : "Type your message... (Ctrl+Enter to send)"
                }
                rows={2}
                maxLength={1000}
                disabled={disabled || isSending}
                className="flex-1 resize-none"
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={disabled || isSending || !newMessage.trim()}
                size="sm"
                className="self-end"
              >
                {isSending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Character Count */}
            <div className="text-xs text-gray-500 text-right">
              {newMessage.length}/1000 characters
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisputeMessaging;
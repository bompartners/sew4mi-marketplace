/**
 * MessageList component for displaying order messages
 * Features real-time updates, typing indicators, and message status
 * @file MessageList.tsx
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Download, Play, Pause, FileText, Image as ImageIcon, Volume2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OrderMessage, OrderParticipantRole, OrderMessageType } from '@sew4mi/shared/types/order-creation';

/**
 * Props for MessageList component
 */
interface MessageListProps {
  /** Messages to display */
  messages: OrderMessage[];
  /** Current user ID */
  currentUserId: string;
  /** Whether messages are loading */
  isLoading?: boolean;
  /** Whether connection is active */
  isConnected?: boolean;
  /** Typing indicator data */
  typingUsers?: { userId: string; name: string; avatar?: string }[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Message bubble component
 */
interface MessageBubbleProps {
  message: OrderMessage;
  isOwn: boolean;
  showAvatar: boolean;
  showTimestamp: boolean;
  currentUserId: string;
}

/**
 * Audio player state
 */
interface AudioState {
  [messageId: string]: {
    isPlaying: boolean;
    duration: number;
    currentTime: number;
  };
}

/**
 * Format message timestamp
 */
const formatMessageTime = (timestamp: Date | string): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  } else {
    return format(date, 'MMM d, h:mm a');
  }
};

/**
 * Format message date header
 */
const formatDateHeader = (timestamp: Date | string): string => {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return 'Today';
  } else if (isYesterday(date)) {
    return 'Yesterday';
  } else {
    return format(date, 'MMMM d, yyyy');
  }
};

/**
 * Audio Message Component
 */
function AudioMessage({ 
  message, 
  isOwn, 
  audioState, 
  onPlayToggle 
}: { 
  message: OrderMessage;
  isOwn: boolean;
  audioState?: AudioState[string];
  onPlayToggle: (messageId: string) => void;
}) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg max-w-xs">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onPlayToggle(message.id!)}
        className="h-8 w-8 p-0"
      >
        {audioState?.isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      
      <div className="flex-1 min-w-0">
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full transition-all duration-300',
              isOwn ? 'bg-blue-600' : 'bg-gray-600'
            )}
            style={{ 
              width: audioState?.duration 
                ? `${(audioState.currentTime / audioState.duration) * 100}%` 
                : '0%' 
            }}
          />
        </div>
      </div>
      
      <Volume2 className="h-3 w-3 text-gray-400" />
      
      <span className="text-xs text-gray-500 tabular-nums">
        {audioState?.duration ? formatTime(audioState.currentTime) : '0:00'}
      </span>
    </div>
  );
}

/**
 * Image Message Component
 */
function ImageMessage({ message }: { message: OrderMessage }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="max-w-sm">
      {error ? (
        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
          <ImageIcon className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">Image unavailable</span>
        </div>
      ) : (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}
          <img
            src={message.mediaUrl || message.message}
            alt="Shared image"
            className={cn(
              'max-w-full h-auto rounded-lg transition-opacity',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setError(true);
              setIsLoading(false);
            }}
            onClick={() => {
              // Open in modal/full screen
              window.open(message.mediaUrl || message.message, '_blank');
            }}
            style={{ cursor: 'pointer' }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Document Message Component
 */
function DocumentMessage({ message }: { message: OrderMessage }) {
  const getFileName = (url: string) => {
    try {
      return decodeURIComponent(url.split('/').pop() || 'document');
    } catch {
      return 'document';
    }
  };

  const handleDownload = () => {
    const fileUrl = message.mediaUrl || message.message;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = getFileName(fileUrl);
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div 
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg max-w-xs cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={handleDownload}
    >
      <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{getFileName(message.mediaUrl || message.message)}</p>
        <p className="text-xs text-gray-500">Click to download</p>
      </div>
      <Download className="h-4 w-4 text-gray-400" />
    </div>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({ message, isOwn, showAvatar, showTimestamp }: MessageBubbleProps) {
  const [audioStates, setAudioStates] = useState<AudioState>({});
  
  const handleAudioToggle = useCallback((messageId: string) => {
    // Audio playback logic would go here
    setAudioStates(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        isPlaying: !prev[messageId]?.isPlaying
      }
    }));
  }, []);

  const getReadStatus = () => {
    if (!message.readBy) return null;
    
    const hasOthersRead = message.readBy.some(userId => userId !== message.senderId);
    
    if (isOwn) {
      if (hasOthersRead) {
        return <CheckCheck className="h-3 w-3 text-blue-600" />;
      } else {
        return <Check className="h-3 w-3 text-gray-400" />;
      }
    }
    
    return null;
  };

  const renderMessageContent = () => {
    switch (message.messageType) {
      case OrderMessageType.IMAGE:
        return <ImageMessage message={message} />;
      // Since DOCUMENT doesn't exist in enum, handle as TEXT with file URL
      case OrderMessageType.TEXT:
        // Check if the message is a file URL
        if (message.mediaUrl && message.mediaUrl.match(/\.(pdf|doc|docx|txt)$/i)) {
          return <DocumentMessage message={message} />;
        }
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.message}
          </p>
        );
      case OrderMessageType.VOICE:
        return (
          <AudioMessage
            message={message}
            isOwn={isOwn}
            audioState={audioStates[message.id!]}
            onPlayToggle={handleAudioToggle}
          />
        );
      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.message}
          </p>
        );
    }
  };

  return (
    <div className={cn('flex gap-2 mb-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {showAvatar && !isOwn && (
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {message.senderType === OrderParticipantRole.TAILOR ? 'T' : 'C'}
          </AvatarFallback>
        </Avatar>
      )}
      {showAvatar && isOwn && <div className="w-6" />}

      {/* Message Content */}
      <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-3 py-2 relative',
            isOwn 
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          )}
        >
          {renderMessageContent()}
        </div>

        {/* Timestamp and Read Status */}
        {showTimestamp && (
          <div className={cn(
            'flex items-center gap-1 mt-1 text-xs text-gray-500',
            isOwn ? 'flex-row-reverse' : 'flex-row'
          )}>
            <span>{formatMessageTime(message.sentAt)}</span>
            {getReadStatus()}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Typing Indicator Component
 */
function TypingIndicator({ users }: { users: { userId: string; name: string; avatar?: string }[] }) {
  if (users.length === 0) return null;

  return (
    <div className="flex gap-2 mb-2">
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarImage src={users[0].avatar} />
        <AvatarFallback className="text-xs">{users[0].name.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="bg-gray-100 rounded-2xl rounded-bl-md px-3 py-2">
        <div className="flex items-center gap-1">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-xs text-gray-500 ml-2">
            {users.length === 1 
              ? `${users[0].name} is typing...` 
              : `${users.length} people are typing...`
            }
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * MessageList Component
 * Displays messages with real-time updates and rich media support
 */
export function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  isConnected = true,
  typingUsers = [],
  className
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((force = false) => {
    if (!lastMessageRef.current) return;
    
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
    
    if (force || (autoScroll && isNearBottom)) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollContainer) return;

    const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 50;
    setAutoScroll(isAtBottom);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers, scrollToBottom]);

  // Group messages by date and consecutive sender
  const groupedMessages = React.useMemo(() => {
    const groups: Array<{ 
      date: string; 
      messages: Array<{ 
        message: OrderMessage; 
        showAvatar: boolean; 
        showTimestamp: boolean; 
      }> 
    }> = [];

    let currentDate = '';
    let currentSender = '';
    let lastMessageTime = 0;

    messages.forEach((message, index) => {
      const messageDate = formatDateHeader(message.sentAt);
      const messageTime = new Date(message.sentAt).getTime();
      
      // Start new date group if date changed
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [] });
        currentSender = ''; // Reset sender grouping for new date
      }

      const currentGroup = groups[groups.length - 1];
      
      // Determine if we should show avatar and timestamp
      const isDifferentSender = message.senderId !== currentSender;
      const isLongGap = messageTime - lastMessageTime > 5 * 60 * 1000; // 5 minutes
      const showAvatar = isDifferentSender || isLongGap;
      const showTimestamp = showAvatar || index === messages.length - 1;

      currentGroup.messages.push({
        message,
        showAvatar,
        showTimestamp
      });

      currentSender = message.senderId;
      lastMessageTime = messageTime;
    });

    return groups;
  }, [messages]);

  if (isLoading) {
    return (
      <div className={cn('flex-1 flex items-center justify-center', className)}>
        <div className="text-center text-gray-500">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={cn('flex-1 flex items-center justify-center p-4', className)}>
        <div className="text-center text-gray-500">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm font-medium mb-1">No messages yet</p>
          <p className="text-xs">Start a conversation with your tailor!</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className={cn('flex-1', className)}
      onScrollCapture={handleScroll}
    >
      <div className="p-3 space-y-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={`${group.date}-${groupIndex}`}>
            {/* Date Header */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gray-100 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                {group.date}
              </div>
            </div>

            {/* Messages */}
            {group.messages.map(({ message, showAvatar, showTimestamp }, messageIndex) => (
              <MessageBubble
                key={`${message.id}-${messageIndex}`}
                message={message}
                isOwn={message.senderId === currentUserId}
                showAvatar={showAvatar}
                showTimestamp={showTimestamp}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ))}

        {/* Typing Indicator */}
        <TypingIndicator users={typingUsers} />

        {/* Connection Status */}
        {!isConnected && (
          <div className="text-center">
            <Badge variant="outline" className="text-xs text-gray-500">
              Reconnecting...
            </Badge>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={lastMessageRef} />
      </div>
    </ScrollArea>
  );
}

export default MessageList;
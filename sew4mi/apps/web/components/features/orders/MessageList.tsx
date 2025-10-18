/**
 * MessageList component for displaying order messages
 * Features real-time updates, typing indicators, and message status
 * @file MessageList.tsx
 */

'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { Check, CheckCheck, Download, Play, Pause, FileText, Image as ImageIcon, Volume2, MessageSquare, X } from 'lucide-react';
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
 * Format message timestamp
 */
const formatMessageTime = (timestamp: Date | string): string => {
  if (!timestamp) return 'Just now';
  
  const date = new Date(timestamp);
  
  // Check if date is invalid
  if (isNaN(date.getTime())) {
    return 'Just now';
  }
  
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
  if (!timestamp) return 'Today';
  
  const date = new Date(timestamp);
  
  // Check if date is invalid
  if (isNaN(date.getTime())) {
    return 'Today';
  }
  
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
 * Simplified to use only native HTML5 audio controls to avoid fetch abortion issues
 */
const AudioMessage = React.memo(({ 
  message, 
  isOwn
}: { 
  message: OrderMessage;
  isOwn: boolean;
}) => {
  // Memoize audioUrl to prevent recalculation on every render
  const audioUrl = useMemo(() => message.mediaUrl || message.message, [message.mediaUrl, message.message]);
  const [error, setError] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Log when component mounts with audio URL
  useEffect(() => {
    console.log('AudioMessage mounted with URL:', audioUrl);
  }, [audioUrl]);

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-3 bg-gray-100 rounded-lg max-w-xs">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">Audio unavailable</span>
        </div>
        <a 
          href={audioUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Try opening in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg max-w-xs">
      <div className="flex items-center gap-2 mb-1">
        <Volume2 className="h-4 w-4 text-gray-500" />
        <span className="text-xs text-gray-600">Voice message</span>
      </div>
      
      {/* Use native HTML5 audio controls - most reliable */}
      <audio
        key={`audio-${message.id}`}
        src={audioUrl}
        controls
        preload="metadata"
        controlsList="nodownload"
        className="w-full"
        style={{ 
          maxWidth: '300px',
          height: '40px'
        }}
        onError={(e) => {
          console.error('Audio error:', e);
          console.error('Audio element:', {
            src: audioUrl,
            error: e.currentTarget.error
          });
          setError(true);
        }}
        onPlay={() => {
          setHasInteracted(true);
          console.log('Audio playing:', audioUrl);
        }}
      />
      
      {/* Download link as backup */}
      <a 
        href={audioUrl}
        download
        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        onClick={() => setHasInteracted(true)}
      >
        <Download className="h-3 w-3" />
        Download audio
      </a>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if the audio URL or isOwn actually changed
  const prevUrl = prevProps.message.mediaUrl || prevProps.message.message;
  const nextUrl = nextProps.message.mediaUrl || nextProps.message.message;
  return prevUrl === nextUrl && prevProps.isOwn === nextProps.isOwn;
});

// Add display name for debugging
AudioMessage.displayName = 'AudioMessage';

/**
 * Image Message Component
 */
function ImageMessage({ message }: { message: OrderMessage }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  const imageUrl = message.mediaUrl || message.message;

  useEffect(() => {
    console.log('ImageMessage rendering:', {
      hasMediaUrl: !!message.mediaUrl,
      hasMessage: !!message.message,
      finalUrl: imageUrl,
      messageType: message.messageType
    });
  }, [message.mediaUrl, message.message, imageUrl, message.messageType]);

  return (
    <div className="max-w-sm">
      {error ? (
        <div className="flex flex-col gap-2 p-3 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Image unavailable</span>
          </div>
          <a 
            href={imageUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            Try opening: {imageUrl?.substring(0, 50)}...
          </a>
        </div>
      ) : (
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}
          <img
            src={imageUrl}
            alt="Shared image"
            className={cn(
              'max-w-full h-auto rounded-lg transition-opacity',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            onLoad={() => {
              console.log('Image loaded successfully:', imageUrl);
              setIsLoading(false);
            }}
            onError={(e) => {
              console.error('Image load error:', imageUrl, e);
              setError(true);
              setIsLoading(false);
            }}
            onClick={() => {
              // Open in modal/full screen
              window.open(imageUrl, '_blank');
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
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const fileUrl = message.mediaUrl || message.message;
  
  const getFileName = (url: string) => {
    try {
      return decodeURIComponent(url.split('/').pop() || 'document');
    } catch {
      return 'document';
    }
  };

  const getFileExtension = (url: string) => {
    return url.split('.').pop()?.toLowerCase() || '';
  };

  const fileName = getFileName(fileUrl);
  const fileExtension = getFileExtension(fileUrl);
  const isPDF = fileExtension === 'pdf';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewFull = () => {
    window.open(fileUrl, '_blank');
  };

  const togglePreview = () => {
    if (!showPreview) {
      setIsLoading(true);
    }
    setShowPreview(!showPreview);
  };

  return (
    <div className="flex flex-col gap-2 max-w-lg">
      {/* Document Header */}
      <div 
        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={isPDF ? togglePreview : handleDownload}
      >
        <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-gray-500">
            {isPDF ? (showPreview ? 'Click to collapse' : 'Click to preview') : 'Click to download'}
          </p>
        </div>
        {isPDF ? (
          showPreview ? <X className="h-4 w-4 text-gray-400" /> : <Download className="h-4 w-4 text-gray-400" />
        ) : (
          <Download className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* PDF Preview */}
      {isPDF && showPreview && (
        <div className="relative bg-white border rounded-lg overflow-hidden">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-2">Unable to preview PDF</p>
              <Button size="sm" onClick={handleViewFull} variant="outline">
                Open in new tab
              </Button>
            </div>
          )}

          {/* PDF Iframe */}
          {!error && (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-[500px] border-0"
              title={fileName}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setError(true);
              }}
            />
          )}

          {/* Action Buttons */}
          {!error && (
            <div className="flex items-center justify-end gap-2 p-2 bg-gray-50 border-t">
              <Button size="sm" onClick={handleViewFull} variant="outline">
                <span className="text-xs">Open Full Screen</span>
              </Button>
              <Button size="sm" onClick={handleDownload} variant="outline">
                <Download className="h-3 w-3 mr-1" />
                <span className="text-xs">Download</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Message Bubble Component
 */
function MessageBubble({ message, isOwn, showAvatar, showTimestamp }: MessageBubbleProps) {
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
      const messageTime = message.sentAt ? new Date(message.sentAt).getTime() : Date.now();
      
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
                key={message.id}
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
/**
 * MessageInput component for composing and sending messages
 * Features typing indicators, file attachments, and voice messages
 * @file MessageInput.tsx
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff, X, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OrderMessageType } from '@sew4mi/shared/types/order-creation';

/**
 * Props for MessageInput component
 */
interface MessageInputProps {
  /** Callback when message is sent */
  onSendMessage: (content: string, type?: OrderMessageType) => Promise<void>;
  /** Whether the connection is active */
  isConnected: boolean;
  /** Maximum message length */
  maxLength?: number;
  /** Whether file attachments are allowed */
  allowAttachments?: boolean;
  /** Whether voice messages are allowed */
  allowVoiceMessages?: boolean;
  /** Whether typing indicators are enabled */
  enableTypingIndicators?: boolean;
  /** Order ID for file uploads */
  orderId: string;
  /** User ID */
  userId: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * File attachment info
 */
interface AttachmentInfo {
  file: File;
  preview?: string;
  type: 'image' | 'document';
}

/**
 * Voice recording state
 */
interface VoiceRecordingState {
  isRecording: boolean;
  duration: number;
  audioBlob?: Blob;
  mediaRecorder?: MediaRecorder;
}

/**
 * MessageInput Component
 * Handles message composition with rich features
 */
export function MessageInput({
  onSendMessage,
  isConnected,
  maxLength = 1000,
  allowAttachments = true,
  allowVoiceMessages = false,
  enableTypingIndicators = true,
  orderId,
  userId,
  className
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecordingState>({
    isRecording: false,
    duration: 0
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioBlobUrlRef = useRef<string | null>(null);

  /**
   * Handle typing indicators
   */
  const handleTypingStart = useCallback(() => {
    if (!enableTypingIndicators || isTyping) return;
    
    setIsTyping(true);
    // Send typing indicator via WebSocket would go here
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // Send stop typing indicator via WebSocket would go here
    }, 3000);
  }, [enableTypingIndicators, isTyping]);

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    setIsTyping(false);
    // Send stop typing indicator via WebSocket would go here
  }, []);

  /**
   * Handle message content change
   */
  const handleMessageChange = useCallback((value: string) => {
    setMessage(value);
    setError(null);
    
    if (value.trim()) {
      handleTypingStart();
    } else {
      handleTypingStop();
    }
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [handleTypingStart, handleTypingStop]);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isDocument = file.type.startsWith('application/') || file.type.startsWith('text/');
      
      if (!isImage && !isDocument) {
        setError('Only images and documents are allowed');
        return;
      }
      
      const attachment: AttachmentInfo = {
        file,
        type: isImage ? 'image' : 'document'
      };
      
      // Create preview for images
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          attachment.preview = e.target?.result as string;
          setAttachments(prev => [...prev, attachment]);
        };
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, attachment]);
      }
    });
    
    // Clear input
    event.target.value = '';
  }, []);

  /**
   * Remove attachment
   */
  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Start voice recording
   */
  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setVoiceRecording(prev => ({ ...prev, audioBlob, isRecording: false }));
        stream.getTracks().forEach(track => track.stop());
      });
      
      mediaRecorder.start();
      setVoiceRecording({ isRecording: true, duration: 0, mediaRecorder });
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setVoiceRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('Unable to access microphone');
    }
  }, []);

  /**
   * Stop voice recording
   */
  const stopVoiceRecording = useCallback(() => {
    if (voiceRecording.mediaRecorder && voiceRecording.isRecording) {
      voiceRecording.mediaRecorder.stop();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [voiceRecording]);

  /**
   * Cancel voice recording
   */
  const cancelVoiceRecording = useCallback(() => {
    if (voiceRecording.mediaRecorder && voiceRecording.isRecording) {
      voiceRecording.mediaRecorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setVoiceRecording({ isRecording: false, duration: 0 });
  }, [voiceRecording]);

  /**
   * Upload file
   */
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orderId', orderId);
    formData.append('userId', userId);
    
    const response = await fetch('/api/orders/messages/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'File upload failed');
    }
    
    const data = await response.json();
    return data.url;
  }, [orderId, userId]);

  /**
   * Send message
   */
  const handleSend = useCallback(async () => {
    if (isSending || (!message.trim() && attachments.length === 0 && !voiceRecording.audioBlob)) {
      return;
    }
    
    try {
      setIsSending(true);
      setError(null);
      
      // Handle text message
      if (message.trim()) {
        await onSendMessage(message.trim(), OrderMessageType.TEXT);
      }
      
      // Handle attachments
      for (const attachment of attachments) {
        const fileUrl = await uploadFile(attachment.file);
        const messageType = attachment.type === 'image' ? OrderMessageType.IMAGE : OrderMessageType.TEXT;
        await onSendMessage(fileUrl, messageType);
      }
      
      // Handle voice message
      if (voiceRecording.audioBlob) {
        const voiceFile = new File([voiceRecording.audioBlob], 'voice_message.webm', {
          type: 'audio/webm'
        });
        const voiceUrl = await uploadFile(voiceFile);
        await onSendMessage(voiceUrl, OrderMessageType.VOICE);
      }
      
      // Clear inputs
      setMessage('');
      setAttachments([]);
      setVoiceRecording({ isRecording: false, duration: 0 });
      handleTypingStop();
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [message, attachments, voiceRecording.audioBlob, isSending, onSendMessage, uploadFile, handleTypingStop]);

  /**
   * Handle key press
   */
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Format recording duration
   */
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      // Revoke blob URL on unmount
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
      }
    };
  }, []);

  // Create and manage audio blob URL
  useEffect(() => {
    // Revoke previous blob URL if it exists
    if (audioBlobUrlRef.current) {
      URL.revokeObjectURL(audioBlobUrlRef.current);
      audioBlobUrlRef.current = null;
    }

    // Create new blob URL if we have an audio blob
    if (voiceRecording.audioBlob) {
      audioBlobUrlRef.current = URL.createObjectURL(voiceRecording.audioBlob);
    }

    // Cleanup function to revoke on change
    return () => {
      if (audioBlobUrlRef.current) {
        URL.revokeObjectURL(audioBlobUrlRef.current);
        audioBlobUrlRef.current = null;
      }
    };
  }, [voiceRecording.audioBlob]);

  return (
    <div className={cn('p-3 bg-white border-t', className)}>
      {error && (
        <Alert className="mb-2">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((attachment, index) => (
            <div key={index} className="relative">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 pr-8">
                {attachment.type === 'image' ? (
                  attachment.preview ? (
                    <img 
                      src={attachment.preview} 
                      alt="Preview" 
                      className="w-8 h-8 object-cover rounded"
                    />
                  ) : (
                    <ImageIcon className="w-4 h-4" />
                  )
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="text-xs truncate max-w-20">
                  {attachment.file.name}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveAttachment(index)}
                className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full bg-red-100 hover:bg-red-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Recording */}
      {voiceRecording.isRecording && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Recording</span>
            <Badge variant="outline">{formatDuration(voiceRecording.duration)}</Badge>
          </div>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={cancelVoiceRecording}>
            Cancel
          </Button>
          <Button size="sm" onClick={stopVoiceRecording}>
            <MicOff className="h-4 w-4 mr-1" />
            Stop
          </Button>
        </div>
      )}

      {/* Voice Playback */}
      {voiceRecording.audioBlob && !voiceRecording.isRecording && audioBlobUrlRef.current && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded-lg">
          <audio 
            key={audioBlobUrlRef.current}
            controls 
            src={audioBlobUrlRef.current} 
            className="flex-1 h-8"
            preload="metadata"
          />
          <Button size="sm" variant="ghost" onClick={() => setVoiceRecording({ isRecording: false, duration: 0 })}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end gap-2">
        {/* File Attachment Button */}
        {allowAttachments && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isConnected || isSending}
                  className="h-8 w-8 p-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Voice Message Button */}
        {allowVoiceMessages && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={voiceRecording.isRecording ? stopVoiceRecording : startVoiceRecording}
                  disabled={!isConnected || isSending}
                  className={cn(
                    'h-8 w-8 p-0',
                    voiceRecording.isRecording && 'bg-red-100 text-red-600'
                  )}
                >
                  {voiceRecording.isRecording ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{voiceRecording.isRecording ? 'Stop recording' : 'Record voice message'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Text Input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              !isConnected ? 'Connecting...' : 
              voiceRecording.isRecording ? 'Recording voice message...' : 
              'Type your message...'
            }
            disabled={!isConnected || isSending || voiceRecording.isRecording}
            maxLength={maxLength}
            rows={1}
            className="min-h-[40px] max-h-[120px] resize-none pr-12"
          />
          
          {/* Character Count */}
          {message.length > maxLength * 0.8 && (
            <span className={cn(
              'absolute bottom-2 right-12 text-xs',
              message.length >= maxLength ? 'text-red-500' : 'text-gray-400'
            )}>
              {message.length}/{maxLength}
            </span>
          )}
        </div>

        {/* Send Button */}
        <Button
          size="sm"
          onClick={handleSend}
          disabled={
            !isConnected || 
            isSending || 
            (!message.trim() && attachments.length === 0 && !voiceRecording.audioBlob) ||
            voiceRecording.isRecording
          }
          className="h-8 w-8 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Connection Status */}
      {!isConnected && (
        <div className="text-xs text-gray-500 mt-1 text-center">
          Connection lost - attempting to reconnect...
        </div>
      )}
    </div>
  );
}

export default MessageInput;
'use client';

/**
 * GroupOrderMessaging Component
 * Group messaging interface for communicating with all order participants
 * Integrates with WhatsApp for external communication
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare,
  Send,
  Users,
  User,
  CheckCheck,
  Clock,
  Smartphone
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientType: 'broadcast' | 'individual';
  recipientId?: string;
  recipientName?: string;
  content: string;
  timestamp: Date;
  delivered: boolean;
  read: boolean;
  channel: 'whatsapp' | 'sms' | 'in-app';
}

interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  category: string;
}

export interface GroupOrderMessagingProps {
  /** Group order ID */
  groupOrderId: string;
  /** Participants in the group order */
  participants: Array<{
    id: string;
    name: string;
    phone: string;
    role: 'organizer' | 'participant';
  }>;
  /** Message history */
  messages?: Message[];
  /** Callback when message is sent */
  onSendMessage?: (message: OutgoingMessage) => Promise<void>;
  /** Loading state */
  isSending?: boolean;
  /** Custom className */
  className?: string;
}

export interface OutgoingMessage {
  groupOrderId: string;
  recipientType: 'broadcast' | 'individual';
  recipientId?: string;
  content: string;
  channel: 'whatsapp' | 'sms';
}

// Message templates for common coordination questions
const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'fabric-confirmation',
    name: 'Fabric Confirmation',
    content: 'Hello! I have received the fabric for your group order. The quality looks excellent and color matches your requirements. I will begin work on Monday. Please confirm receipt of this message.',
    category: 'Fabric'
  },
  {
    id: 'measurement-reminder',
    name: 'Measurement Reminder',
    content: 'Reminder: Please ensure all measurements are confirmed before Friday. If any family member needs remeasuring, kindly let me know as soon as possible.',
    category: 'Measurements'
  },
  {
    id: 'fitting-ready',
    name: 'Fitting Ready',
    content: 'Good news! Some garments are ready for fitting. When would be convenient for you to come in for fittings? I have availability this week Wednesday through Saturday.',
    category: 'Fitting'
  },
  {
    id: 'progress-update',
    name: 'Progress Update',
    content: 'Progress update on your group order: I have completed the cutting and am now working on the stitching. Everything is on schedule for your event date. Will send photos soon.',
    category: 'Progress'
  },
  {
    id: 'completion-notice',
    name: 'Completion Notice',
    content: 'Wonderful news! Your group order is complete and ready for pickup/delivery. All items have been quality-checked and pressed. Please arrange collection at your earliest convenience.',
    category: 'Completion'
  },
  {
    id: 'design-consultation',
    name: 'Design Consultation',
    content: 'I have some design suggestions for coordinating your family outfits. Would you like to schedule a brief consultation (can be via video call) to discuss the options?',
    category: 'Design'
  }
];

/**
 * Group messaging interface with WhatsApp integration
 */
export function GroupOrderMessaging({
  groupOrderId,
  participants,
  messages = [],
  onSendMessage,
  isSending = false,
  className = ''
}: GroupOrderMessagingProps) {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'individual'>('broadcast');
  const [messageContent, setMessageContent] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');

  /**
   * Handle template selection
   */
  const handleTemplateSelect = (templateId: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMessageContent(template.content);
      setSelectedTemplate(templateId);
    }
  };

  /**
   * Handle message send
   */
  const handleSend = async () => {
    if (!messageContent.trim()) return;
    if (activeTab === 'individual' && !selectedRecipient) return;

    const message: OutgoingMessage = {
      groupOrderId,
      recipientType: activeTab,
      recipientId: activeTab === 'individual' ? selectedRecipient : undefined,
      content: messageContent,
      channel
    };

    if (onSendMessage) {
      await onSendMessage(message);
      setMessageContent('');
      setSelectedRecipient('');
      setSelectedTemplate('');
    }
  };

  /**
   * Group messages by date
   */
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Group Order Messaging
          </CardTitle>
          <CardDescription>
            Communicate with all participants or send individual messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                <strong>{participants.length}</strong> participants
              </span>
            </div>
            <Badge variant="secondary">
              <Smartphone className="h-3 w-3 mr-1" />
              WhatsApp Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Messaging Interface */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'broadcast' | 'individual')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="broadcast" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Broadcast Message
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Individual Message
          </TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="space-y-4 mt-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              Your message will be sent to all {participants.length} participants in this group order
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Recipient</label>
            <select
              value={selectedRecipient}
              onChange={(e) => setSelectedRecipient(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Choose a participant...</option>
              {participants.map(participant => (
                <option key={participant.id} value={participant.id}>
                  {participant.name} ({participant.role === 'organizer' ? 'Organizer' : 'Participant'})
                </option>
              ))}
            </select>
          </div>
        </TabsContent>
      </Tabs>

      {/* Message Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Templates</CardTitle>
          <CardDescription>
            Use pre-written templates for common messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {MESSAGE_TEMPLATES.map(template => (
              <Button
                key={template.id}
                variant={selectedTemplate === template.id ? 'default' : 'outline'}
                className="justify-start h-auto py-3"
                onClick={() => handleTemplateSelect(template.id)}
              >
                <div className="text-left">
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs opacity-80">{template.category}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compose Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Channel Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Send Via</label>
            <div className="flex gap-2">
              <Button
                variant={channel === 'whatsapp' ? 'default' : 'outline'}
                onClick={() => setChannel('whatsapp')}
                className="flex-1"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant={channel === 'sms' ? 'default' : 'outline'}
                onClick={() => setChannel('sms')}
                className="flex-1"
              >
                SMS
              </Button>
            </div>
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Type your message here..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {messageContent.length} characters
              {channel === 'sms' && messageContent.length > 160 && 
                ` • ${Math.ceil(messageContent.length / 160)} SMS messages`
              }
            </p>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSend}
              disabled={
                isSending || 
                !messageContent.trim() || 
                (activeTab === 'individual' && !selectedRecipient)
              }
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSending ? 'Sending...' : `Send via ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Message History */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Message History
        </h3>

        {sortedMessages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">
                Send your first message to start the conversation
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedMessages.map(message => (
              <Card key={message.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {message.recipientType === 'broadcast' ? (
                            <><Users className="h-3 w-3 mr-1" /> Broadcast</>
                          ) : (
                            <><User className="h-3 w-3 mr-1" /> To: {message.recipientName}</>
                          )}
                        </Badge>
                        <Badge variant="outline">
                          <Smartphone className="h-3 w-3 mr-1" />
                          {message.channel}
                        </Badge>
                      </div>
                      
                      <p className="text-sm">{message.content}</p>
                      
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{new Date(message.timestamp).toLocaleString()}</span>
                        {message.read ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCheck className="h-3 w-3" /> Read
                          </span>
                        ) : message.delivered ? (
                          <span className="flex items-center gap-1 text-blue-600">
                            <CheckCheck className="h-3 w-3" /> Delivered
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Sending...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


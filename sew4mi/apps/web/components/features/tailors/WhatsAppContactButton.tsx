'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GARMENT_TYPES, WHATSAPP_MESSAGE_TEMPLATES } from '@sew4mi/shared';
import { MessageCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppContactButtonProps {
  tailorId: string;
  tailorName: string;
  className?: string;
}

export function WhatsAppContactButton({ tailorId, tailorName, className }: WhatsAppContactButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>(WHATSAPP_MESSAGE_TEMPLATES.INITIAL_CONTACT);
  const [garmentType, setGarmentType] = useState('');
  const [budget, setBudget] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [messageType, setMessageType] = useState<'general' | 'order'>('general');
  const { toast } = useToast();

  const handleTemplateChange = (type: string) => {
    setMessageType(type as 'general' | 'order');
    switch (type) {
      case 'general':
        setMessage(WHATSAPP_MESSAGE_TEMPLATES.INITIAL_CONTACT);
        break;
      case 'order':
        setMessage(WHATSAPP_MESSAGE_TEMPLATES.ORDER_INQUIRY);
        break;
      case 'availability':
        setMessage(WHATSAPP_MESSAGE_TEMPLATES.AVAILABILITY_CHECK);
        break;
      case 'price':
        setMessage(WHATSAPP_MESSAGE_TEMPLATES.PRICE_INQUIRY);
        break;
      default:
        setMessage(WHATSAPP_MESSAGE_TEMPLATES.INITIAL_CONTACT);
    }
  };

  const generateOrderMessage = () => {
    if (!garmentType) return message;
    
    return WHATSAPP_MESSAGE_TEMPLATES.ORDER_INQUIRY
      .replace('{garmentType}', garmentType)
      .replace('{budget}', budget || 'flexible budget')
      .replace('{deliveryDate}', deliveryDate || 'flexible timeline');
  };

  const handleContact = async () => {
    try {
      setLoading(true);

      const contactData: any = {
        message: messageType === 'order' ? generateOrderMessage() : message,
      };

      if (messageType === 'order' && garmentType) {
        contactData.orderContext = {
          garmentType,
          estimatedBudget: budget ? parseFloat(budget) : 0,
          deliveryDate: deliveryDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      }

      const response = await fetch(`/api/tailors/${tailorId}/whatsapp-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      // Open WhatsApp in new tab
      window.open(data.data.whatsappUrl, '_blank');
      
      toast({
        title: "Opening WhatsApp",
        description: `Connecting you with ${tailorName}`,
      });

      setOpen(false);
    } catch (error) {
      console.error('Error contacting tailor:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to contact tailor",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={`bg-green-600 hover:bg-green-700 text-white ${className}`}>
          <MessageCircle className="w-4 h-4 mr-2" />
          Contact on WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {tailorName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Message Type */}
          <div>
            <Label htmlFor="messageType">Message Type</Label>
            <Select value={messageType} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General Inquiry</SelectItem>
                <SelectItem value="order">Order Request</SelectItem>
                <SelectItem value="availability">Check Availability</SelectItem>
                <SelectItem value="price">Price Quote</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Context Fields */}
          {messageType === 'order' && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <Label htmlFor="garmentType">Garment Type</Label>
                <Select value={garmentType} onValueChange={setGarmentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select garment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(GARMENT_TYPES).map((type) => (
                      <SelectItem key={type.id} value={type.name}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="budget">Budget (GHS)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="e.g. 200"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate">Needed By</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Message Preview */}
          <div>
            <Label htmlFor="message">Message Preview</Label>
            <Textarea
              id="message"
              value={messageType === 'order' ? generateOrderMessage() : message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              You can edit this message before sending
            </p>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={handleContact}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                'Opening...'
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open WhatsApp
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            This will open WhatsApp with a pre-filled message to {tailorName}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Clock, 
  Camera, 
  Package, 
  DollarSign,
  MapPin,
  Scissors,
  Users,
  HelpCircle,
  Star
} from 'lucide-react';

interface MessageTemplate {
  id: string;
  category: 'status' | 'timeline' | 'photos' | 'payment' | 'delivery' | 'fitting' | 'general';
  title: string;
  content: string;
  icon: React.ComponentType<{ className?: string }>;
  popular?: boolean;
}

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
  className?: string;
}

/**
 * MessageTemplates Component
 * 
 * Provides common message templates for customer-tailor communication
 * Organized by categories and includes Ghana-specific messaging patterns
 */
export function MessageTemplates({
  onSelectTemplate,
  className = ''
}: MessageTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Common message templates for Ghana market
  const templates: MessageTemplate[] = [
    // Status Updates
    {
      id: 'status-progress',
      category: 'status',
      title: 'Check Progress',
      content: 'Hello! I wanted to check on the progress of my order. How is it coming along?',
      icon: Package,
      popular: true
    },
    {
      id: 'status-concerns',
      category: 'status',
      title: 'Express Concerns',
      content: 'I have some concerns about my order. Can we discuss when you have time?',
      icon: HelpCircle
    },
    {
      id: 'status-changes',
      category: 'status',
      title: 'Request Changes',
      content: 'I would like to make a small change to my order. Is this still possible?',
      icon: Scissors
    },

    // Timeline Questions
    {
      id: 'timeline-completion',
      category: 'timeline',
      title: 'Completion Date',
      content: 'When do you expect my garment to be ready? I want to plan accordingly.',
      icon: Clock,
      popular: true
    },
    {
      id: 'timeline-fitting',
      category: 'timeline',
      title: 'Fitting Schedule',
      content: 'When can we schedule the fitting session? I am available most weekdays.',
      icon: Users
    },
    {
      id: 'timeline-urgent',
      category: 'timeline',
      title: 'Urgency Request',
      content: 'I have an event coming up. Is it possible to expedite my order? I can pay extra if needed.',
      icon: Clock
    },

    // Photo Requests
    {
      id: 'photos-progress',
      category: 'photos',
      title: 'Progress Photos',
      content: 'Could you please send me some photos of the current progress? I\'m excited to see how it looks!',
      icon: Camera,
      popular: true
    },
    {
      id: 'photos-fabric',
      category: 'photos',
      title: 'Fabric Selection',
      content: 'Can you show me the fabric you plan to use? I want to make sure we\'re aligned.',
      icon: Camera
    },
    {
      id: 'photos-fitting',
      category: 'photos',
      title: 'Fitting Photos',
      content: 'Please take photos during the fitting so I can see the adjustments being made.',
      icon: Camera
    },

    // Payment Questions
    {
      id: 'payment-schedule',
      category: 'payment',
      title: 'Payment Schedule',
      content: 'Can you remind me of the payment schedule? When is my next payment due?',
      icon: DollarSign
    },
    {
      id: 'payment-methods',
      category: 'payment',
      title: 'Payment Options',
      content: 'What payment methods do you accept? Can I pay via mobile money?',
      icon: DollarSign,
      popular: true
    },
    {
      id: 'payment-receipt',
      category: 'payment',
      title: 'Payment Confirmation',
      content: 'I have made the payment. Please confirm when you receive it.',
      icon: DollarSign
    },

    // Delivery Questions
    {
      id: 'delivery-pickup',
      category: 'delivery',
      title: 'Pickup Arrangement',
      content: 'My garment is ready for pickup. What time works best for you?',
      icon: MapPin
    },
    {
      id: 'delivery-location',
      category: 'delivery',
      title: 'Delivery Options',
      content: 'Can you deliver to my location? What would be the additional cost?',
      icon: MapPin,
      popular: true
    },
    {
      id: 'delivery-timing',
      category: 'delivery',
      title: 'Delivery Timing',
      content: 'What time of day do you usually make deliveries? I want to ensure I\'m available.',
      icon: Clock
    },

    // Fitting Related
    {
      id: 'fitting-questions',
      category: 'fitting',
      title: 'Fitting Questions',
      content: 'I have questions about the fitting. Can we go over the details together?',
      icon: Users
    },
    {
      id: 'fitting-adjustments',
      category: 'fitting',
      title: 'Fitting Adjustments',
      content: 'The fit needs some adjustments. When can we schedule another fitting session?',
      icon: Scissors
    },
    {
      id: 'fitting-satisfaction',
      category: 'fitting',
      title: 'Fitting Satisfaction',
      content: 'I\'m very happy with the fit! Thank you for your excellent work.',
      icon: Star
    },

    // General Communication
    {
      id: 'general-thanks',
      category: 'general',
      title: 'Thank You',
      content: 'Thank you so much for your excellent work and communication!',
      icon: Star,
      popular: true
    },
    {
      id: 'general-recommend',
      category: 'general',
      title: 'Recommendation',
      content: 'I will definitely recommend your services to my friends and family!',
      icon: Users
    },
    {
      id: 'general-question',
      category: 'general',
      title: 'General Question',
      content: 'I have a question about my order. When would be a good time to call?',
      icon: HelpCircle
    }
  ];

  // Category configuration
  const categories = [
    { id: 'all', label: 'All Templates', count: templates.length },
    { id: 'status', label: 'Status Updates', count: templates.filter(t => t.category === 'status').length },
    { id: 'timeline', label: 'Timeline', count: templates.filter(t => t.category === 'timeline').length },
    { id: 'photos', label: 'Photos', count: templates.filter(t => t.category === 'photos').length },
    { id: 'payment', label: 'Payment', count: templates.filter(t => t.category === 'payment').length },
    { id: 'delivery', label: 'Delivery', count: templates.filter(t => t.category === 'delivery').length },
    { id: 'fitting', label: 'Fitting', count: templates.filter(t => t.category === 'fitting').length },
    { id: 'general', label: 'General', count: templates.filter(t => t.category === 'general').length }
  ];

  // Filter templates by category
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(template => template.category === selectedCategory);

  // Sort templates with popular ones first
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.popular && !b.popular) return -1;
    if (!a.popular && b.popular) return 1;
    return 0;
  });

  return (
    <Card className={`w-full max-w-2xl ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Message Templates
        </CardTitle>
        <p className="text-sm text-gray-600">
          Select a template to quickly send common messages to your tailor
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <Button
              key={category.id}
              size="sm"
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(category.id)}
              className="text-xs"
            >
              {category.label}
              <Badge variant="secondary" className="ml-1 text-xs">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Templates List */}
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {sortedTemplates.map(template => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectTemplate(template.content)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{template.title}</h4>
                        {template.popular && (
                          <Badge variant="secondary" className="text-xs">
                            Popular
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <div className="text-xs text-gray-500 mb-2">Quick Actions:</div>
          <div className="flex flex-wrap gap-2">
            {templates
              .filter(t => t.popular)
              .slice(0, 3)
              .map(template => (
                <Button
                  key={template.id}
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectTemplate(template.content)}
                  className="text-xs"
                >
                  {template.title}
                </Button>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
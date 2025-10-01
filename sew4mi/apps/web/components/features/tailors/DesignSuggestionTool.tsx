'use client';

/**
 * DesignSuggestionTool Component
 * Provides template-based coordinated design suggestions with Ghana cultural event templates
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Palette,
  Send,
  CheckCircle,
  Info,
  Sparkles
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { EventType } from '@sew4mi/shared/types/group-order';

interface CulturalEventTemplate {
  id: string;
  eventType: EventType;
  displayName: string;
  culturalContext: string;
  recommendedColors: {
    primary: string[];
    accent: string[];
    avoid: string[];
    significance: string;
  };
  traditionalPatterns?: string[];
  coordinationGuidelines: string;
  fabricSuggestions: string[];
}

export interface DesignSuggestionToolProps {
  /** Group order ID */
  groupOrderId: string;
  /** Event type for the group order */
  eventType: EventType | null;
  /** Callback when suggestion is submitted */
  onSubmit?: (suggestion: DesignSuggestionSubmission) => Promise<void>;
  /** Loading state */
  isSubmitting?: boolean;
  /** Custom className */
  className?: string;
}

export interface DesignSuggestionSubmission {
  groupOrderId: string;
  suggestionText: string;
  referenceImages: string[];
  colorPalette: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  culturalTheme: string;
}

// Ghana Cultural Event Templates
const CULTURAL_TEMPLATES: CulturalEventTemplate[] = [
  {
    id: 'wedding',
    eventType: EventType.WEDDING,
    displayName: 'Traditional Ghanaian Wedding',
    culturalContext: 'Coordinated Kente or matching prints for family',
    recommendedColors: {
      primary: ['Gold', 'Royal Blue', 'Burgundy', 'Emerald Green'],
      accent: ['White', 'Cream', 'Silver'],
      avoid: ['Black', 'Red'],
      significance: 'Bright colors symbolize joy and celebration'
    },
    traditionalPatterns: ['Kente weave', 'Adinkra symbols', 'Batik prints'],
    coordinationGuidelines: 'Family members should wear complementary colors from same fabric lot. Bride/groom colors should be distinctive but harmonious.',
    fabricSuggestions: ['Kente cloth', 'Woodin prints', 'Premium wax prints']
  },
  {
    id: 'funeral',
    eventType: EventType.FUNERAL,
    displayName: 'Funeral/Memorial Service',
    culturalContext: 'Respectful coordinated mourning attire',
    recommendedColors: {
      primary: ['Black', 'Deep Red', 'Brown', 'Dark Purple'],
      accent: ['White (for elders)', 'Black and White'],
      avoid: ['Bright colors', 'Yellow', 'Pink'],
      significance: 'Somber colors show respect for the deceased'
    },
    coordinationGuidelines: 'All family members in matching black/red fabrics. White reserved for immediate family or elders depending on tradition.',
    fabricSuggestions: ['Black cotton', 'Red and black prints', 'Traditional mourning cloth']
  },
  {
    id: 'naming',
    eventType: EventType.NAMING_CEREMONY,
    displayName: 'Naming Ceremony (Outdooring)',
    culturalContext: 'Celebration of new life, coordinated family outfits',
    recommendedColors: {
      primary: ['White', 'Light Blue', 'Pink', 'Cream', 'Gold'],
      accent: ['Silver', 'Baby Blue', 'Soft Pink'],
      avoid: ['Black', 'Dark colors'],
      significance: 'Light, cheerful colors represent new beginnings'
    },
    coordinationGuidelines: 'Parents in white or cream, family in coordinating pastels. Baby in special ceremonial cloth.',
    fabricSuggestions: ['White lace', 'Soft cotton prints', 'Embroidered fabrics']
  },
  {
    id: 'festival',
    eventType: EventType.FESTIVAL,
    displayName: 'Cultural Festival',
    culturalContext: 'Traditional celebration with coordinated cultural attire',
    recommendedColors: {
      primary: ['Bold Colors', 'Traditional Kente patterns', 'Vibrant prints'],
      accent: ['Gold', 'Yellow', 'Orange'],
      avoid: [],
      significance: 'Vibrant colors celebrate cultural heritage'
    },
    traditionalPatterns: ['Kente patterns', 'Adinkra symbols', 'Regional traditional designs'],
    coordinationGuidelines: 'Family can wear matching Kente patterns or coordinated traditional prints representing their region.',
    fabricSuggestions: ['Authentic Kente', 'Cultural prints', 'Traditional weaves']
  },
  {
    id: 'church',
    eventType: EventType.CHURCH_EVENT,
    displayName: 'Church Event',
    culturalContext: 'Modest coordinated church attire',
    recommendedColors: {
      primary: ['White', 'Cream', 'Pastels', 'Navy'],
      accent: ['Gold', 'Silver'],
      avoid: ['Red', 'Very bright colors'],
      significance: 'Modest colors appropriate for worship'
    },
    coordinationGuidelines: 'Modest, coordinated colors suitable for church setting. Avoid overly flashy or revealing designs.',
    fabricSuggestions: ['Quality cotton', 'Modest prints', 'Solid color fabrics']
  }
];

/**
 * Design suggestion tool with cultural event templates
 */
export function DesignSuggestionTool({
  groupOrderId,
  eventType,
  onSubmit,
  isSubmitting = false,
  className = ''
}: DesignSuggestionToolProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<CulturalEventTemplate | null>(
    eventType ? CULTURAL_TEMPLATES.find(t => t.eventType === eventType) || null : null
  );
  const [suggestionText, setSuggestionText] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  /**
   * Handle template selection
   */
  const handleTemplateSelect = (template: CulturalEventTemplate) => {
    setSelectedTemplate(template);
    // Pre-populate suggestion text with guidelines
    setSuggestionText(
      `Cultural Context: ${template.culturalContext}\n\n` +
      `Coordination Guidelines:\n${template.coordinationGuidelines}\n\n` +
      `Recommended Patterns: ${template.traditionalPatterns?.join(', ') || 'As appropriate'}\n\n` +
      `Please add your specific design recommendations below...`
    );
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!suggestionText.trim() || !primaryColor) return;

    const submission: DesignSuggestionSubmission = {
      groupOrderId,
      suggestionText,
      referenceImages,
      colorPalette: {
        primary: primaryColor,
        secondary: secondaryColor || undefined,
        accent: accentColor || undefined
      },
      culturalTheme: selectedTemplate?.displayName || 'Custom Design'
    };

    if (onSubmit) {
      await onSubmit(submission);
      // Reset form
      setSuggestionText('');
      setPrimaryColor('');
      setSecondaryColor('');
      setAccentColor('');
      setReferenceImages([]);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Design Suggestion Tool
          </CardTitle>
          <CardDescription>
            Create coordinated design recommendations using cultural event templates
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Cultural Event Templates */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Select Cultural Event Template</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {CULTURAL_TEMPLATES.map(template => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTemplate?.id === template.id 
                  ? 'border-primary ring-2 ring-primary' 
                  : ''
              }`}
              onClick={() => handleTemplateSelect(template)}
            >
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {template.displayName}
                  {selectedTemplate?.id === template.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  {template.culturalContext}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {template.recommendedColors.primary.slice(0, 3).map(color => (
                      <Badge key={color} variant="secondary" className="text-xs">
                        {color}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {template.recommendedColors.significance}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Selected Template Details */}
      {selectedTemplate && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Template Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Recommended Colors</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.recommendedColors.primary.map(color => (
                  <Badge key={color} className="bg-green-100 text-green-800">
                    ✓ {color}
                  </Badge>
                ))}
              </div>
            </div>

            {selectedTemplate.recommendedColors.avoid.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Colors to Avoid</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.recommendedColors.avoid.map(color => (
                    <Badge key={color} variant="destructive" className="text-xs">
                      ✗ {color}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedTemplate.traditionalPatterns && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Traditional Patterns</h4>
                <p className="text-sm">{selectedTemplate.traditionalPatterns.join(', ')}</p>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-sm mb-2">Fabric Suggestions</h4>
              <p className="text-sm">{selectedTemplate.fabricSuggestions.join(', ')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Design Suggestion Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Design Recommendation</CardTitle>
          <CardDescription>
            Provide specific coordination advice for the group order
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggestion Text */}
          <div className="space-y-2">
            <Label htmlFor="suggestion">Design Suggestion Details</Label>
            <Textarea
              id="suggestion"
              placeholder="Describe your design recommendations, coordination ideas, and specific guidance for the group..."
              value={suggestionText}
              onChange={(e) => setSuggestionText(e.target.value)}
              rows={8}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Include details about fabric choices, color coordination, pattern matching, and cultural appropriateness
            </p>
          </div>

          {/* Color Palette Coordinator */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color Palette Selection
            </h4>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color *</Label>
                <Input
                  id="primary-color"
                  type="text"
                  placeholder="e.g., Royal Blue"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary-color">Secondary Color</Label>
                <Input
                  id="secondary-color"
                  type="text"
                  placeholder="e.g., Gold"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent-color">Accent Color</Label>
                <Input
                  id="accent-color"
                  type="text"
                  placeholder="e.g., White"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Reference Images Upload */}
          <div className="space-y-2">
            <Label>Reference Images (Optional)</Label>
            <ImageUpload
              bucket="design-references"
              folder={`group-orders/${groupOrderId}`}
              maxImages={5}
              maxSizeMB={5}
              onUploadComplete={(urls) => setReferenceImages(prev => [...prev, ...urls])}
              onRemove={(url) => setReferenceImages(prev => prev.filter(img => img !== url))}
              initialImages={referenceImages}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !suggestionText.trim() || !primaryColor}
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Sending...' : 'Send Design Suggestion'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Pro Tip:</strong> Include specific fabric recommendations, pattern matching advice, 
          and how family members' outfits should coordinate. Customers appreciate detailed guidance 
          that respects cultural traditions.
        </AlertDescription>
      </Alert>
    </div>
  );
}


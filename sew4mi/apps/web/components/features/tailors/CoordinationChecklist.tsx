'use client';

/**
 * CoordinationChecklist Component
 * Final quality control checklist for ensuring design consistency across all group order items
 * before marking group as complete
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle,
  AlertTriangle,
  Flag,
  Eye
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';

interface ChecklistItem {
  id: string;
  category: 'fabric' | 'color' | 'quality' | 'measurements' | 'finishing';
  title: string;
  description: string;
  completed: boolean;
  notes?: string;
}

export interface CoordinationChecklistProps {
  /** Group order ID */
  groupOrderId: string;
  /** Number of items in the group */
  totalItems: number;
  /** Checklist items */
  initialChecklist?: ChecklistItem[];
  /** Callback when checklist is submitted */
  onSubmit?: (checklist: CompletedChecklist) => Promise<void>;
  /** Loading state */
  isSubmitting?: boolean;
  /** Custom className */
  className?: string;
}

export interface CompletedChecklist {
  groupOrderId: string;
  checklistItems: ChecklistItem[];
  overallNotes: string;
  coordinationPhotos: string[];
  approvedForCompletion: boolean;
}

// Standard coordination checklist items
const STANDARD_CHECKLIST: Omit<ChecklistItem, 'completed' | 'notes'>[] = [
  {
    id: 'fabric-consistency',
    category: 'fabric',
    title: 'Fabric Consistency',
    description: 'Verify all items use fabric from the same lot with consistent color and pattern'
  },
  {
    id: 'color-matching',
    category: 'color',
    title: 'Color Coordination',
    description: 'Check that colors match across all garments as per design plan'
  },
  {
    id: 'pattern-alignment',
    category: 'fabric',
    title: 'Pattern Alignment',
    description: 'For patterned fabrics, ensure patterns are aligned consistently'
  },
  {
    id: 'stitching-quality',
    category: 'quality',
    title: 'Stitching Quality',
    description: 'Inspect all stitching for consistency, strength, and neatness across items'
  },
  {
    id: 'measurement-accuracy',
    category: 'measurements',
    title: 'Measurement Accuracy',
    description: 'Confirm each garment fits properly according to provided measurements'
  },
  {
    id: 'design-consistency',
    category: 'quality',
    title: 'Design Consistency',
    description: 'Ensure design elements (collars, sleeves, hems) are consistent across group'
  },
  {
    id: 'finishing-touches',
    category: 'finishing',
    title: 'Finishing & Pressing',
    description: 'All items are properly finished, pressed, and presentation-ready'
  },
  {
    id: 'button-fasteners',
    category: 'quality',
    title: 'Buttons & Fasteners',
    description: 'Check all buttons, zippers, and fasteners are secure and functional'
  },
  {
    id: 'embellishments',
    category: 'finishing',
    title: 'Embellishments',
    description: 'If applicable, verify beading, embroidery, or decorations are complete'
  },
  {
    id: 'photo-comparison',
    category: 'quality',
    title: 'Photo Comparison',
    description: 'Compare finished items side-by-side for visual coordination check'
  },
  {
    id: 'cultural-appropriateness',
    category: 'quality',
    title: 'Cultural Appropriateness',
    description: 'Confirm design respects cultural traditions for the specific event type'
  },
  {
    id: 'packaging',
    category: 'finishing',
    title: 'Packaging & Labeling',
    description: 'Each item is properly labeled and packaged for the correct family member'
  }
];

/**
 * Quality control checklist for group order completion
 */
export function CoordinationChecklist({
  groupOrderId,
  totalItems,
  initialChecklist,
  onSubmit,
  isSubmitting = false,
  className = ''
}: CoordinationChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    initialChecklist || STANDARD_CHECKLIST.map(item => ({ ...item, completed: false }))
  );
  const [overallNotes, setOverallNotes] = useState('');
  const [coordinationPhotos, setCoordinationPhotos] = useState<string[]>([]);

  /**
   * Toggle checklist item completion
   */
  const toggleItem = (itemId: string) => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, completed: !item.completed }
          : item
      )
    );
  };

  /**
   * Update item notes
   */
  const updateItemNotes = (itemId: string, notes: string) => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, notes }
          : item
      )
    );
  };

  /**
   * Calculate completion percentage
   */
  const completionPercentage = (checklist.filter(item => item.completed).length / checklist.length) * 100;

  /**
   * Check if ready for approval
   */
  const isReadyForApproval = completionPercentage === 100;

  /**
   * Group items by category
   */
  const itemsByCategory = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  /**
   * Get category display name
   */
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      fabric: 'Fabric Coordination',
      color: 'Color Matching',
      quality: 'Quality Control',
      measurements: 'Fit & Measurements',
      finishing: 'Final Finishing'
    };
    return labels[category] || category;
  };

  /**
   * Get category icon
   */
  const getCategoryIcon = (category: string) => {
    const icons = {
      fabric: '🧵',
      color: '🎨',
      quality: '✨',
      measurements: '📏',
      finishing: '👔'
    };
    return icons[category as keyof typeof icons] || '✓';
  };

  /**
   * Handle submission
   */
  const handleSubmit = async () => {
    if (!isReadyForApproval) return;

    const submission: CompletedChecklist = {
      groupOrderId,
      checklistItems: checklist,
      overallNotes,
      coordinationPhotos,
      approvedForCompletion: true
    };

    if (onSubmit) {
      await onSubmit(submission);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Coordination Completion Checklist
          </CardTitle>
          <CardDescription>
            Final quality control before marking group order as complete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Checklist Progress</span>
              <span className="font-medium">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{checklist.filter(i => i.completed).length} of {checklist.length} items completed</span>
              {isReadyForApproval && (
                <span className="text-green-600 font-medium">✓ Ready for approval</span>
              )}
            </div>
          </div>

          {/* Warning if not complete */}
          {!isReadyForApproval && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Complete all checklist items before marking group order as finished
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Eye className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-blue-900">Photo Comparison Tip</p>
              <p className="text-sm text-blue-800">
                Lay all {totalItems} garments side by side and take photos. This helps verify 
                color coordination, pattern matching, and overall visual harmony before delivery.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items by Category */}
      {Object.entries(itemsByCategory).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">{getCategoryIcon(category)}</span>
              {getCategoryLabel(category)}
              <Badge variant="secondary" className="ml-auto">
                {items.filter(i => i.completed).length}/{items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={item.id}
                    checked={item.completed}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={item.id}
                      className={`font-medium cursor-pointer ${
                        item.completed ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.title}
                    </label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </p>
                    
                    {/* Notes input */}
                    {item.completed && (
                      <Textarea
                        placeholder="Add notes or observations (optional)..."
                        value={item.notes || ''}
                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                        rows={2}
                        className="mt-2 text-sm"
                      />
                    )}
                  </div>
                </div>
                {item.id !== items[items.length - 1].id && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Photo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coordination Photos</CardTitle>
          <CardDescription>
            Upload photos showing all items together for visual verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageUpload
            bucket="coordination-photos"
            folder={`group-orders/${groupOrderId}`}
            maxImages={10}
            maxSizeMB={5}
            onUploadComplete={(urls) => setCoordinationPhotos(prev => [...prev, ...urls])}
            onRemove={(url) => setCoordinationPhotos(prev => prev.filter(img => img !== url))}
            initialImages={coordinationPhotos}
          />
        </CardContent>
      </Card>

      {/* Overall Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall Coordination Notes</CardTitle>
          <CardDescription>
            Add any final observations about the group order coordination
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Document any special considerations, customer requests fulfilled, or notable aspects of this group order..."
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>

      {/* Approval Section */}
      {isReadyForApproval ? (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-2">
                    Ready for Final Approval
                  </h4>
                  <p className="text-sm text-green-800 mb-4">
                    All checklist items have been completed. You can now mark this group order 
                    as complete and notify all customers for pickup/delivery.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline">
                  Save Progress
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Mark Group Order Complete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button variant="outline">
            Save Progress
          </Button>
        </div>
      )}

      {/* Quality Standards Reminder */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">Quality Standards Reminder</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>All garments should look coordinated when viewed together</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Check for loose threads, unfinished seams, or missing buttons</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Ensure each item is properly labeled with owner's name</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Package items individually but keep the group together</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


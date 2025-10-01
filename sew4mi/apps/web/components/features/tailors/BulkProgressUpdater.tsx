'use client';

/**
 * BulkProgressUpdater Component
 * Allows tailors to update progress for multiple group order items simultaneously
 * with batch photo upload and automatic customer notifications
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  CheckSquare,
  Send,
  AlertTriangle,
  Users
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/image-upload';
import { GroupOrderItem } from '@sew4mi/shared/types/group-order';
import { OrderStatus } from '@sew4mi/shared/types';

export interface BulkProgressUpdaterProps {
  /** Group order ID */
  groupOrderId: string;
  /** Items in the group order */
  items: GroupOrderItem[];
  /** Callback when update is submitted */
  onUpdate?: (update: BulkProgressUpdate) => Promise<void>;
  /** Loading state */
  isUpdating?: boolean;
  /** Custom className */
  className?: string;
}

export interface BulkProgressUpdate {
  groupOrderId: string;
  selectedItemIds: string[];
  newStatus: OrderStatus;
  progressNotes: string;
  progressPhotos: string[];
  notifyCustomers: boolean;
}

/**
 * Bulk progress updater for group order items
 */
export function BulkProgressUpdater({
  groupOrderId,
  items,
  onUpdate,
  isUpdating = false,
  className = ''
}: BulkProgressUpdaterProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [newStatus, setNewStatus] = useState<OrderStatus>(OrderStatus.IN_PROGRESS);
  const [progressNotes, setProgressNotes] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [notifyCustomers, setNotifyCustomers] = useState(true);

  /**
   * Toggle item selection
   */
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  /**
   * Select all items at same stage
   */
  const selectItemsAtStage = (status: OrderStatus) => {
    const itemsAtStage = items.filter(item => item.status === status);
    const newSelection = new Set(itemsAtStage.map(item => item.id));
    setSelectedItems(newSelection);
  };

  /**
   * Handle bulk update submission
   */
  const handleSubmit = async () => {
    if (selectedItems.size === 0 || !progressNotes.trim()) return;

    const update: BulkProgressUpdate = {
      groupOrderId,
      selectedItemIds: Array.from(selectedItems),
      newStatus,
      progressNotes,
      progressPhotos: uploadedPhotos,
      notifyCustomers
    };

    if (onUpdate) {
      await onUpdate(update);
      // Reset form
      setSelectedItems(new Set());
      setProgressNotes('');
      setUploadedPhotos([]);
    }
  };

  /**
   * Group items by current status
   */
  const itemsByStatus = items.reduce((acc, item) => {
    if (!acc[item.status]) {
      acc[item.status] = [];
    }
    acc[item.status].push(item);
    return acc;
  }, {} as Record<OrderStatus, GroupOrderItem[]>);

  /**
   * Get status badge styling
   */
  const getStatusBadge = (status: OrderStatus) => {
    const styles = {
      [OrderStatus.PENDING]: 'bg-gray-100 text-gray-800',
      [OrderStatus.AWAITING_DEPOSIT]: 'bg-yellow-100 text-yellow-800',
      [OrderStatus.DEPOSIT_RECEIVED]: 'bg-blue-100 text-blue-800',
      [OrderStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-800',
      [OrderStatus.AWAITING_FITTING]: 'bg-purple-100 text-purple-800',
      [OrderStatus.AWAITING_FINAL_PAYMENT]: 'bg-orange-100 text-orange-800',
      [OrderStatus.READY_FOR_DELIVERY]: 'bg-green-100 text-green-800',
      [OrderStatus.COMPLETED]: 'bg-green-600 text-white',
      [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Bulk Progress Updater
          </CardTitle>
          <CardDescription>
            Update progress for multiple items simultaneously and notify customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedItems.size} Selected
              </Badge>
              <span className="text-sm text-muted-foreground">
                of {items.length} total items
              </span>
            </div>
            
            {selectedItems.size > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSelectedItems(new Set())}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Selection by Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Select by Stage</CardTitle>
          <CardDescription>
            Select all items at the same production stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(itemsByStatus).map(([status, statusItems]) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => selectItemsAtStage(status as OrderStatus)}
                className={getStatusBadge(status as OrderStatus)}
              >
                {status.replace(/_/g, ' ')} ({statusItems.length})
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Item Selection List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Select Items to Update</h3>
        <div className="space-y-2">
          {items.map(item => (
            <Card 
              key={item.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedItems.has(item.id) ? 'border-primary ring-2 ring-primary' : ''
              }`}
              onClick={() => toggleItemSelection(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium">{item.familyMemberName}</p>
                        <p className="text-sm text-muted-foreground">{item.garmentType}</p>
                      </div>
                      <Badge className={getStatusBadge(item.status)} variant="outline">
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round(item.progressPercentage)}%</span>
                      </div>
                      <Progress value={item.progressPercentage} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Update Form */}
      {selectedItems.size > 0 && (
        <>
          <Separator />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update Details</CardTitle>
              <CardDescription>
                Provide progress update for {selectedItems.size} selected item(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* New Status Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={OrderStatus.IN_PROGRESS}>In Progress</option>
                  <option value={OrderStatus.AWAITING_FITTING}>Awaiting Fitting</option>
                  <option value={OrderStatus.AWAITING_FINAL_PAYMENT}>Awaiting Final Payment</option>
                  <option value={OrderStatus.READY_FOR_DELIVERY}>Ready for Delivery</option>
                  <option value={OrderStatus.COMPLETED}>Completed</option>
                </select>
              </div>

              {/* Progress Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Progress Notes *</label>
                <Textarea
                  placeholder="Describe the progress update, any issues encountered, or next steps..."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This message will be sent to all customers of the selected items
                </p>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Progress Photos</label>
                <ImageUpload
                  bucket="progress-photos"
                  folder={`group-orders/${groupOrderId}`}
                  maxImages={10}
                  maxSizeMB={5}
                  onUploadComplete={(urls) => setUploadedPhotos(prev => [...prev, ...urls])}
                  onRemove={(url) => setUploadedPhotos(prev => prev.filter(img => img !== url))}
                  initialImages={uploadedPhotos}
                />
              </div>

              {/* Notification Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notify"
                  checked={notifyCustomers}
                  onCheckedChange={(checked) => setNotifyCustomers(checked as boolean)}
                />
                <label
                  htmlFor="notify"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Send notification to all affected customers (via WhatsApp/SMS)
                </label>
              </div>

              {/* Confirmation Alert */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Confirmation Required:</strong> You are about to update {selectedItems.size} item(s) 
                  {notifyCustomers && ' and notify all affected customers'}. This action cannot be undone.
                </AlertDescription>
              </Alert>

              {/* Submit Button */}
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSelectedItems(new Set());
                    setProgressNotes('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={isUpdating || !progressNotes.trim()}
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Updating...' : `Update ${selectedItems.size} Item(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Bulk Update Best Practices
          </h4>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Upload progress photos - customers love visual updates</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Group similar items together for efficient batch processing</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Be specific in your notes - mention materials, techniques used</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Update regularly to keep customers informed and build trust</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


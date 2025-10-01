'use client';

/**
 * ProductionSchedulePlanner Component
 * Drag-and-drop production schedule planner with deadline conflict detection
 * and timeline visualization for group order management
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar,
  Clock,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Save,
  RefreshCw
} from 'lucide-react';
import { ProductionScheduleItem } from '@sew4mi/shared/types/group-order';
import { format, differenceInDays, addDays, isBefore, isAfter } from 'date-fns';

export interface ProductionSchedulePlannerProps {
  /** Group order ID */
  groupOrderId: string;
  /** Event date for the group order */
  eventDate: Date;
  /** Production schedule items */
  scheduleItems: ProductionScheduleItem[];
  /** Tailor's production capacity (hours per day) */
  dailyCapacityHours?: number;
  /** Callback when schedule is updated */
  onSave?: (items: ProductionScheduleItem[]) => Promise<void>;
  /** Loading state */
  isSaving?: boolean;
  /** Custom className */
  className?: string;
}

interface ConflictDetection {
  hasConflict: boolean;
  conflictType?: 'deadline' | 'capacity' | 'dependency';
  message?: string;
  affectedItems?: string[];
}

/**
 * Production schedule planner with conflict detection
 */
export function ProductionSchedulePlanner({
  groupOrderId,
  eventDate,
  scheduleItems,
  dailyCapacityHours = 8,
  onSave,
  isSaving = false,
  className = ''
}: ProductionSchedulePlannerProps) {
  const [items, setItems] = useState<ProductionScheduleItem[]>(
    [...scheduleItems].sort((a, b) => a.priority - b.priority)
  );

  /**
   * Move item up in priority
   */
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    
    // Update priorities
    newItems.forEach((item, idx) => {
      item.priority = idx + 1;
    });
    
    setItems(newItems);
  };

  /**
   * Move item down in priority
   */
  const moveItemDown = (index: number) => {
    if (index === items.length - 1) return;
    
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    
    // Update priorities
    newItems.forEach((item, idx) => {
      item.priority = idx + 1;
    });
    
    setItems(newItems);
  };

  /**
   * Recalculate completion dates based on current ordering
   */
  const recalculateSchedule = () => {
    const updated = items.map((item, index) => {
      // Estimate 3 days per garment on average
      const estimatedDays = 3;
      const startDate = index === 0 
        ? new Date()
        : addDays(new Date(items[index - 1].estimatedCompletionDate), 1);
      
      const completionDate = addDays(startDate, estimatedDays);
      
      return {
        ...item,
        estimatedStartDate: startDate,
        estimatedCompletionDate: completionDate
      };
    });
    
    setItems(updated);
  };

  /**
   * Detect scheduling conflicts
   */
  const conflictDetection = useMemo<ConflictDetection>(() => {
    const conflicts: ConflictDetection = {
      hasConflict: false
    };

    // Check if any items will complete after event date
    const lateItems = items.filter(item => 
      isAfter(new Date(item.estimatedCompletionDate), eventDate)
    );

    if (lateItems.length > 0) {
      conflicts.hasConflict = true;
      conflicts.conflictType = 'deadline';
      conflicts.message = `${lateItems.length} item(s) scheduled to complete after the event date`;
      conflicts.affectedItems = lateItems.map(i => i.orderId);
    }

    // Check for dependency conflicts
    items.forEach(item => {
      if (item.dependencies && item.dependencies.length > 0) {
        const dependencyIndex = items.findIndex(i => i.orderId === item.dependencies![0]);
        const currentIndex = items.findIndex(i => i.orderId === item.orderId);
        
        if (dependencyIndex > currentIndex) {
          conflicts.hasConflict = true;
          conflicts.conflictType = 'dependency';
          conflicts.message = 'Some items are scheduled before their dependencies';
        }
      }
    });

    return conflicts;
  }, [items, eventDate]);

  /**
   * Calculate overall schedule health
   */
  const scheduleHealth = useMemo(() => {
    const totalItems = items.length;
    const onTimeItems = items.filter(item => 
      isBefore(new Date(item.estimatedCompletionDate), eventDate)
    ).length;

    const healthPercentage = (onTimeItems / totalItems) * 100;

    return {
      percentage: healthPercentage,
      status: healthPercentage === 100 ? 'healthy' : healthPercentage >= 80 ? 'warning' : 'critical'
    };
  }, [items, eventDate]);

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (onSave) {
      await onSave(items);
    }
  };

  /**
   * Get status color for completion date
   */
  const getDateStatusColor = (completionDate: Date): string => {
    const daysUntilEvent = differenceInDays(eventDate, completionDate);
    
    if (daysUntilEvent < 0) return 'text-red-600';
    if (daysUntilEvent < 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Schedule Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Production Schedule Planner</CardTitle>
              <CardDescription>
                Organize production order and manage deadlines
              </CardDescription>
            </div>
            
            <Badge 
              variant={scheduleHealth.status === 'healthy' ? 'default' : 'destructive'}
              className="text-sm px-3 py-1"
            >
              {Math.round(scheduleHealth.percentage)}% On Track
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Event Date Warning */}
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>
                  Event Date: <strong>{format(eventDate, 'MMMM dd, yyyy')}</strong>
                </span>
                <span className="text-sm text-muted-foreground">
                  {differenceInDays(eventDate, new Date())} days remaining
                </span>
              </div>
            </AlertDescription>
          </Alert>

          {/* Conflict Warning */}
          {conflictDetection.hasConflict && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Scheduling Conflict:</strong> {conflictDetection.message}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={recalculateSchedule}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recalculate Dates
            </Button>
            
            {onSave && (
              <Button 
                onClick={handleSave}
                disabled={isSaving || conflictDetection.hasConflict}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Schedule'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Health Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Schedule Health</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress 
            value={scheduleHealth.percentage} 
            className={`h-3 ${
              scheduleHealth.status === 'healthy' ? 'bg-green-100' :
              scheduleHealth.status === 'warning' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{items.filter(i => isBefore(new Date(i.estimatedCompletionDate), eventDate)).length} on time</span>
            <span>{items.filter(i => isAfter(new Date(i.estimatedCompletionDate), eventDate)).length} at risk</span>
          </div>
        </CardContent>
      </Card>

      {/* Production Schedule Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Production Queue</h3>
          <Badge variant="secondary">{items.length} Items</Badge>
        </div>

        {items.map((item, index) => {
          const isLate = isAfter(new Date(item.estimatedCompletionDate), eventDate);
          const hasDependency = item.dependencies && item.dependencies.length > 0;

          return (
            <Card 
              key={item.orderId}
              className={`${isLate ? 'border-red-200 bg-red-50' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Priority Controls */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItemUp(index)}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <div className="text-center text-sm font-bold w-6">
                      {item.priority}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveItemDown(index)}
                      disabled={index === items.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator orientation="vertical" className="h-16" />

                  {/* Item Details */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.familyMemberName}</p>
                        <p className="text-sm text-muted-foreground">{item.garmentType}</p>
                      </div>
                      
                      {hasDependency && (
                        <Badge variant="outline" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Has Dependencies
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>Start: {format(new Date(item.estimatedStartDate), 'MMM dd')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={getDateStatusColor(new Date(item.estimatedCompletionDate))}>
                          Complete: {format(new Date(item.estimatedCompletionDate), 'MMM dd, yyyy')}
                        </span>
                      </div>

                      {isLate && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          After Event Date
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Production Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline bar */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
            
            {/* Timeline items */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.orderId} className="flex items-start gap-4 relative">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <p className="font-medium">{item.familyMemberName} - {item.garmentType}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(item.estimatedStartDate), 'MMM dd')} → {format(new Date(item.estimatedCompletionDate), 'MMM dd')}
                      {' '}({differenceInDays(new Date(item.estimatedCompletionDate), new Date(item.estimatedStartDate))} days)
                    </p>
                  </div>
                </div>
              ))}
              
              {/* Event Date Marker */}
              <div className="flex items-start gap-4 relative">
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-green-600">Event Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(eventDate, 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Tips */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h4 className="font-semibold mb-3">Production Planning Tips</h4>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Schedule simpler garments first to build momentum</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Group similar garment types together for efficiency</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Allow buffer time before event date for final adjustments</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600">•</span>
              <span>Complete children's garments first as they're typically simpler</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}


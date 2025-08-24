/**
 * CustomerMilestoneReview component - Comprehensive dashboard for customers to review milestones
 * @file CustomerMilestoneReview.tsx
 */

"use client"

import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, MessageSquare, Eye, Calendar, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderMilestone, MilestoneType } from '@sew4mi/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MilestoneProgress } from './MilestoneProgress';
import { MilestoneTimeline } from './MilestoneTimeline';
import { MilestoneApproval } from './MilestoneApproval';

interface CustomerMilestoneReviewProps {
  orderId: string;
  milestones: OrderMilestone[];
  currentMilestone: MilestoneType;
  tailorName: string;
  orderTitle: string;
  estimatedCompletion?: Date;
  onApprovalUpdate?: () => void;
  className?: string;
}

interface NotificationItem {
  id: string;
  type: 'pending_approval' | 'auto_approval_soon' | 'milestone_completed';
  milestone: MilestoneType;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  deadline?: Date;
}

/**
 * Main CustomerMilestoneReview component
 */
export function CustomerMilestoneReview({
  orderId,
  milestones,
  currentMilestone,
  tailorName,
  orderTitle,
  estimatedCompletion,
  onApprovalUpdate,
  className
}: CustomerMilestoneReviewProps) {
  const [selectedMilestone, setSelectedMilestone] = useState<OrderMilestone | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate statistics
  const totalMilestones = 7;
  const completedMilestones = milestones.filter(m => m.approvalStatus === 'APPROVED').length;
  const pendingMilestones = milestones.filter(m => 
    m.verifiedAt && m.approvalStatus === 'PENDING'
  ).length;
  const rejectedMilestones = milestones.filter(m => m.approvalStatus === 'REJECTED').length;

  // Generate notifications based on milestone status
  useEffect(() => {
    const newNotifications: NotificationItem[] = [];

    milestones.forEach(milestone => {
      if (milestone.verifiedAt && milestone.approvalStatus === 'PENDING') {
        const deadline = new Date(milestone.autoApprovalDeadline!);
        const now = new Date();
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilDeadline <= 6) {
          newNotifications.push({
            id: `urgent-${milestone.id}`,
            type: 'auto_approval_soon',
            milestone: milestone.milestone,
            message: `Auto-approval in ${Math.max(0, Math.floor(hoursUntilDeadline))} hours`,
            urgency: 'high',
            deadline
          });
        } else if (hoursUntilDeadline <= 24) {
          newNotifications.push({
            id: `reminder-${milestone.id}`,
            type: 'auto_approval_soon',
            milestone: milestone.milestone,
            message: `Auto-approval in ${Math.floor(hoursUntilDeadline)} hours`,
            urgency: 'medium',
            deadline
          });
        } else {
          newNotifications.push({
            id: `pending-${milestone.id}`,
            type: 'pending_approval',
            milestone: milestone.milestone,
            message: 'Waiting for your review',
            urgency: 'low',
            deadline
          });
        }
      }
    });

    setNotifications(newNotifications);
  }, [milestones]);

  // Handle milestone approval action
  const handleViewApproval = (milestone: OrderMilestone) => {
    setSelectedMilestone(milestone);
    setShowApprovalModal(true);
  };

  // Handle approval completion
  const handleApprovalComplete = () => {
    setShowApprovalModal(false);
    setSelectedMilestone(null);
    onApprovalUpdate?.();
  };

  // Get urgency color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'border-red-200 bg-red-50 text-red-800';
      case 'medium': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      default: return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <>
      <div className={cn("space-y-6", className)}>
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{orderTitle}</h1>
                <p className="text-muted-foreground">with {tailorName}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Progress</div>
                <div className="text-2xl font-bold">
                  {Math.round((completedMilestones / totalMilestones) * 100)}%
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completedMilestones}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{pendingMilestones}</div>
                <div className="text-xs text-muted-foreground">Pending Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{rejectedMilestones}</div>
                <div className="text-xs text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {totalMilestones - completedMilestones}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
            </div>
            
            {estimatedCompletion && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Estimated completion: {estimatedCompletion.toLocaleDateString()}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Action Required
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map(notification => (
                  <Alert 
                    key={notification.id}
                    className={cn("border", getUrgencyColor(notification.urgency))}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {notification.urgency === 'high' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                        <div>
                          <div className="font-medium">
                            {notification.milestone.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm">{notification.message}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={notification.urgency === 'high' ? 'destructive' : 'outline'}
                        onClick={() => {
                          const milestone = milestones.find(m => m.milestone === notification.milestone);
                          if (milestone) handleViewApproval(milestone);
                        }}
                      >
                        Review Now
                      </Button>
                    </div>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main content tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Detailed Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <MilestoneProgress
              milestones={milestones}
              currentMilestone={currentMilestone}
              totalMilestones={totalMilestones}
            />

            {/* Quick actions for pending milestones */}
            {pendingMilestones > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Pending Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {milestones
                      .filter(m => m.verifiedAt && m.approvalStatus === 'PENDING')
                      .map(milestone => {
                        const deadline = new Date(milestone.autoApprovalDeadline!);
                        const hoursLeft = Math.floor((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60));
                        
                        return (
                          <div 
                            key={milestone.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <div className="font-medium">
                                {milestone.milestone.replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Submitted: {new Date(milestone.verifiedAt!).toLocaleDateString()}
                              </div>
                              <div className={cn(
                                "text-xs",
                                hoursLeft <= 6 ? "text-red-600 font-medium" : "text-muted-foreground"
                              )}>
                                Auto-approves in {Math.max(0, hoursLeft)} hours
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewApproval(milestone)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Review
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <MilestoneTimeline
              milestones={milestones}
              orderId={orderId}
              userRole="customer"
              onViewApproval={handleViewApproval}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Approval Modal */}
      {selectedMilestone && (
        <MilestoneApproval
          milestone={selectedMilestone}
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onApprovalComplete={handleApprovalComplete}
        />
      )}
    </>
  );
}

export default CustomerMilestoneReview;
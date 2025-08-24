/**
 * Component for tracking and displaying milestone approval history
 * @file MilestoneApprovalHistory.tsx
 */

"use client"

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  Eye,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ApprovalHistoryEntry {
  id: string;
  milestoneId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  tailorId: string;
  tailorName: string;
  milestone: string;
  action: 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';
  comment?: string;
  reviewedAt: Date;
  photoUrl?: string;
  rejectionReason?: string;
  autoApprovalDeadline?: Date;
  orderTitle: string;
}

interface MilestoneApprovalHistoryProps {
  orderId?: string;
  tailorId?: string;
  customerId?: string;
  className?: string;
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'REJECTED':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'AUTO_APPROVED':
      return <Clock className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  const getVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'default';
      case 'REJECTED': return 'destructive';
      case 'AUTO_APPROVED': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Badge variant={getVariant(status)} className="flex items-center gap-1">
      <StatusIcon status={status} />
      {status.replace('_', ' ')}
    </Badge>
  );
}

/**
 * Main approval history component
 */
export function MilestoneApprovalHistory({ 
  orderId, 
  tailorId, 
  customerId, 
  className 
}: MilestoneApprovalHistoryProps) {
  const [history, setHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Fetch approval history
  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (orderId) params.append('orderId', orderId);
      if (tailorId) params.append('tailorId', tailorId);
      if (customerId) params.append('customerId', customerId);
      
      const response = await fetch(`/api/admin/milestones/approval-history?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch approval history');
      }

      const historyData = result.data.map((item: any) => ({
        ...item,
        reviewedAt: new Date(item.reviewedAt),
        autoApprovalDeadline: item.autoApprovalDeadline 
          ? new Date(item.autoApprovalDeadline) 
          : undefined
      }));

      setHistory(historyData);
      setFilteredHistory(historyData);
    } catch (error) {
      console.error('Error fetching approval history:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...history];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.customerName.toLowerCase().includes(term) ||
        entry.tailorName.toLowerCase().includes(term) ||
        entry.orderTitle.toLowerCase().includes(term) ||
        entry.milestone.toLowerCase().includes(term) ||
        entry.comment?.toLowerCase().includes(term) ||
        entry.rejectionReason?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => entry.action === statusFilter);
    }

    // Milestone filter
    if (milestoneFilter !== 'all') {
      filtered = filtered.filter(entry => entry.milestone === milestoneFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateFilter) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      
      filtered = filtered.filter(entry => entry.reviewedAt >= startDate);
    }

    setFilteredHistory(filtered);
  }, [history, searchTerm, statusFilter, milestoneFilter, dateFilter]);

  // Fetch data on mount
  useEffect(() => {
    fetchHistory();
  }, [orderId, tailorId, customerId]);

  // Get unique milestones for filter
  const uniqueMilestones = [...new Set(history.map(entry => entry.milestone))];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Error loading approval history: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Approval History ({filteredHistory.length})
          </span>
        </CardTitle>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, customers, tailors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="AUTO_APPROVED">Auto-approved</SelectItem>
            </SelectContent>
          </Select>

          <Select value={milestoneFilter} onValueChange={setMilestoneFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Milestones</SelectItem>
              {uniqueMilestones.map(milestone => (
                <SelectItem key={milestone} value={milestone}>
                  {milestone.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>No approval history found</p>
            {(searchTerm || statusFilter !== 'all' || milestoneFilter !== 'all' || dateFilter !== 'all') && (
              <p className="text-sm">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{entry.orderTitle}</h3>
                      <StatusBadge status={entry.action} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.milestone.replace(/_/g, ' ')} milestone
                    </p>
                  </div>
                  
                  <div className="text-xs text-muted-foreground text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" />
                      {entry.reviewedAt.toLocaleDateString()}
                    </div>
                    <div>{entry.reviewedAt.toLocaleTimeString()}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Customer:</strong> {entry.customerName}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Tailor:</strong> {entry.tailorName}
                    </span>
                  </div>
                </div>

                {/* Comments and rejection reasons */}
                {(entry.comment || entry.rejectionReason) && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    {entry.rejectionReason && (
                      <div className="flex items-start gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-600">Rejection Reason:</p>
                          <p className="text-sm">{entry.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                    
                    {entry.comment && (
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Comment:</p>
                          <p className="text-sm">{entry.comment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto-approval info */}
                {entry.action === 'AUTO_APPROVED' && entry.autoApprovalDeadline && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        Auto-approved after deadline: {entry.autoApprovalDeadline.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Photo link */}
                {entry.photoUrl && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(entry.photoUrl, '_blank')}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Photo
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MilestoneApprovalHistory;
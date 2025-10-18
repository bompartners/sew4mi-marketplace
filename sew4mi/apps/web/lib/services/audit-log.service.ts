/**
 * Audit Logging Service
 * Logs all sensitive operations for security and compliance
 */

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

export enum AuditAction {
  // Group Order Actions
  GROUP_ORDER_CREATED = 'group_order_created',
  GROUP_ORDER_UPDATED = 'group_order_updated',
  GROUP_ORDER_DELETED = 'group_order_deleted',
  GROUP_ORDER_COMPLETED = 'group_order_completed',
  
  // Bulk Operations
  BULK_PROGRESS_UPDATE = 'bulk_progress_update',
  BULK_STATUS_CHANGE = 'bulk_status_change',
  
  // Design Actions
  DESIGN_SUGGESTION_CREATED = 'design_suggestion_created',
  DESIGN_SUGGESTION_APPROVED = 'design_suggestion_approved',
  DESIGN_SUGGESTION_REJECTED = 'design_suggestion_rejected',
  
  // Fabric Actions
  FABRIC_ALLOCATION_UPDATED = 'fabric_allocation_updated',
  
  // Schedule Actions
  PRODUCTION_SCHEDULE_UPDATED = 'production_schedule_updated',
  
  // Messaging Actions
  BROADCAST_MESSAGE_SENT = 'broadcast_message_sent',
  INDIVIDUAL_MESSAGE_SENT = 'individual_message_sent',
  
  // Checklist Actions
  CHECKLIST_COMPLETED = 'checklist_completed',
  CHECKLIST_APPROVED = 'checklist_approved',
  
  // Access Actions
  UNAUTHORIZED_ACCESS_ATTEMPT = 'unauthorized_access_attempt',
  PERMISSION_DENIED = 'permission_denied',
  
  // Data Actions
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion'
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface AuditLogEntry {
  action: AuditAction;
  actor_id: string;
  actor_type: 'user' | 'system' | 'api';
  resource_type: string;
  resource_id: string;
  severity: AuditSeverity;
  description: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

export class AuditLogService {
  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    const supabase = createServerSupabaseClient();

    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    };

    const { error } = await supabase
      .from('audit_logs')
      .insert(logEntry);

    if (error) {
      console.error('Failed to write audit log:', error);
      // Don't throw - audit logging should never break the application
    }

    // For critical events, also log to external monitoring
    if (entry.severity === AuditSeverity.CRITICAL) {
      this.logToCriticalMonitoring(logEntry);
    }
  }

  /**
   * Log bulk progress update
   */
  async logBulkProgressUpdate(
    actorId: string,
    groupOrderId: string,
    itemIds: string[],
    newStatus: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.BULK_PROGRESS_UPDATE,
      actor_id: actorId,
      actor_type: 'user',
      resource_type: 'group_order',
      resource_id: groupOrderId,
      severity: AuditSeverity.INFO,
      description: `Bulk updated ${itemIds.length} items to status: ${newStatus}`,
      metadata: {
        itemIds,
        newStatus,
        itemCount: itemIds.length
      },
      ip_address: ipAddress
    });
  }

  /**
   * Log design suggestion submission
   */
  async logDesignSuggestion(
    actorId: string,
    groupOrderId: string,
    suggestionId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.DESIGN_SUGGESTION_CREATED,
      actor_id: actorId,
      actor_type: 'user',
      resource_type: 'group_order',
      resource_id: groupOrderId,
      severity: AuditSeverity.INFO,
      description: 'Design suggestion submitted',
      metadata: {
        suggestionId
      },
      ip_address: ipAddress
    });
  }

  /**
   * Log broadcast message
   */
  async logBroadcastMessage(
    actorId: string,
    groupOrderId: string,
    recipientCount: number,
    channel: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.BROADCAST_MESSAGE_SENT,
      actor_id: actorId,
      actor_type: 'user',
      resource_type: 'group_order',
      resource_id: groupOrderId,
      severity: AuditSeverity.INFO,
      description: `Broadcast message sent to ${recipientCount} recipients via ${channel}`,
      metadata: {
        recipientCount,
        channel
      },
      ip_address: ipAddress
    });
  }

  /**
   * Log checklist completion
   */
  async logChecklistCompletion(
    actorId: string,
    groupOrderId: string,
    approved: boolean,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      action: approved ? AuditAction.CHECKLIST_APPROVED : AuditAction.CHECKLIST_COMPLETED,
      actor_id: actorId,
      actor_type: 'user',
      resource_type: 'group_order',
      resource_id: groupOrderId,
      severity: approved ? AuditSeverity.WARNING : AuditSeverity.INFO,
      description: approved
        ? 'Coordination checklist approved - Group order marked as complete'
        : 'Coordination checklist saved',
      metadata: {
        approved
      },
      ip_address: ipAddress
    });
  }

  /**
   * Log unauthorized access attempt
   */
  async logUnauthorizedAccess(
    actorId: string,
    resourceType: string,
    resourceId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT,
      actor_id: actorId,
      actor_type: 'user',
      resource_type: resourceType,
      resource_id: resourceId,
      severity: AuditSeverity.WARNING,
      description: `Unauthorized access attempt to ${resourceType} ${resourceId}`,
      metadata: {
        attempted_resource: resourceId
      },
      ip_address: ipAddress,
      user_agent: userAgent
    });
  }

  /**
   * Log permission denied
   */
  async logPermissionDenied(
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      action: AuditAction.PERMISSION_DENIED,
      actor_id: actorId,
      actor_type: 'user',
      resource_type: resourceType,
      resource_id: resourceId,
      severity: AuditSeverity.WARNING,
      description: `Permission denied for action: ${action}`,
      metadata: {
        attempted_action: action
      },
      ip_address: ipAddress
    });
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters: {
    actorId?: string;
    resourceId?: string;
    action?: AuditAction;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    const supabase = createServerSupabaseClient();
    
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filters.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }
    if (filters.startDate) {
      query = query.gte('timestamp', filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte('timestamp', filters.endDate.toISOString());
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(
    actorId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsBySeverity: Record<string, number>;
  }> {
    const filters: any = { limit: 10000 };
    if (actorId) filters.actorId = actorId;
    if (timeRange) {
      filters.startDate = timeRange.start;
      filters.endDate = timeRange.end;
    }

    const logs = await this.queryLogs(filters);

    const eventsByAction: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};

    logs.forEach(log => {
      eventsByAction[log.action] = (eventsByAction[log.action] || 0) + 1;
      eventsBySeverity[log.severity] = (eventsBySeverity[log.severity] || 0) + 1;
    });

    return {
      totalEvents: logs.length,
      eventsByAction,
      eventsBySeverity
    };
  }

  /**
   * Log to external critical monitoring system
   */
  private logToCriticalMonitoring(entry: AuditLogEntry): void {
    // TODO: Integrate with external monitoring (Sentry, DataDog, etc.)
    console.error('[CRITICAL AUDIT EVENT]', entry);
  }

  /**
   * Export audit logs for compliance
   */
  async exportLogs(
    filters: {
      startDate: Date;
      endDate: Date;
      format?: 'json' | 'csv';
    }
  ): Promise<string> {
    const logs = await this.queryLogs({
      startDate: filters.startDate,
      endDate: filters.endDate
    });

    if (filters.format === 'csv') {
      return this.convertToCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Convert logs to CSV format
   */
  private convertToCSV(logs: AuditLogEntry[]): string {
    const headers = ['timestamp', 'action', 'actor_id', 'resource_type', 'resource_id', 'severity', 'description'];
    const rows = logs.map(log =>
      headers.map(header => {
        const value = log[header as keyof AuditLogEntry];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}

/**
 * Helper to get IP address from request
 */
export function getIPAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Helper to get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}


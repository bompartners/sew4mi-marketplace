'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FileText, 
  Search, 
  Filter, 
  Shield,
  Clock,
  User,
  Activity,
  AlertTriangle,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Download
} from 'lucide-react';
import { 
  hasPermission,
  PERMISSIONS,
  ROLE_LABELS
} from '@sew4mi/shared';

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: any;
  new_values: any;
  user_id?: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
  metadata: {
    action_type?: string;
    from_role?: string;
    to_role?: string;
    admin_user_id?: string;
    [key: string]: any;
  };
  user?: {
    email: string;
    full_name?: string;
  };
}

export default function AuditLogsPage() {
  const { userRole } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  // Check if user has admin permissions
  const canViewAuditLogs = userRole && hasPermission(userRole, PERMISSIONS.VIEW_AUDIT_LOGS);

  const fetchAuditLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/audit-logs');
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canViewAuditLogs) {
      fetchAuditLogs();
    }
  }, [canViewAuditLogs, fetchAuditLogs]);

  useEffect(() => {
    // Filter logs based on search and filters
    let filtered = logs;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.metadata?.action_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Table filter
    if (tableFilter !== 'all') {
      filtered = filtered.filter(log => log.table_name === tableFilter);
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate: Date;

      switch (timeFilter) {
        case '1h':
          cutoffDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(log => new Date(log.performed_at) >= cutoffDate);
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, tableFilter, actionFilter, timeFilter]);

  const exportLogs = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            table: tableFilter,
            action: actionFilter,
            time: timeFilter,
            search: searchQuery
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to export logs');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to export logs');
    }
  };

  if (!canViewAuditLogs) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access audit logs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
        return <Edit className="w-4 h-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatLogDescription = (log: AuditLog) => {
    const actionType = log.metadata?.action_type;
    
    if (actionType === 'admin_role_change') {
      const fromRole = log.metadata?.from_role;
      const toRole = log.metadata?.to_role;
      return `Role changed from ${ROLE_LABELS[fromRole as keyof typeof ROLE_LABELS] || fromRole} to ${ROLE_LABELS[toRole as keyof typeof ROLE_LABELS] || toRole}`;
    }
    
    if (actionType === 'tailor_application_approved') {
      return 'Tailor application approved - user promoted to tailor';
    }
    
    if (actionType === 'user_registration') {
      return 'New user registration';
    }
    
    // Default description based on action
    switch (log.action) {
      case 'INSERT':
        return `Created new ${log.table_name.replace('_', ' ')} record`;
      case 'UPDATE':
        return `Updated ${log.table_name.replace('_', ' ')} record`;
      case 'DELETE':
        return `Deleted ${log.table_name.replace('_', ' ')} record`;
      default:
        return `${log.action} operation on ${log.table_name}`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <FileText className="w-8 h-8 mr-3 text-[#CE1126]" />
            Audit Logs
          </h1>
          <p className="text-muted-foreground mt-1">
            System-wide audit trail for security and compliance
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={fetchAuditLogs} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportLogs} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by table, action, user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Table: {tableFilter === 'all' ? 'All' : tableFilter.replace('_', ' ')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTableFilter('all')}>
                  All Tables
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTableFilter('users')}>
                  Users
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTableFilter('tailor_applications')}>
                  Tailor Applications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTableFilter('role_change_requests')}>
                  Role Changes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTableFilter('orders')}>
                  Orders
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Action: {actionFilter === 'all' ? 'All' : actionFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setActionFilter('all')}>
                  All Actions
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActionFilter('INSERT')}>
                  INSERT
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActionFilter('UPDATE')}>
                  UPDATE
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActionFilter('DELETE')}>
                  DELETE
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Clock className="w-4 h-4 mr-2" />
                  Time: {timeFilter === 'all' ? 'All' : timeFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setTimeFilter('all')}>
                  All Time
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setTimeFilter('1h')}>
                  Last Hour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeFilter('24h')}>
                  Last 24 Hours
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeFilter('7d')}>
                  Last 7 Days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTimeFilter('30d')}>
                  Last 30 Days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit Logs ({filteredLogs.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No audit logs found matching the current filters.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    {getActionIcon(log.action)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium">{formatLogDescription(log)}</span>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {log.table_name.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-x-4">
                      {log.user && (
                        <span className="flex items-center inline">
                          <User className="w-3 h-3 mr-1" />
                          {log.user.full_name || log.user.email}
                        </span>
                      )}
                      <span className="flex items-center inline">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTimestamp(log.performed_at)}
                      </span>
                      {log.ip_address && (
                        <span>IP: {log.ip_address}</span>
                      )}
                    </div>
                    
                    {/* Additional metadata for important actions */}
                    {log.metadata?.action_type === 'admin_role_change' && log.metadata?.reason && (
                      <div className="mt-2 text-xs bg-blue-50 text-blue-800 px-2 py-1 rounded">
                        Reason: {log.metadata.reason}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {new Date(log.performed_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
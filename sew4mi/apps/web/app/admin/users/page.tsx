'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  Shield,
  UserX,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { 
  USER_ROLES, 
  ROLE_LABELS,
  UserRole,
  hasPermission,
  PERMISSIONS,
  canManageUser
} from '@sew4mi/shared';

interface User {
  id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed?: boolean;
  phone_verified?: boolean;
  metadata: {
    tailor_application_status?: string;
    verification_status?: string;
  };
}

export default function AdminUsersPage() {
  const { userRole } = useAuth();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user has admin permissions
  const canViewUsers = userRole && hasPermission(userRole, PERMISSIONS.VIEW_ALL_USERS);
  const canEditRoles = userRole && hasPermission(userRole, PERMISSIONS.EDIT_USER_ROLES);

  useEffect(() => {
    if (canViewUsers) {
      fetchUsers();
    }
  }, [canViewUsers]);

  useEffect(() => {
    // Apply initial filter from URL params
    const filter = searchParams.get('filter');
    if (filter === 'pending_tailors') {
      setRoleFilter('TAILOR');
      setStatusFilter('pending_application');
    }
  }, [searchParams]);

  useEffect(() => {
    // Filter users based on search and filters
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone_number?.includes(searchQuery)
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'verified':
          filtered = filtered.filter(user => user.email_confirmed && user.phone_verified);
          break;
        case 'unverified':
          filtered = filtered.filter(user => !user.email_confirmed || !user.phone_verified);
          break;
        case 'pending_application':
          filtered = filtered.filter(user => 
            user.metadata?.tailor_application_status === 'PENDING'
          );
          break;
      }
    }

    setFilteredUsers(filtered);
  }, [users, searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole, reason?: string) => {
    if (!canEditRoles) return;

    try {
      setActionLoading(true);
      const response = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          newRole,
          reason: reason || 'Admin role change'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change user role');
      }

      await fetchUsers(); // Refresh data
      setSelectedUser(null);
    } catch (error) {
      console.error('Error changing role:', error);
      setError(error instanceof Error ? error.message : 'Failed to change role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    if (!canEditRoles) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/admin/users/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} user`);
      }

      await fetchUsers(); // Refresh data
    } catch (error) {
      console.error(`Error ${action} user:`, error);
      setError(error instanceof Error ? error.message : `Failed to ${action} user`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!canViewUsers) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access user management.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'bg-red-100 text-red-800 border-red-200';
      case USER_ROLES.TAILOR:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case USER_ROLES.CUSTOMER:
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusIcon = (user: User) => {
    if (!user.email_confirmed) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    } else if (user.metadata?.tailor_application_status === 'PENDING') {
      return <Clock className="w-4 h-4 text-yellow-500" />;
    } else {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Users className="w-8 h-8 mr-3 text-[#CE1126]" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage platform users, roles, and permissions
          </p>
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
                  placeholder="Search by email, name, or phone..."
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
                  Role: {roleFilter === 'all' ? 'All' : ROLE_LABELS[roleFilter as UserRole]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRoleFilter('all')}>
                  All Roles
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <DropdownMenuItem key={role} onClick={() => setRoleFilter(role)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Status: {statusFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                  All Status
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setStatusFilter('verified')}>
                  Verified
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('unverified')}>
                  Unverified
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('pending_application')}>
                  Pending Application
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <Button onClick={fetchUsers} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {getStatusIcon(user)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">
                          {user.full_name || user.email.split('@')[0]}
                        </h4>
                        <Badge className={getRoleColor(user.role)}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                        {user.metadata?.tailor_application_status === 'PENDING' && (
                          <Badge variant="outline" className="text-xs">
                            Application Pending
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-x-4">
                        <span>{user.email}</span>
                        {user.phone_number && <span>{user.phone_number}</span>}
                        <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                        {user.last_sign_in_at && (
                          <span>Last seen {new Date(user.last_sign_in_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {canEditRoles && canManageUser(userRole!, user.role) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={actionLoading}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => setSelectedUser(user)}
                          className="flex items-center"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Change Role
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem className="flex items-center">
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => handleUserAction(user.id, 'suspend')}
                          className="flex items-center text-orange-600"
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Suspend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Change Dialog */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Change the role for {selectedUser.full_name || selectedUser.email}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  Current Role: <Badge className={getRoleColor(selectedUser.role)}>
                    {ROLE_LABELS[selectedUser.role]}
                  </Badge>
                </p>
                
                <div className="space-y-2">
                  {Object.entries(ROLE_LABELS).map(([role, label]) => {
                    const canChangeToRole = canManageUser(userRole!, role as UserRole);
                    return (
                      <Button
                        key={role}
                        variant={selectedUser.role === role ? "default" : "outline"}
                        onClick={() => handleRoleChange(selectedUser.id, role as UserRole)}
                        disabled={!canChangeToRole || actionLoading || selectedUser.role === role}
                        className="w-full justify-start"
                      >
                        {label}
                        {selectedUser.role === role && <CheckCircle className="w-4 h-4 ml-auto" />}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
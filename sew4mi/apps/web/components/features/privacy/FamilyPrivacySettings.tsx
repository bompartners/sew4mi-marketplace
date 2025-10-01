'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield,
  Eye,
  EyeOff,
  Users,
  UserCheck,
  UserX,
  Settings,
  Lock,
  Unlock,
  Share,
  Bell,
  AlertTriangle,
  CheckCircle,
  Copy,
  Trash2,
  Edit,
  Plus,
  Clock,
  Calendar,
  Key
} from 'lucide-react';
import { 
  FamilyMeasurementProfile, 
  ProfileVisibility, 
  FamilyPermission
} from '@sew4mi/shared/types/family-profiles';
import { cn } from '@/lib/utils';

export interface PrivacyRule {
  id: string;
  profileId: string;
  visibility: ProfileVisibility;
  shareWithFamily: boolean;
  allowEditing: boolean;
  restrictedMeasurements: string[];
  temporaryAccess?: {
    expiresAt: Date;
    grantedTo: string[];
    purpose: string;
  };
  auditLog: Array<{
    timestamp: Date;
    action: string;
    userId: string;
    details: string;
  }>;
}

export interface FamilyInvite {
  id: string;
  inviteCode: string;
  invitedEmail?: string;
  invitedPhone?: string;
  relationship: string;
  permissions: FamilyPermission[];
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  createdBy: string;
  createdAt: Date;
}

export interface FamilyPrivacySettingsProps {
  profiles: FamilyMeasurementProfile[];
  privacyRules: PrivacyRule[];
  familyInvites: FamilyInvite[];
  onUpdatePrivacy: (profileId: string, settings: Partial<PrivacyRule>) => void;
  onInviteFamilyMember: (invite: Omit<FamilyInvite, 'id' | 'createdAt' | 'status'>) => void;
  onRevokeInvite: (inviteId: string) => void;
  onRevokeAccess: (profileId: string, userId: string) => void;
  onGrantTemporaryAccess: (profileId: string, access: PrivacyRule['temporaryAccess']) => void;
  className?: string;
}

const VISIBILITY_OPTIONS = [
  {
    value: ProfileVisibility.PRIVATE,
    label: 'Private',
    description: 'Only you can see and use these measurements',
    icon: Lock
  },
  {
    value: ProfileVisibility.FAMILY_ONLY,
    label: 'Family Only',
    description: 'Shared with approved family members only',
    icon: Users
  },
  {
    value: ProfileVisibility.PUBLIC,
    label: 'Public',
    description: 'Visible to all users (measurements hidden)',
    icon: Eye
  }
];

const PERMISSION_OPTIONS = [
  {
    value: FamilyPermission.VIEW_MEASUREMENTS,
    label: 'View Measurements',
    description: 'Can see measurement data'
  },
  {
    value: FamilyPermission.UPDATE_MEASUREMENTS,
    label: 'Update Measurements',
    description: 'Can add new measurements'
  },
  {
    value: FamilyPermission.CREATE_ORDERS,
    label: 'Create Orders',
    description: 'Can place orders using measurements'
  },
  {
    value: FamilyPermission.MANAGE_PROFILE,
    label: 'Manage Profile',
    description: 'Can edit profile information'
  }
];

const SENSITIVE_MEASUREMENTS = [
  'chest', 'waist', 'hips', 'inseam', 'weight', 'height'
];

export function FamilyPrivacySettings({
  profiles,
  privacyRules,
  familyInvites,
  onUpdatePrivacy,
  onInviteFamilyMember,
  onRevokeInvite,
  onRevokeAccess,
  onGrantTemporaryAccess,
  className
}: FamilyPrivacySettingsProps) {
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    invitedEmail: '',
    invitedPhone: '',
    relationship: '',
    permissions: [] as FamilyPermission[],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });
  const [temporaryAccess, setTemporaryAccess] = useState({
    profileId: '',
    duration: 7, // days
    purpose: '',
    measurements: [] as string[]
  });

  // Get privacy rule for profile
  const getPrivacyRule = (profileId: string): PrivacyRule | undefined => {
    return privacyRules.find(rule => rule.profileId === profileId);
  };

  // Update profile privacy settings
  const handlePrivacyUpdate = (profileId: string, field: string, value: any) => {
    const currentRule = getPrivacyRule(profileId);
    const updates = { [field]: value };
    
    onUpdatePrivacy(profileId, updates);
  };

  // Handle invite submission
  const handleInviteSubmit = () => {
    if (!inviteData.invitedEmail && !inviteData.invitedPhone) return;
    if (inviteData.permissions.length === 0) return;

    onInviteFamilyMember({
      inviteCode: generateInviteCode(),
      invitedEmail: inviteData.invitedEmail || undefined,
      invitedPhone: inviteData.invitedPhone || undefined,
      relationship: inviteData.relationship,
      permissions: inviteData.permissions,
      expiresAt: inviteData.expiresAt,
      createdBy: 'current-user' // Replace with actual user ID
    });

    // Reset form
    setInviteData({
      invitedEmail: '',
      invitedPhone: '',
      relationship: '',
      permissions: [],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    setShowInviteForm(false);
  };

  // Generate invite code
  const generateInviteCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Handle temporary access grant
  const handleGrantTemporaryAccess = () => {
    if (!temporaryAccess.profileId || !temporaryAccess.purpose) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + temporaryAccess.duration);

    onGrantTemporaryAccess(temporaryAccess.profileId, {
      expiresAt,
      grantedTo: [], // Will be populated when used
      purpose: temporaryAccess.purpose
    });

    setTemporaryAccess({
      profileId: '',
      duration: 7,
      purpose: '',
      measurements: []
    });
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get visibility icon
  const getVisibilityIcon = (visibility: ProfileVisibility) => {
    switch (visibility) {
      case ProfileVisibility.PRIVATE:
        return <Lock className="h-4 w-4 text-red-500" />;
      case ProfileVisibility.FAMILY_ONLY:
        return <Users className="h-4 w-4 text-blue-500" />;
      case ProfileVisibility.PUBLIC:
        return <Eye className="h-4 w-4 text-green-500" />;
      default:
        return <EyeOff className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Privacy & Sharing Settings
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage who can access your family's measurement profiles and what they can do with them
        </p>
      </div>

      <Tabs defaultValue="profiles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profiles">Profile Privacy</TabsTrigger>
          <TabsTrigger value="family">Family Access</TabsTrigger>
          <TabsTrigger value="sharing">Sharing & Invites</TabsTrigger>
        </TabsList>

        {/* Profile Privacy Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Individual Profile Settings</CardTitle>
              <p className="text-sm text-gray-600">
                Configure privacy settings for each family member's measurements
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profiles.map(profile => {
                  const rule = getPrivacyRule(profile.id);
                  
                  return (
                    <Card key={profile.id} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium">
                              {profile.nickname.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{profile.nickname}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              {getVisibilityIcon(rule?.visibility || ProfileVisibility.PRIVATE)}
                              <span>
                                {VISIBILITY_OPTIONS.find(opt => opt.value === rule?.visibility)?.label || 'Private'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProfile(
                            selectedProfile === profile.id ? null : profile.id
                          )}
                        >
                          {selectedProfile === profile.id ? 'Collapse' : 'Configure'}
                        </Button>
                      </div>

                      {selectedProfile === profile.id && (
                        <div className="space-y-6 pt-4 border-t">
                          {/* Visibility Setting */}
                          <div>
                            <Label className="text-base font-medium mb-3 block">Profile Visibility</Label>
                            <div className="grid gap-3">
                              {VISIBILITY_OPTIONS.map(option => {
                                const IconComponent = option.icon;
                                const isSelected = rule?.visibility === option.value;
                                
                                return (
                                  <div
                                    key={option.value}
                                    className={cn(
                                      "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                                      isSelected ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:bg-gray-50"
                                    )}
                                    onClick={() => handlePrivacyUpdate(profile.id, 'visibility', option.value)}
                                  >
                                    <div className={cn(
                                      "flex-shrink-0 w-5 h-5 border-2 rounded-full flex items-center justify-center mt-0.5",
                                      isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300"
                                    )}>
                                      {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                                    </div>
                                    
                                    <IconComponent className={cn(
                                      "h-5 w-5 mt-0.5",
                                      isSelected ? "text-blue-600" : "text-gray-400"
                                    )} />
                                    
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{option.label}</div>
                                      <div className="text-xs text-gray-500">{option.description}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Family Sharing Settings */}
                          <div className="space-y-4">
                            <Label className="text-base font-medium">Family Sharing Options</Label>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <Label htmlFor={`share-family-${profile.id}`} className="font-medium">
                                  Share with Family
                                </Label>
                                <p className="text-sm text-gray-600">
                                  Allow approved family members to view measurements
                                </p>
                              </div>
                              <Switch
                                id={`share-family-${profile.id}`}
                                checked={rule?.shareWithFamily || false}
                                onCheckedChange={(checked) => 
                                  handlePrivacyUpdate(profile.id, 'shareWithFamily', checked)
                                }
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <Label htmlFor={`allow-editing-${profile.id}`} className="font-medium">
                                  Allow Family Editing
                                </Label>
                                <p className="text-sm text-gray-600">
                                  Let family members update measurements and create orders
                                </p>
                              </div>
                              <Switch
                                id={`allow-editing-${profile.id}`}
                                checked={rule?.allowEditing || false}
                                onCheckedChange={(checked) => 
                                  handlePrivacyUpdate(profile.id, 'allowEditing', checked)
                                }
                              />
                            </div>
                          </div>

                          {/* Restricted Measurements */}
                          <div>
                            <Label className="text-base font-medium mb-3 block">
                              Restricted Measurements
                            </Label>
                            <p className="text-sm text-gray-600 mb-3">
                              Select sensitive measurements to keep private even from family
                            </p>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {SENSITIVE_MEASUREMENTS.map(measurement => (
                                <div key={measurement} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`restrict-${profile.id}-${measurement}`}
                                    checked={rule?.restrictedMeasurements?.includes(measurement) || false}
                                    onChange={(e) => {
                                      const current = rule?.restrictedMeasurements || [];
                                      const updated = e.target.checked
                                        ? [...current, measurement]
                                        : current.filter(m => m !== measurement);
                                      handlePrivacyUpdate(profile.id, 'restrictedMeasurements', updated);
                                    }}
                                  />
                                  <Label 
                                    htmlFor={`restrict-${profile.id}-${measurement}`}
                                    className="text-sm capitalize cursor-pointer"
                                  >
                                    {measurement}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Access Tab */}
        <TabsContent value="family" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Family Account Management</CardTitle>
              <p className="text-sm text-gray-600">
                Manage who has access to your family's measurements and their permissions
              </p>
            </CardHeader>
            <CardContent>
              {/* Current Family Members */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Current Family Members</h4>
                
                {/* This would be populated with actual family members */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <UserCheck className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">You (Primary Account)</div>
                        <div className="text-xs text-gray-500">Full access to all profiles</div>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Owner</Badge>
                  </div>
                </div>

                {/* Invite New Member */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={() => setShowInviteForm(true)}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Family Member
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Temporary Access */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Temporary Access</CardTitle>
              <p className="text-sm text-gray-600">
                Grant temporary access to measurements for specific purposes
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="temp-profile">Profile</Label>
                    <Select 
                      value={temporaryAccess.profileId} 
                      onValueChange={(value) => setTemporaryAccess(prev => ({ ...prev, profileId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.nickname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="temp-duration">Duration (Days)</Label>
                    <Input
                      id="temp-duration"
                      type="number"
                      min="1"
                      max="30"
                      value={temporaryAccess.duration}
                      onChange={(e) => setTemporaryAccess(prev => ({ 
                        ...prev, 
                        duration: parseInt(e.target.value) || 7 
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="temp-purpose">Purpose</Label>
                  <Textarea
                    id="temp-purpose"
                    placeholder="Explain why temporary access is needed..."
                    value={temporaryAccess.purpose}
                    onChange={(e) => setTemporaryAccess(prev => ({ ...prev, purpose: e.target.value }))}
                    rows={3}
                  />
                </div>

                <Button 
                  onClick={handleGrantTemporaryAccess}
                  disabled={!temporaryAccess.profileId || !temporaryAccess.purpose}
                >
                  <Key className="h-4 w-4 mr-2" />
                  Generate Temporary Access Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sharing & Invites Tab */}
        <TabsContent value="sharing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Family Invitations</CardTitle>
              <p className="text-sm text-gray-600">
                Manage pending invitations and family access requests
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Pending Invites */}
                {familyInvites.length > 0 ? (
                  <div className="space-y-3">
                    {familyInvites.map(invite => (
                      <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium text-sm">
                            {invite.invitedEmail || invite.invitedPhone}
                          </div>
                          <div className="text-xs text-gray-500">
                            Invited as {invite.relationship} • Expires {formatDate(invite.expiresAt)}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {invite.permissions.map(permission => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission.replace('_', ' ').toLowerCase()}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={invite.status === 'pending' ? 'default' : 'secondary'}
                            className={cn(
                              invite.status === 'pending' && 'bg-yellow-100 text-yellow-800',
                              invite.status === 'expired' && 'bg-red-100 text-red-800',
                              invite.status === 'accepted' && 'bg-green-100 text-green-800'
                            )}
                          >
                            {invite.status}
                          </Badge>
                          
                          {invite.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRevokeInvite(invite.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No pending invitations</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share className="h-5 w-5" />
                Invite Family Member
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteData.invitedEmail}
                  onChange={(e) => setInviteData(prev => ({ ...prev, invitedEmail: e.target.value }))}
                  placeholder="family@example.com"
                />
              </div>

              <div className="text-center text-sm text-gray-500">or</div>

              <div>
                <Label htmlFor="invite-phone">Phone Number</Label>
                <Input
                  id="invite-phone"
                  type="tel"
                  value={inviteData.invitedPhone}
                  onChange={(e) => setInviteData(prev => ({ ...prev, invitedPhone: e.target.value }))}
                  placeholder="+233 XXX XXX XXX"
                />
              </div>

              <div>
                <Label htmlFor="invite-relationship">Relationship</Label>
                <Input
                  id="invite-relationship"
                  value={inviteData.relationship}
                  onChange={(e) => setInviteData(prev => ({ ...prev, relationship: e.target.value }))}
                  placeholder="e.g., Sister, Mother, etc."
                />
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Permissions</Label>
                <div className="space-y-2">
                  {PERMISSION_OPTIONS.map(permission => (
                    <div key={permission.value} className="flex items-start space-x-2">
                      <input
                        type="checkbox"
                        id={`invite-perm-${permission.value}`}
                        checked={inviteData.permissions.includes(permission.value)}
                        onChange={(e) => {
                          const current = inviteData.permissions;
                          const updated = e.target.checked
                            ? [...current, permission.value]
                            : current.filter(p => p !== permission.value);
                          setInviteData(prev => ({ ...prev, permissions: updated }));
                        }}
                      />
                      <div>
                        <Label 
                          htmlFor={`invite-perm-${permission.value}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {permission.label}
                        </Label>
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteSubmit}
                  disabled={(!inviteData.invitedEmail && !inviteData.invitedPhone) || inviteData.permissions.length === 0}
                >
                  Send Invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
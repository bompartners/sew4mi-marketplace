'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings as SettingsIcon,
  Shield,
  Bell,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Lock,
  Globe,
  CreditCard,
  AlertTriangle,
  Save,
  Smartphone,
  Mail,
  MessageSquare
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SettingsPage() {
  const { user, userRole, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      whatsappNotifications: true,
      pushNotifications: true,
      orderUpdates: true,
      promotions: false,
      reminders: true
    },
    privacy: {
      profileVisibility: 'public',
      showLocation: true,
      showPhone: false,
      allowMessages: true,
      dataCollection: true
    },
    security: {
      twoFactorAuth: false,
      loginAlerts: true,
      sessionTimeout: 30
    },
    preferences: {
      language: 'English',
      currency: 'GHS',
      timezone: 'GMT',
      darkMode: false
    }
  });

  const handleSettingChange = (category: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const handlePasswordChange = () => {
    // TODO: Implement password change logic
    console.log('Password change requested');
  };

  const handleDataExport = () => {
    // TODO: Implement data export
    console.log('Data export requested');
  };

  const handleAccountDeactivation = () => {
    // TODO: Implement account deactivation
    setIsDeactivating(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to access settings.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account preferences and security settings</p>
        </div>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="w-5 h-5" />
                  <span>Notification Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-gray-600">Receive notifications via email</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.emailNotifications}
                      onCheckedChange={(value) => handleSettingChange('notifications', 'emailNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-gray-400" />
                      <div>
                        <Label className="text-base">SMS Notifications</Label>
                        <p className="text-sm text-gray-600">Receive notifications via SMS</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.smsNotifications}
                      onCheckedChange={(value) => handleSettingChange('notifications', 'smsNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <div>
                        <Label className="text-base">WhatsApp Notifications</Label>
                        <p className="text-sm text-gray-600">Receive notifications via WhatsApp</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.whatsappNotifications}
                      onCheckedChange={(value) => handleSettingChange('notifications', 'whatsappNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-gray-400" />
                      <div>
                        <Label className="text-base">Push Notifications</Label>
                        <p className="text-sm text-gray-600">Receive push notifications on your device</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.notifications.pushNotifications}
                      onCheckedChange={(value) => handleSettingChange('notifications', 'pushNotifications', value)}
                    />
                  </div>
                </div>

                <hr className="my-6" />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Notification Types</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Order Updates</Label>
                      <p className="text-sm text-gray-600">Notifications about order status changes</p>
                    </div>
                    <Switch
                      checked={settings.notifications.orderUpdates}
                      onCheckedChange={(value) => handleSettingChange('notifications', 'orderUpdates', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Promotions & Offers</Label>
                      <p className="text-sm text-gray-600">Special offers and promotional content</p>
                    </div>
                    <Switch
                      checked={settings.notifications.promotions}
                      onCheckedChange={(value) => handleSettingChange('notifications', 'promotions', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Reminders</Label>
                      <p className="text-sm text-gray-600">Measurement updates and appointment reminders</p>
                    </div>
                    <Switch
                      checked={settings.notifications.reminders}
                      onCheckedChange={(value) => handleSettingChange('notifications', 'reminders', value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Privacy Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base">Profile Visibility</Label>
                    <p className="text-sm text-gray-600 mb-3">Control who can see your profile</p>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={settings.privacy.profileVisibility}
                      onChange={(e) => handleSettingChange('privacy', 'profileVisibility', e.target.value)}
                    >
                      <option value="public">Public - Visible to all users</option>
                      <option value="tailors">Tailors Only - Only visible to tailors</option>
                      <option value="private">Private - Not visible to others</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Show Location</Label>
                      <p className="text-sm text-gray-600">Display your location to tailors</p>
                    </div>
                    <Switch
                      checked={settings.privacy.showLocation}
                      onCheckedChange={(value) => handleSettingChange('privacy', 'showLocation', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Show Phone Number</Label>
                      <p className="text-sm text-gray-600">Display phone number in profile</p>
                    </div>
                    <Switch
                      checked={settings.privacy.showPhone}
                      onCheckedChange={(value) => handleSettingChange('privacy', 'showPhone', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Allow Messages</Label>
                      <p className="text-sm text-gray-600">Allow tailors to send you direct messages</p>
                    </div>
                    <Switch
                      checked={settings.privacy.allowMessages}
                      onCheckedChange={(value) => handleSettingChange('privacy', 'allowMessages', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Data Collection</Label>
                      <p className="text-sm text-gray-600">Allow collection of usage data for improvements</p>
                    </div>
                    <Switch
                      checked={settings.privacy.dataCollection}
                      onCheckedChange={(value) => handleSettingChange('privacy', 'dataCollection', value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Security Settings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Password Change */}
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showPasswords ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type={showPasswords ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type={showPasswords ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>

                    <Button onClick={handlePasswordChange} className="bg-[#CE1126] hover:bg-[#CE1126]/90">
                      <Lock className="w-4 h-4 mr-2" />
                      Update Password
                    </Button>
                  </div>
                </div>

                {/* Security Options */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Two-Factor Authentication</Label>
                      <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorAuth}
                      onCheckedChange={(value) => handleSettingChange('security', 'twoFactorAuth', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Login Alerts</Label>
                      <p className="text-sm text-gray-600">Get notified of new login attempts</p>
                    </div>
                    <Switch
                      checked={settings.security.loginAlerts}
                      onCheckedChange={(value) => handleSettingChange('security', 'loginAlerts', value)}
                    />
                  </div>

                  <div>
                    <Label className="text-base">Session Timeout</Label>
                    <p className="text-sm text-gray-600 mb-3">Automatically log out after period of inactivity</p>
                    <select 
                      className="w-full max-w-xs p-2 border rounded-md"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={240}>4 hours</option>
                      <option value={0}>Never</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>General Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select 
                      id="language"
                      className="w-full p-2 border rounded-md"
                      value={settings.preferences.language}
                      onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                    >
                      <option value="English">English</option>
                      <option value="Twi">Twi</option>
                      <option value="French">French</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <select 
                      id="currency"
                      className="w-full p-2 border rounded-md"
                      value={settings.preferences.currency}
                      onChange={(e) => handleSettingChange('preferences', 'currency', e.target.value)}
                    >
                      <option value="GHS">Ghana Cedi (GHS)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <select 
                      id="timezone"
                      className="w-full p-2 border rounded-md"
                      value={settings.preferences.timezone}
                      onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                    >
                      <option value="GMT">GMT (Ghana)</option>
                      <option value="UTC">UTC</option>
                      <option value="EST">Eastern Time</option>
                      <option value="PST">Pacific Time</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-gray-600">Use dark theme throughout the application</p>
                  </div>
                  <Switch
                    checked={settings.preferences.darkMode}
                    onCheckedChange={(value) => handleSettingChange('preferences', 'darkMode', value)}
                  />
                </div>

                <div className="pt-4">
                  <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
                    <Save className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Account Management</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Export Your Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Download a copy of your account data, including orders, measurements, and profile information.
                    </p>
                    <Button variant="outline" onClick={handleDataExport}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Data
                    </Button>
                  </div>

                  <hr />

                  <div>
                    <h3 className="text-lg font-medium text-red-600 mb-2">Danger Zone</h3>
                    
                    {!isDeactivating ? (
                      <div>
                        <p className="text-sm text-gray-600 mb-4">
                          Deactivating your account will hide your profile and pause all orders. 
                          You can reactivate at any time by logging back in.
                        </p>
                        <Button 
                          variant="outline" 
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => setIsDeactivating(true)}
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Deactivate Account
                        </Button>
                      </div>
                    ) : (
                      <Alert>
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          <div className="space-y-4">
                            <p>Are you sure you want to deactivate your account? This action will:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              <li>Hide your profile from tailors</li>
                              <li>Pause all active orders</li>
                              <li>Disable notifications</li>
                              <li>Prevent new orders</li>
                            </ul>
                            <div className="flex space-x-3">
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={handleAccountDeactivation}
                              >
                                Yes, Deactivate Account
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsDeactivating(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
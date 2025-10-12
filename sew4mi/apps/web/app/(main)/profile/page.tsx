'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Edit,
  Save,
  Camera,
  Globe,
  Star
} from 'lucide-react';

// Mock user profile data
const mockUserProfile = {
  id: 'user123',
  fullName: 'John Asante',
  email: 'john.asante@example.com',
  phone: '+233244505401',
  location: 'East Legon, Accra',
  joinDate: '2024-01-15',
  role: 'CUSTOMER',
  avatar: null,
  preferences: {
    language: 'English',
    currency: 'GHS',
    whatsappOptIn: true,
    emailNotifications: true,
    smsNotifications: false,
    marketingEmails: true
  },
  stats: {
    totalOrders: 8,
    completedOrders: 5,
    favoritesTailors: 3,
    totalSpent: 1250,
    membershipTier: 'Silver'
  },
  recentActivity: [
    { action: 'Placed order', description: 'Traditional Kente Dress', date: '2024-08-15' },
    { action: 'Added to favorites', description: 'Adwoa\'s Atelier', date: '2024-08-12' },
    { action: 'Completed order', description: 'Business Suit', date: '2024-08-10' }
  ]
};

const membershipTiers = {
  Bronze: { color: 'bg-orange-100 text-orange-800', min: 0 },
  Silver: { color: 'bg-gray-100 text-gray-800', min: 500 },
  Gold: { color: 'bg-yellow-100 text-yellow-800', min: 1000 },
  Platinum: { color: 'bg-purple-100 text-purple-800', min: 2000 }
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(mockUserProfile);

  const handleSave = () => {
    // TODO: Implement profile update logic
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (field: string, value: any) => {
    setProfileData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [field]: value
      }
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to view your profile.</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account information and preferences</p>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="membership">Membership</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    onClick={isEditing ? handleSave : () => setIsEditing(true)}
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <div className="w-24 h-24 bg-[#CE1126] text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    {profileData.fullName.charAt(0)}
                  </div>
                  {isEditing && (
                    <div className="space-y-2">
                      <Button variant="outline" size="sm">
                        <Camera className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                      <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                    </div>
                  )}
                </div>

                {/* Profile Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={profileData.fullName}
                      disabled={!isEditing}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="email"
                        value={profileData.email}
                        disabled={!isEditing}
                        className="pl-10"
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={profileData.phone}
                        disabled={!isEditing}
                        className="pl-10"
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="location"
                        value={profileData.location}
                        disabled={!isEditing}
                        className="pl-10"
                        onChange={(e) => handleInputChange('location', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Account Type</p>
                        <Badge className="mt-1">{profileData.role}</Badge>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Member Since</p>
                        <p className="text-sm text-gray-600">
                          {new Date(profileData.joinDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
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
                  <Bell className="w-5 h-5" />
                  <span>Notification Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">WhatsApp Notifications</Label>
                      <p className="text-sm text-gray-600">Receive order updates via WhatsApp</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.whatsappOptIn}
                      onCheckedChange={(value) => handlePreferenceChange('whatsappOptIn', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-gray-600">Receive order updates via email</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.emailNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('emailNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-gray-600">Receive order updates via SMS</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.smsNotifications}
                      onCheckedChange={(value) => handlePreferenceChange('smsNotifications', value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Marketing Emails</Label>
                      <p className="text-sm text-gray-600">Receive promotional offers and updates</p>
                    </div>
                    <Switch
                      checked={profileData.preferences.marketingEmails}
                      onCheckedChange={(value) => handlePreferenceChange('marketingEmails', value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5" />
                  <span>Regional Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <select 
                      id="language"
                      className="w-full p-2 border rounded-md"
                      value={profileData.preferences.language}
                      onChange={(e) => handlePreferenceChange('language', e.target.value)}
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
                      value={profileData.preferences.currency}
                      onChange={(e) => handlePreferenceChange('currency', e.target.value)}
                    >
                      <option value="GHS">Ghana Cedi (GHS)</option>
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Recent Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profileData.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start space-x-4 pb-4 border-b last:border-b-0">
                      <div className="w-2 h-2 bg-[#CE1126] rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Membership Tab */}
          <TabsContent value="membership" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>Membership Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="text-center">
                    <Badge className={`text-lg px-4 py-2 ${membershipTiers[profileData.stats.membershipTier as keyof typeof membershipTiers].color}`}>
                      {profileData.stats.membershipTier} Member
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2">
                      Total spent: GHS {profileData.stats.totalSpent.toFixed(2)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{profileData.stats.totalOrders}</p>
                      <p className="text-sm text-gray-600">Total Orders</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{profileData.stats.completedOrders}</p>
                      <p className="text-sm text-gray-600">Completed</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{profileData.stats.favoritesTailors}</p>
                      <p className="text-sm text-gray-600">Favorite Tailors</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">GHS {profileData.stats.totalSpent}</p>
                      <p className="text-sm text-gray-600">Total Spent</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Membership Benefits</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Priority customer support</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Exclusive discounts on orders</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Early access to featured tailors</span>
                      </div>
                    </div>
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
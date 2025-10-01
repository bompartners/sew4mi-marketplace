'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, User, Calendar, Ruler, Edit, Plus, Gift, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Mock family profiles data
const mockFamilyProfiles = [
  {
    id: '1',
    name: 'Kwame Asante',
    relationship: 'Son',
    age: 12,
    dateOfBirth: '2012-03-15',
    measurements: {
      chest: 28,
      waist: 26,
      height: 58
    },
    lastMeasured: '2024-08-10',
    recentOrders: 2,
    growthTracking: [
      { date: '2024-01-15', height: 55, weight: 85 },
      { date: '2024-04-15', height: 56, weight: 88 },
      { date: '2024-08-10', height: 58, weight: 92 }
    ],
    preferences: ['Traditional wear', 'School uniforms'],
    avatar: 'K'
  },
  {
    id: '2',
    name: 'Ama Asante',
    relationship: 'Daughter', 
    age: 8,
    dateOfBirth: '2016-07-22',
    measurements: {
      chest: 24,
      waist: 22,
      height: 48
    },
    lastMeasured: '2024-08-12',
    recentOrders: 1,
    growthTracking: [
      { date: '2024-01-15', height: 45, weight: 55 },
      { date: '2024-04-15', height: 46, weight: 58 },
      { date: '2024-08-12', height: 48, weight: 62 }
    ],
    preferences: ['Dresses', 'Traditional wear'],
    avatar: 'A'
  },
  {
    id: '3',
    name: 'Akosua Asante',
    relationship: 'Wife',
    age: 35,
    dateOfBirth: '1989-11-08',
    measurements: {
      chest: 36,
      waist: 30,
      height: 64
    },
    lastMeasured: '2024-08-05',
    recentOrders: 3,
    growthTracking: [],
    preferences: ['Contemporary designs', 'Business wear', 'Traditional wear'],
    avatar: 'A'
  }
];

const relationshipColors = {
  'Son': 'bg-blue-100 text-blue-800',
  'Daughter': 'bg-pink-100 text-pink-800', 
  'Wife': 'bg-purple-100 text-purple-800',
  'Husband': 'bg-green-100 text-green-800',
  'Mother': 'bg-orange-100 text-orange-800',
  'Father': 'bg-gray-100 text-gray-800'
};

export default function FamilyPage() {
  const { user } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to manage family profiles.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getGrowthTrend = (growthData: any[]) => {
    if (growthData.length < 2) return null;
    
    const recent = growthData[growthData.length - 1];
    const previous = growthData[growthData.length - 2];
    
    const heightGrowth = recent.height - previous.height;
    const weightGrowth = recent.weight - previous.weight;
    
    return { height: heightGrowth, weight: weightGrowth };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Family Profiles</h1>
            <p className="mt-2 text-gray-600">Manage measurements and preferences for your family members</p>
          </div>
          
          <Link href="/family/new">
            <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Family Member
            </Button>
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#CE1126]/10 text-[#CE1126] rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{mockFamilyProfiles.length}</p>
                  <p className="text-gray-600">Family Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Gift className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {mockFamilyProfiles.reduce((sum, profile) => sum + profile.recentOrders, 0)}
                  </p>
                  <p className="text-gray-600">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {mockFamilyProfiles.filter(p => p.age < 18).length}
                  </p>
                  <p className="text-gray-600">Growing Kids</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
                  <Ruler className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {mockFamilyProfiles.length}
                  </p>
                  <p className="text-gray-600">Active Profiles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Family Profiles Grid */}
        {mockFamilyProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-xl font-medium text-gray-900">No Family Members Added</h3>
                <p className="mt-2 text-gray-600">
                  Start adding your family members to manage their measurements and order custom garments for them.
                </p>
                <div className="mt-6">
                  <Link href="/family/new">
                    <Button className="bg-[#CE1126] hover:bg-[#CE1126]/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Family Member
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockFamilyProfiles.map((profile) => {
              const growthTrend = getGrowthTrend(profile.growthTracking);
              const relationshipColor = relationshipColors[profile.relationship as keyof typeof relationshipColors] || 'bg-gray-100 text-gray-800';
              
              return (
                <Card key={profile.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-[#CE1126] text-white rounded-full flex items-center justify-center text-lg font-bold">
                          {profile.avatar}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{profile.name}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className={relationshipColor}>
                              {profile.relationship}
                            </Badge>
                            <span className="text-sm text-gray-500">Age {profile.age}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Key Measurements */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Current Measurements</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-600">Chest</p>
                          <p className="font-semibold">{profile.measurements.chest}"</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-600">Waist</p>
                          <p className="font-semibold">{profile.measurements.waist}"</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-xs text-gray-600">Height</p>
                          <p className="font-semibold">{profile.measurements.height}"</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Last measured: {new Date(profile.lastMeasured).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Growth Trend for Kids */}
                    {profile.age < 18 && growthTrend && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Growth Tracking</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-green-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-green-600">Height Growth</p>
                            <p className="font-semibold text-green-700">+{growthTrend.height}"</p>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-2 text-center">
                            <p className="text-xs text-blue-600">Weight Growth</p>
                            <p className="font-semibold text-blue-700">+{growthTrend.weight} lbs</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preferences */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Preferences</h4>
                      <div className="flex flex-wrap gap-1">
                        {profile.preferences.map((pref, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {pref}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Recent Orders */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm">
                        <span className="text-gray-600">Recent Orders: </span>
                        <span className="font-medium">{profile.recentOrders}</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link href={`/orders/new?family=${profile.id}`}>
                          <Button size="sm" className="bg-[#CE1126] hover:bg-[#CE1126]/90 text-xs px-3">
                            New Order
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-[#FFD700]/20 text-[#8B4513] rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Growth Tracking for Kids
                </h3>
                <p className="text-gray-600 mb-4">
                  Keep track of your children's growth with regular measurement updates. 
                  Get notifications when it's time to update their measurements or when significant growth is detected.
                </p>
                <div className="flex space-x-3">
                  <Button variant="outline">
                    Set Growth Reminders
                  </Button>
                  <Button variant="outline">
                    View Growth Charts
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
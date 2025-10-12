'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyProfiles } from '@/hooks/useFamilyProfiles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Ruler, Edit, Plus, TrendingUp, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { RelationshipType } from '@sew4mi/shared/types/family-profiles';

const relationshipColors = {
  [RelationshipType.SELF]: 'bg-blue-100 text-blue-800',
  [RelationshipType.CHILD]: 'bg-pink-100 text-pink-800',
  [RelationshipType.SPOUSE]: 'bg-purple-100 text-purple-800',
  [RelationshipType.PARENT]: 'bg-orange-100 text-orange-800',
  [RelationshipType.SIBLING]: 'bg-green-100 text-green-800',
  [RelationshipType.OTHER]: 'bg-gray-100 text-gray-800'
};

const relationshipLabels = {
  [RelationshipType.SELF]: 'Self',
  [RelationshipType.CHILD]: 'Child',
  [RelationshipType.SPOUSE]: 'Spouse',
  [RelationshipType.PARENT]: 'Parent',
  [RelationshipType.SIBLING]: 'Sibling',
  [RelationshipType.OTHER]: 'Other'
};

export default function FamilyPage() {
  const { user } = useAuth();
  const {
    familyProfiles,
    isLoading,
    error,
    stats,
  } = useFamilyProfiles();

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

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#CE1126] mb-4" />
            <p className="text-center text-gray-600">Loading family profiles...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="pt-6">
            <p className="text-center text-red-600 mb-4">Error loading family profiles</p>
            <p className="text-center text-sm text-gray-600">{error.message}</p>
            <div className="mt-4 text-center">
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const calculateAge = (birthDate?: Date) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
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
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-gray-600">Family Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.recentlyUpdated}
                  </p>
                  <p className="text-gray-600">Recently Updated</p>
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
                    {stats.withGrowthTracking}
                  </p>
                  <p className="text-gray-600">Growth Tracking</p>
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
                    {stats.total}
                  </p>
                  <p className="text-gray-600">Active Profiles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Family Profiles Grid */}
        {familyProfiles.length === 0 ? (
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
            {familyProfiles.map((profile) => {
              const age = profile.age || calculateAge(profile.birthDate);
              const relationshipColor = relationshipColors[profile.relationship] || 'bg-gray-100 text-gray-800';
              const relationshipLabel = relationshipLabels[profile.relationship] || profile.relationship;
              
              return (
                <Card key={profile.id} className="hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-[#CE1126] text-white rounded-full flex items-center justify-center text-lg font-bold">
                          {profile.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{profile.nickname}</CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge className={relationshipColor}>
                              {relationshipLabel}
                            </Badge>
                            {age && <span className="text-sm text-gray-500">Age {age}</span>}
                          </div>
                        </div>
                      </div>

                      <Link href={`/family/${profile.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Key Measurements */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Current Measurements</h4>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {profile.measurements.chest && (
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">Chest</p>
                            <p className="font-semibold">{profile.measurements.chest}"</p>
                          </div>
                        )}
                        {profile.measurements.waist && (
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">Waist</p>
                            <p className="font-semibold">{profile.measurements.waist}"</p>
                          </div>
                        )}
                        {profile.measurements.hips && (
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-xs text-gray-600">Hips</p>
                            <p className="font-semibold">{profile.measurements.hips}"</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Last measured: {new Date(profile.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Growth Tracking for Kids */}
                    {profile.growthTracking.isTrackingEnabled && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Growth Tracking</h4>
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-green-600">Tracking Enabled</p>
                          <p className="text-xs text-gray-600 mt-1">
                            Frequency: {profile.growthTracking.reminderFrequency}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Recent Orders */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        Profile ID: {profile.id.slice(0, 8)}...
                      </div>

                      <div className="flex space-x-2">
                        <Link href={`/orders/new?profileId=${profile.id}`}>
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
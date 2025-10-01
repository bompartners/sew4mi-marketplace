'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, X, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FamilyMemberProfile {
  id: string;
  nickname: string;
  relationship: string;
  gender: string;
}

interface FamilyGarmentSelection {
  profileId: string;
  garmentType: string;
  measurements?: Record<string, number>;
  specialInstructions?: string;
  paymentResponsibility?: string;
  deliveryPriority?: number;
}

interface FamilyGarmentSelectorProps {
  selectedProfiles: FamilyGarmentSelection[];
  onProfilesChange: (profiles: FamilyGarmentSelection[]) => void;
}

export function FamilyGarmentSelector({
  selectedProfiles,
  onProfilesChange,
}: FamilyGarmentSelectorProps) {
  const { toast } = useToast();
  const [familyProfiles, setFamilyProfiles] = useState<FamilyMemberProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [garmentType, setGarmentType] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Fetch family profiles on mount
  useEffect(() => {
    fetchFamilyProfiles();
  }, []);

  const fetchFamilyProfiles = async () => {
    try {
      const response = await fetch('/api/profiles/family');
      if (response.ok) {
        const data = await response.json();
        setFamilyProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Failed to fetch family profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load family profiles',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = () => {
    if (!selectedProfileId || !garmentType) {
      toast({
        title: 'Validation Error',
        description: 'Please select a family member and garment type',
        variant: 'destructive',
      });
      return;
    }

    // Check if profile already added
    if (selectedProfiles.some(p => p.profileId === selectedProfileId)) {
      toast({
        title: 'Already Added',
        description: 'This family member is already in the group order',
        variant: 'destructive',
      });
      return;
    }

    const newSelection: FamilyGarmentSelection = {
      profileId: selectedProfileId,
      garmentType,
      specialInstructions: specialInstructions || undefined,
      deliveryPriority: selectedProfiles.length + 1,
    };

    onProfilesChange([...selectedProfiles, newSelection]);

    // Reset form
    setSelectedProfileId('');
    setGarmentType('');
    setSpecialInstructions('');
    setShowAddForm(false);

    toast({
      title: 'Added',
      description: 'Family member added to group order',
    });
  };

  const handleRemoveMember = (profileId: string) => {
    onProfilesChange(selectedProfiles.filter(p => p.profileId !== profileId));
  };

  const getProfileInfo = (profileId: string) => {
    return familyProfiles.find(p => p.id === profileId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-gray-500">Loading family profiles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Select Family Members</h3>
          <p className="text-sm text-gray-500">
            Choose who will be part of this group order
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <Card className="p-4 border-2 border-blue-200 bg-blue-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Family Member <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="">Select family member...</option>
                {familyProfiles
                  .filter(profile => !selectedProfiles.some(sp => sp.profileId === profile.id))
                  .map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.nickname} ({profile.relationship})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Garment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={garmentType}
                onChange={(e) => setGarmentType(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="">Select garment...</option>
                <option value="Traditional Kente Gown">Traditional Kente Gown</option>
                <option value="Agbada">Agbada</option>
                <option value="Kaftan">Kaftan</option>
                <option value="Children's Traditional Wear">Children's Traditional Wear</option>
                <option value="Suit">Suit</option>
                <option value="Dress">Dress</option>
                <option value="Shirt">Shirt</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Special Instructions (Optional)
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requirements..."
                rows={2}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedProfileId('');
                  setGarmentType('');
                  setSpecialInstructions('');
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddMember}>
                Add to Order
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Selected Members List */}
      <div className="space-y-3">
        {selectedProfiles.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <div className="font-medium">No family members selected yet</div>
            <div className="text-sm">Add at least 2 members to create a group order</div>
          </Card>
        ) : (
          selectedProfiles.map((selection, index) => {
            const profile = getProfileInfo(selection.profileId);
            return (
              <Card key={selection.profileId} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{profile?.nickname || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">{selection.garmentType}</div>
                      {selection.specialInstructions && (
                        <div className="text-xs text-gray-400 mt-1">
                          Note: {selection.specialInstructions}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500">
                      Priority: {selection.deliveryPriority || index + 1}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(selection.profileId)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {selectedProfiles.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <div className="font-medium">Order Summary</div>
          <div className="text-gray-600 mt-1">
            {selectedProfiles.length} family member{selectedProfiles.length !== 1 ? 's' : ''} selected
            {selectedProfiles.length >= 3 && (
              <span className="text-green-600 ml-2">
                • Qualifies for bulk discount!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useFamilyProfile, useFamilyProfiles } from '@/hooks/useFamilyProfiles';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, User, Ruler, Settings, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import {
  RelationshipType,
  ProfileVisibility,
  ReminderFrequency,
  UpdateFamilyProfileRequest
} from '@sew4mi/shared/types/family-profiles';
import { Gender } from '@sew4mi/shared/types/order-creation';

interface EditFamilyMemberPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditFamilyMemberPage({ params }: EditFamilyMemberPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  // Unwrap params
  useEffect(() => {
    params.then(p => setProfileId(p.id));
  }, [params]);

  const { profile, isLoading: isLoadingProfile, error: loadError } = useFamilyProfile(profileId);
  const { updateFamilyProfile, deleteFamilyProfile, isUpdating, isDeleting } = useFamilyProfiles();

  const [formData, setFormData] = useState({
    nickname: '',
    relationship: RelationshipType.CHILD as RelationshipType,
    gender: Gender.MALE as Gender,
    birthDate: '',
    privacySettings: {
      visibility: ProfileVisibility.PRIVATE as ProfileVisibility,
      shareWithFamily: false,
      allowEditing: false
    },
    growthTracking: {
      isTrackingEnabled: false,
      reminderFrequency: ReminderFrequency.QUARTERLY as ReminderFrequency
    }
  });

  const [measurements, setMeasurements] = useState({
    chest: '',
    waist: '',
    hips: '',
    shoulderWidth: '',
    sleeveLength: '',
    inseam: '',
    outseam: '',
    neckSize: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load profile data into form
  useEffect(() => {
    if (profile) {
      setFormData({
        nickname: profile.nickname || '',
        relationship: profile.relationship,
        gender: profile.gender,
        birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
        privacySettings: profile.privacySettings,
        growthTracking: profile.growthTracking
      });

      setMeasurements({
        chest: profile.measurements.chest?.toString() || '',
        waist: profile.measurements.waist?.toString() || '',
        hips: profile.measurements.hips?.toString() || '',
        shoulderWidth: profile.measurements.shoulderWidth?.toString() || '',
        sleeveLength: profile.measurements.sleeveLength?.toString() || '',
        inseam: profile.measurements.inseam?.toString() || '',
        outseam: profile.measurements.outseam?.toString() || '',
        neckSize: profile.measurements.neckSize?.toString() || ''
      });
    }
  }, [profile]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Please log in to edit family members.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#CE1126] mb-4" />
            <p className="text-center text-gray-600">Loading profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md border-red-200">
          <CardContent className="pt-6">
            <p className="text-center text-red-600 mb-4">Profile not found</p>
            <div className="mt-4 text-center">
              <Link href="/family">
                <Button variant="outline">Back to Family Profiles</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nickname?.trim()) {
      errors.nickname = 'Nickname is required';
    }

    if (!formData.gender) {
      errors.gender = 'Gender is required';
    }

    if (!formData.relationship) {
      errors.relationship = 'Relationship is required';
    }

    // At least one measurement required
    const hasMeasurements = Object.values(measurements).some(val => val !== '');
    if (!hasMeasurements) {
      errors.measurements = 'At least one measurement is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      // Convert measurements to numbers and filter out empty values
      const cleanMeasurements: Record<string, number> = {};
      Object.entries(measurements).forEach(([key, value]) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
          cleanMeasurements[key] = numValue;
        }
      });

      // Only send the fields that UpdateFamilyProfileRequestSchema expects
      // Note: Don't include birthDate if it's empty string
      const updates: UpdateFamilyProfileRequest['updates'] = {
        nickname: formData.nickname,
        relationship: formData.relationship,
        gender: formData.gender,
        ...(formData.birthDate && { birthDate: new Date(formData.birthDate) }),
        measurements: cleanMeasurements,
        privacySettings: formData.privacySettings,
        growthTracking: {
          isTrackingEnabled: formData.growthTracking.isTrackingEnabled,
          reminderFrequency: formData.growthTracking.reminderFrequency,
          lastMeasurementUpdate: new Date()
        }
      };

      console.log('Submitting updates:', updates);
      console.log('birthDate type:', typeof updates.birthDate, updates.birthDate);
      await updateFamilyProfile(profile.id, updates);
      router.push('/family');
    } catch (err) {
      console.error('Error updating family profile:', err);
      console.error('Full error object:', err);
      setError(err instanceof Error ? err.message : 'Failed to update family profile');
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      await deleteFamilyProfile(profile.id);
      router.push('/family');
    } catch (err) {
      console.error('Error deleting family profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete family profile');
    }
  };

  const handleMeasurementChange = (field: string, value: string) => {
    // Only allow numbers and decimals
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMeasurements(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/family">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Family Profiles
            </Button>
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Family Member</h1>
              <p className="mt-2 text-gray-600">
                Update measurement profile for {profile.nickname}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : showDeleteConfirm ? (
                'Confirm Delete'
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Profile
                </>
              )}
            </Button>
          </div>
          {showDeleteConfirm && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                Are you sure you want to delete this profile? This action cannot be undone.
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Update basic details about the family member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nickname">
                  Nickname <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="e.g., Little Kwame, Auntie Grace"
                  className={validationErrors.nickname ? 'border-red-500' : ''}
                />
                {validationErrors.nickname && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.nickname}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="relationship">
                    Relationship <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value as RelationshipType })}
                  >
                    <SelectTrigger className={validationErrors.relationship ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RelationshipType.SELF}>Self</SelectItem>
                      <SelectItem value={RelationshipType.CHILD}>Child</SelectItem>
                      <SelectItem value={RelationshipType.SPOUSE}>Spouse</SelectItem>
                      <SelectItem value={RelationshipType.PARENT}>Parent</SelectItem>
                      <SelectItem value={RelationshipType.SIBLING}>Sibling</SelectItem>
                      <SelectItem value={RelationshipType.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.relationship && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.relationship}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="gender">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value as Gender })}
                  >
                    <SelectTrigger className={validationErrors.gender ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Gender.MALE}>Male</SelectItem>
                      <SelectItem value={Gender.FEMALE}>Female</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.gender && (
                    <p className="text-sm text-red-500 mt-1">{validationErrors.gender}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="birthDate">Birth Date (Optional)</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Helps track growth for children and age-appropriate garment recommendations
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ruler className="w-5 h-5 mr-2" />
                Measurements
              </CardTitle>
              <CardDescription>
                Update measurements in inches. At least one measurement is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="chest">Chest (inches)</Label>
                  <Input
                    id="chest"
                    value={measurements.chest}
                    onChange={(e) => handleMeasurementChange('chest', e.target.value)}
                    placeholder="e.g., 36"
                  />
                </div>

                <div>
                  <Label htmlFor="waist">Waist (inches)</Label>
                  <Input
                    id="waist"
                    value={measurements.waist}
                    onChange={(e) => handleMeasurementChange('waist', e.target.value)}
                    placeholder="e.g., 32"
                  />
                </div>

                <div>
                  <Label htmlFor="hips">Hips (inches)</Label>
                  <Input
                    id="hips"
                    value={measurements.hips}
                    onChange={(e) => handleMeasurementChange('hips', e.target.value)}
                    placeholder="e.g., 38"
                  />
                </div>

                <div>
                  <Label htmlFor="shoulderWidth">Shoulder Width (inches)</Label>
                  <Input
                    id="shoulderWidth"
                    value={measurements.shoulderWidth}
                    onChange={(e) => handleMeasurementChange('shoulderWidth', e.target.value)}
                    placeholder="e.g., 16"
                  />
                </div>

                <div>
                  <Label htmlFor="sleeveLength">Sleeve Length (inches)</Label>
                  <Input
                    id="sleeveLength"
                    value={measurements.sleeveLength}
                    onChange={(e) => handleMeasurementChange('sleeveLength', e.target.value)}
                    placeholder="e.g., 24"
                  />
                </div>

                <div>
                  <Label htmlFor="inseam">Inseam (inches)</Label>
                  <Input
                    id="inseam"
                    value={measurements.inseam}
                    onChange={(e) => handleMeasurementChange('inseam', e.target.value)}
                    placeholder="e.g., 30"
                  />
                </div>

                <div>
                  <Label htmlFor="outseam">Outseam (inches)</Label>
                  <Input
                    id="outseam"
                    value={measurements.outseam}
                    onChange={(e) => handleMeasurementChange('outseam', e.target.value)}
                    placeholder="e.g., 40"
                  />
                </div>

                <div>
                  <Label htmlFor="neckSize">Neck Size (inches)</Label>
                  <Input
                    id="neckSize"
                    value={measurements.neckSize}
                    onChange={(e) => handleMeasurementChange('neckSize', e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>
              </div>

              {validationErrors.measurements && (
                <p className="text-sm text-red-500">{validationErrors.measurements}</p>
              )}
            </CardContent>
          </Card>

          {/* Privacy & Growth Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Privacy & Growth Tracking
              </CardTitle>
              <CardDescription>
                Configure privacy settings and growth tracking options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="visibility">Profile Visibility</Label>
                <Select
                  value={formData.privacySettings?.visibility}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      privacySettings: {
                        ...formData.privacySettings!,
                        visibility: value as ProfileVisibility
                      }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ProfileVisibility.PRIVATE}>Private (Only Me)</SelectItem>
                    <SelectItem value={ProfileVisibility.FAMILY_ONLY}>Family Only</SelectItem>
                    <SelectItem value={ProfileVisibility.PUBLIC}>Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="growthTracking"
                  checked={formData.growthTracking?.isTrackingEnabled}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      growthTracking: {
                        ...formData.growthTracking!,
                        isTrackingEnabled: checked as boolean
                      }
                    })
                  }
                />
                <div>
                  <Label htmlFor="growthTracking" className="cursor-pointer">
                    Enable Growth Tracking
                  </Label>
                  <p className="text-sm text-gray-500">
                    Get reminders to update measurements for growing children
                  </p>
                </div>
              </div>

              {formData.growthTracking?.isTrackingEnabled && (
                <div>
                  <Label htmlFor="reminderFrequency">Reminder Frequency</Label>
                  <Select
                    value={formData.growthTracking?.reminderFrequency}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        growthTracking: {
                          ...formData.growthTracking!,
                          reminderFrequency: value as ReminderFrequency
                        }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ReminderFrequency.MONTHLY}>Monthly</SelectItem>
                      <SelectItem value={ReminderFrequency.QUARTERLY}>Quarterly (3 months)</SelectItem>
                      <SelectItem value={ReminderFrequency.BIANNUALLY}>Twice a year (6 months)</SelectItem>
                      <SelectItem value={ReminderFrequency.NEVER}>Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Link href="/family">
              <Button type="button" variant="outline" disabled={isUpdating}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="bg-[#CE1126] hover:bg-[#CE1126]/90"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

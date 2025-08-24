'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { User, Plus, Edit, Calendar, Play, Info, Ruler } from 'lucide-react';
import { 
  GarmentTypeOption, 
  OrderMeasurementProfile,
  Gender,
  OrderCreationValidation 
} from '@sew4mi/shared/types';
import { useAuth } from '@/hooks/useAuth';

interface MeasurementSelectionProps {
  selectedProfile?: OrderMeasurementProfile;
  garmentType?: GarmentTypeOption;
  onProfileSelect: (profile: OrderMeasurementProfile) => void;
  errors: Record<string, string>;
}

interface MeasurementProfileCardProps {
  profile: OrderMeasurementProfile;
  isSelected: boolean;
  requiredMeasurements: string[];
  onClick: () => void;
}

function MeasurementProfileCard({ 
  profile, 
  isSelected, 
  requiredMeasurements,
  onClick 
}: MeasurementProfileCardProps) {
  const missingMeasurements = requiredMeasurements.filter(
    measurement => !profile.measurements[measurement]
  );

  const hasAllRequired = missingMeasurements.length === 0;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-primary border-primary bg-primary/5' 
          : 'hover:border-primary/50'
      } ${!hasAllRequired ? 'border-orange-300' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{profile.nickname}</CardTitle>
              <p className="text-sm text-muted-foreground capitalize">
                {profile.gender.toLowerCase()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {profile.voiceNoteUrl && (
              <Badge variant="secondary" className="text-xs">
                <Play className="h-3 w-3 mr-1" />
                Voice
              </Badge>
            )}
            {hasAllRequired ? (
              <Badge className="bg-green-600 text-xs">Complete</Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                {missingMeasurements.length} Missing
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium mb-2">Available Measurements:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(profile.measurements).map(([key, value]) => (
                value ? (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                    </span>
                    <span className="font-medium">{value}cm</span>
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {!hasAllRequired && (
            <div className="bg-orange-50 p-2 rounded border border-orange-200">
              <p className="text-xs text-orange-700">
                <strong>Missing:</strong> {missingMeasurements.join(', ')}
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(profile.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface NewMeasurementProfileFormProps {
  garmentType?: GarmentTypeOption;
  onSave: (profile: OrderMeasurementProfile) => void;
  onCancel: () => void;
}

function NewMeasurementProfileForm({ 
  garmentType, 
  onSave, 
  onCancel 
}: NewMeasurementProfileFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nickname: '',
    gender: Gender.MALE,
    measurements: {} as Record<string, number>
  });

  const allMeasurements = [
    { key: 'chest', label: 'Chest', description: 'Around the fullest part of chest' },
    { key: 'waist', label: 'Waist', description: 'Around natural waistline' },
    { key: 'hips', label: 'Hips', description: 'Around fullest part of hips' },
    { key: 'shoulderWidth', label: 'Shoulder Width', description: 'Across shoulders from point to point' },
    { key: 'sleeveLength', label: 'Sleeve Length', description: 'From shoulder to wrist' },
    { key: 'inseam', label: 'Inseam', description: 'Inner leg from crotch to ankle' },
    { key: 'outseam', label: 'Outseam', description: 'Outer leg from waist to ankle' },
    { key: 'neckSize', label: 'Neck Size', description: 'Around base of neck' }
  ];

  const requiredMeasurements = garmentType?.measurementsRequired || [];

  const handleMeasurementChange = (key: string, value: string) => {
    const numValue = parseFloat(value);
    setFormData(prev => ({
      ...prev,
      measurements: {
        ...prev.measurements,
        [key]: isNaN(numValue) ? undefined : numValue
      }
    }));
  };

  const handleSave = () => {
    if (!user?.id || !formData.nickname) return;

    const newProfile: OrderMeasurementProfile = {
      id: `temp_${Date.now()}`, // Would be generated by backend
      userId: user.id,
      nickname: formData.nickname,
      gender: formData.gender,
      measurements: formData.measurements,
      lastUpdated: new Date(),
      isActive: true
    };

    onSave(newProfile);
  };

  const canSave = formData.nickname && 
    requiredMeasurements.every(req => formData.measurements[req]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Create New Measurement Profile</h3>
        <p className="text-sm text-muted-foreground">
          Create a new profile for these measurements
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nickname">Profile Name</Label>
          <Input
            id="nickname"
            placeholder="e.g., 'My Measurements', 'Formal Wear Profile'"
            value={formData.nickname}
            onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <Select 
            value={formData.gender} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as Gender }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Gender.MALE}>Male</SelectItem>
              <SelectItem value={Gender.FEMALE}>Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h4 className="font-medium">Measurements (in centimeters)</h4>
        
        <div className="grid md:grid-cols-2 gap-4">
          {allMeasurements.map((measurement) => {
            const isRequired = requiredMeasurements.includes(measurement.key);
            
            return (
              <div key={measurement.key} className="space-y-2">
                <Label htmlFor={measurement.key} className="flex items-center gap-2">
                  {measurement.label}
                  {isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
                </Label>
                <Input
                  id={measurement.key}
                  type="number"
                  placeholder="0"
                  value={formData.measurements[measurement.key] || ''}
                  onChange={(e) => handleMeasurementChange(measurement.key, e.target.value)}
                  className={isRequired && !formData.measurements[measurement.key] ? 'border-orange-300' : ''}
                />
                <p className="text-xs text-muted-foreground">{measurement.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave}>
          Save Profile
        </Button>
      </div>
    </div>
  );
}

export function MeasurementSelection({
  selectedProfile,
  garmentType,
  onProfileSelect,
  errors
}: MeasurementSelectionProps) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<OrderMeasurementProfile[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Mock measurement profiles - would come from API
  useEffect(() => {
    if (user?.id) {
      // Simulate API call
      setIsLoading(true);
      setTimeout(() => {
        const mockProfiles: OrderMeasurementProfile[] = [
          {
            id: 'profile_1',
            userId: user.id,
            nickname: 'My Regular Profile',
            gender: Gender.MALE,
            measurements: {
              chest: 100,
              waist: 85,
              shoulderWidth: 45,
              sleeveLength: 63,
              neckSize: 38
            },
            lastUpdated: new Date('2024-01-15'),
            isActive: true
          },
          {
            id: 'profile_2',
            userId: user.id,
            nickname: 'Formal Wear Profile',
            gender: Gender.MALE,
            measurements: {
              chest: 102,
              waist: 87,
              hips: 95,
              shoulderWidth: 46,
              sleeveLength: 64,
              inseam: 81,
              outseam: 108,
              neckSize: 39
            },
            lastUpdated: new Date('2024-02-20'),
            isActive: true
          }
        ];
        setProfiles(mockProfiles);
        setIsLoading(false);
      }, 1000);
    }
  }, [user?.id]);

  const requiredMeasurements = garmentType?.measurementsRequired || [];

  const handleCreateProfile = (newProfile: OrderMeasurementProfile) => {
    setProfiles([newProfile, ...profiles]);
    onProfileSelect(newProfile);
    setIsCreateModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Select Measurement Profile</h2>
        <p className="text-muted-foreground">
          Choose an existing measurement profile or create a new one for your {garmentType?.name?.toLowerCase() || 'garment'}.
        </p>
      </div>

      {/* Required Measurements Info */}
      {garmentType && requiredMeasurements.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Ruler className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">
                  Required measurements for {garmentType.name}:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {requiredMeasurements.map((measurement) => (
                    <Badge key={measurement} variant="outline" className="text-xs">
                      {measurement.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {errors.measurementProfile && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{errors.measurementProfile}</p>
        </div>
      )}

      {/* Profiles Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Measurement Profiles</h3>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Measurement Profile</DialogTitle>
              </DialogHeader>
              <NewMeasurementProfileForm
                garmentType={garmentType}
                onSave={handleCreateProfile}
                onCancel={() => setIsCreateModalOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {profiles.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {profiles.map((profile) => (
              <MeasurementProfileCard
                key={profile.id}
                profile={profile}
                isSelected={selectedProfile?.id === profile.id}
                requiredMeasurements={requiredMeasurements}
                onClick={() => onProfileSelect(profile)}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 border-muted-foreground/25">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Measurement Profiles</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first measurement profile to get started with orders
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Create Your First Profile
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selection Summary */}
      {selectedProfile && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-green-800 mb-2">Selected Profile: {selectedProfile.nickname}</h4>
            <div className="text-sm text-green-700">
              <p className="mb-1">
                <strong>Gender:</strong> {selectedProfile.gender.toLowerCase()}
              </p>
              <p>
                <strong>Measurements:</strong> {Object.keys(selectedProfile.measurements).length} recorded
              </p>
              {requiredMeasurements.length > 0 && (
                <p className="mt-1">
                  <strong>Required for this garment:</strong> {
                    requiredMeasurements.filter(req => selectedProfile.measurements[req]).length
                  } of {requiredMeasurements.length} complete
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              <p className="font-medium mb-1">Measurement Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Use a flexible measuring tape for accuracy</li>
                <li>• Measure over thin clothing or undergarments</li>
                <li>• Stand naturally and breathe normally while measuring</li>
                <li>• Have someone help for hard-to-reach measurements</li>
                <li>• Save multiple profiles for different garment types</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
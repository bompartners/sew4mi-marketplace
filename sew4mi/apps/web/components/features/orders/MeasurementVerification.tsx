'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  CheckCircle,
  AlertTriangle,
  Edit,
  Save,
  X,
  Ruler,
  Calendar,
  User,
  Info,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { FamilyMeasurementProfile } from '@sew4mi/shared/types/family-profiles';
import { cn } from '@/lib/utils';

export interface MeasurementAdjustment {
  measurement: string;
  originalValue: number;
  adjustedValue: number;
  reason?: string;
}

export interface MeasurementVerificationProps {
  selectedProfile: FamilyMeasurementProfile;
  garmentType: string;
  requiredMeasurements: string[];
  onMeasurementsConfirmed: (
    measurements: Record<string, number>, 
    adjustments: MeasurementAdjustment[]
  ) => void;
  onEditProfile: (profileId: string) => void;
  onUpdateMeasurements: (profileId: string) => void;
  allowAdjustments?: boolean;
  className?: string;
}

const MEASUREMENT_DISPLAY_NAMES: Record<string, string> = {
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  shoulderWidth: 'Shoulder Width',
  armLength: 'Arm Length',
  inseam: 'Inseam',
  length: 'Length',
  neck: 'Neck',
  thigh: 'Thigh',
  bicep: 'Bicep',
  wrist: 'Wrist',
  ankle: 'Ankle'
};

const GARMENT_RECOMMENDATIONS: Record<string, {
  adjustments: Record<string, number>;
  description: string;
}> = {
  kente: {
    adjustments: { chest: 3, waist: 2 },
    description: 'Kente garments need extra room for traditional draping'
  },
  agbada: {
    adjustments: { chest: 4, waist: 3, armLength: 2 },
    description: 'Agbada requires generous fit for flowing movement'
  },
  kaftan: {
    adjustments: { chest: 2, waist: 2 },
    description: 'Kaftan should be comfortable and loose-fitting'
  },
  'fitted-dress': {
    adjustments: { chest: 1, waist: 0.5, hips: 1 },
    description: 'Fitted dress needs precise measurements with minimal ease'
  },
  'school-uniform': {
    adjustments: { chest: 2, waist: 1.5 },
    description: 'School uniform allows for growth and daily wear comfort'
  },
  'formal-suit': {
    adjustments: { chest: 2, waist: 1 },
    description: 'Formal suit requires tailored fit with appropriate ease'
  }
};

export function MeasurementVerification({
  selectedProfile,
  garmentType,
  requiredMeasurements,
  onMeasurementsConfirmed,
  onEditProfile,
  onUpdateMeasurements,
  allowAdjustments = true,
  className
}: MeasurementVerificationProps) {
  const [adjustments, setAdjustments] = useState<MeasurementAdjustment[]>([]);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState<string | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [tempAdjustedValue, setTempAdjustedValue] = useState<number>(0);
  const [applyRecommendations, setApplyRecommendations] = useState(false);

  // Get garment-specific recommendations
  const garmentRecs = GARMENT_RECOMMENDATIONS[garmentType.toLowerCase()] || 
                      GARMENT_RECOMMENDATIONS['formal-suit'];

  // Calculate final measurements with adjustments
  const getFinalMeasurement = (measurementKey: string): number => {
    const originalValue = selectedProfile.measurements?.[measurementKey] || 0;
    const adjustment = adjustments.find(adj => adj.measurement === measurementKey);
    const adjustedValue = adjustment?.adjustedValue || originalValue;
    
    if (applyRecommendations && garmentRecs.adjustments[measurementKey]) {
      return adjustedValue + garmentRecs.adjustments[measurementKey];
    }
    
    return adjustedValue;
  };

  // Check if measurement is missing
  const isMeasurementMissing = (measurementKey: string): boolean => {
    return !selectedProfile.measurements?.[measurementKey];
  };

  // Check if measurements are outdated
  const isMeasurementsOutdated = (): boolean => {
    const now = new Date();
    const lastUpdated = new Date(selectedProfile.lastUpdated);
    const diffMonths = (now.getFullYear() - lastUpdated.getFullYear()) * 12 + 
                      (now.getMonth() - lastUpdated.getMonth());
    
    // For children, measurements older than 3 months are outdated
    if (selectedProfile.age && selectedProfile.age < 18) {
      return diffMonths > 3;
    }
    
    // For adults, measurements older than 6 months are outdated
    return diffMonths > 6;
  };

  // Handle adjustment creation
  const handleCreateAdjustment = (measurementKey: string) => {
    const originalValue = selectedProfile.measurements?.[measurementKey] || 0;
    setTempAdjustedValue(originalValue);
    setAdjustmentReason('');
    setShowAdjustmentForm(measurementKey);
  };

  // Save adjustment
  const handleSaveAdjustment = () => {
    if (!showAdjustmentForm) return;
    
    const originalValue = selectedProfile.measurements?.[showAdjustmentForm] || 0;
    
    const newAdjustment: MeasurementAdjustment = {
      measurement: showAdjustmentForm,
      originalValue,
      adjustedValue: tempAdjustedValue,
      reason: adjustmentReason || 'Manual adjustment for better fit'
    };

    setAdjustments(prev => {
      const existing = prev.findIndex(adj => adj.measurement === showAdjustmentForm);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAdjustment;
        return updated;
      }
      return [...prev, newAdjustment];
    });

    setShowAdjustmentForm(null);
    setTempAdjustedValue(0);
    setAdjustmentReason('');
  };

  // Remove adjustment
  const handleRemoveAdjustment = (measurementKey: string) => {
    setAdjustments(prev => prev.filter(adj => adj.measurement !== measurementKey));
  };

  // Proceed with confirmed measurements
  const handleConfirmMeasurements = () => {
    const finalMeasurements: Record<string, number> = {};
    
    requiredMeasurements.forEach(key => {
      finalMeasurements[key] = getFinalMeasurement(key);
    });

    onMeasurementsConfirmed(finalMeasurements, adjustments);
  };

  // Check if all required measurements are available
  const missingMeasurements = requiredMeasurements.filter(key => isMeasurementMissing(key));
  const canProceed = missingMeasurements.length === 0;
  const isOutdated = isMeasurementsOutdated();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Ruler className="h-5 w-5" />
          Verify Measurements
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Review and adjust {selectedProfile.nickname}'s measurements for this {garmentType}
        </p>
      </div>

      {/* Profile Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-gray-400" />
              <div>
                <h4 className="font-medium text-gray-900">{selectedProfile.nickname}</h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{selectedProfile.age} years • {selectedProfile.gender}</span>
                  <Calendar className="h-3 w-3" />
                  <span>Updated {new Date(selectedProfile.lastUpdated).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOutdated && (
                <Badge variant="outline" className="border-orange-200 text-orange-700">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs update
                </Badge>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateMeasurements(selectedProfile.id)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Update
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditProfile(selectedProfile.id)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Measurements Alert */}
      {missingMeasurements.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-900">Missing Required Measurements</h4>
              <p className="text-sm text-red-700 mt-1">
                The following measurements are needed for this garment:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {missingMeasurements.map(key => (
                  <Badge key={key} variant="outline" className="border-red-200 text-red-700">
                    {MEASUREMENT_DISPLAY_NAMES[key] || key}
                  </Badge>
                ))}
              </div>
              <Button
                className="mt-3"
                onClick={() => onUpdateMeasurements(selectedProfile.id)}
              >
                Add Missing Measurements
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Garment Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4" />
            {garmentType} Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{garmentRecs.description}</p>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="apply-recommendations" className="font-medium">
                  Apply Recommended Adjustments
                </Label>
                <p className="text-sm text-gray-600">
                  Add extra ease for comfort and traditional fit
                </p>
              </div>
              <Switch
                id="apply-recommendations"
                checked={applyRecommendations}
                onCheckedChange={setApplyRecommendations}
              />
            </div>
            
            {applyRecommendations && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-900 mb-2">Recommended Adjustments:</p>
                <div className="grid gap-1 text-sm text-blue-800">
                  {Object.entries(garmentRecs.adjustments).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{MEASUREMENT_DISPLAY_NAMES[key] || key}:</span>
                      <span>+{value}cm</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Measurements Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Measurements Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requiredMeasurements.map(measurementKey => {
              const originalValue = selectedProfile.measurements?.[measurementKey];
              const adjustment = adjustments.find(adj => adj.measurement === measurementKey);
              const finalValue = getFinalMeasurement(measurementKey);
              const isMissing = isMeasurementMissing(measurementKey);
              const hasAdjustment = adjustment !== undefined;
              const hasRecommendation = applyRecommendations && garmentRecs.adjustments[measurementKey];
              
              return (
                <div
                  key={measurementKey}
                  className={cn(
                    "flex items-center justify-between p-3 border rounded-lg",
                    isMissing ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">
                        {MEASUREMENT_DISPLAY_NAMES[measurementKey] || measurementKey}
                      </span>
                      {isMissing && (
                        <Badge variant="outline" className="border-red-200 text-red-700">
                          Missing
                        </Badge>
                      )}
                      {hasAdjustment && (
                        <Badge variant="outline" className="border-blue-200 text-blue-700">
                          Adjusted
                        </Badge>
                      )}
                    </div>
                    
                    {!isMissing && (
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-600">
                            Original: {originalValue}cm
                          </span>
                          {hasRecommendation && (
                            <span className="text-blue-600">
                              Recommendation: +{garmentRecs.adjustments[measurementKey]}cm
                            </span>
                          )}
                        </div>
                        {hasAdjustment && (
                          <div className="text-blue-600">
                            Manual adjustment: {adjustment.originalValue}cm → {adjustment.adjustedValue}cm
                            {adjustment.reason && (
                              <span className="text-gray-600 ml-2">({adjustment.reason})</span>
                            )}
                          </div>
                        )}
                        <div className="font-medium text-green-600">
                          Final: {finalValue}cm
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {!isMissing && allowAdjustments && (
                      <>
                        {hasAdjustment ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAdjustment(measurementKey)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateAdjustment(measurementKey)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Adjustment Form */}
      {showAdjustmentForm && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">
              Adjust {MEASUREMENT_DISPLAY_NAMES[showAdjustmentForm] || showAdjustmentForm}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="adjusted-value">New Value (cm)</Label>
              <Input
                id="adjusted-value"
                type="number"
                step="0.5"
                value={tempAdjustedValue}
                onChange={(e) => setTempAdjustedValue(parseFloat(e.target.value) || 0)}
              />
            </div>
            
            <div>
              <Label htmlFor="adjustment-reason">Reason (Optional)</Label>
              <Textarea
                id="adjustment-reason"
                placeholder="Why are you making this adjustment?"
                value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                rows={2}
              />
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAdjustmentForm(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveAdjustment}>
                <Save className="h-4 w-4 mr-2" />
                Save Adjustment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outdated Warning */}
      {isOutdated && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Measurements May Be Outdated</h4>
              <p className="text-sm text-orange-700 mt-1">
                These measurements haven't been updated recently. Consider updating them for the best fit.
              </p>
              <Button
                className="mt-2"
                variant="outline"
                onClick={() => onUpdateMeasurements(selectedProfile.id)}
              >
                Update Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <p className="text-sm text-gray-600">
            {adjustments.length > 0 && `${adjustments.length} manual adjustment${adjustments.length > 1 ? 's' : ''} applied`}
            {applyRecommendations && adjustments.length > 0 && ', '}
            {applyRecommendations && 'garment recommendations applied'}
          </p>
        </div>
        
        <Button 
          onClick={handleConfirmMeasurements}
          disabled={!canProceed}
          className="min-w-32"
        >
          {canProceed ? (
            <>
              Confirm & Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          ) : (
            'Missing Measurements'
          )}
        </Button>
      </div>
    </div>
  );
}
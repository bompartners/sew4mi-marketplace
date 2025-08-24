'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { 
  tailorApplicationSchema, 
  type TailorApplication 
} from '@sew4mi/shared';
import { 
  Upload, 
  FileImage, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  MapPin,
  Briefcase,
  User,
  Camera,
  FileText
} from 'lucide-react';

interface TailorApplicationFormProps {
  onSubmit: (data: TailorApplication) => Promise<void>;
  onSkip?: () => void;
  userId?: string;
}

export function TailorApplicationForm({ onSubmit, onSkip, userId: _userId }: TailorApplicationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, _setUploadedFiles] = useState<{
    workspace: string[];
    documents: string[];
  }>({
    workspace: [],
    documents: []
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors }
  } = useForm<TailorApplication>({
    resolver: zodResolver(tailorApplicationSchema),
    defaultValues: {
      businessType: 'individual',
      specializations: [],
      references: [
        { name: '', phone: '', relationship: '' },
        { name: '', phone: '', relationship: '' }
      ],
      workspacePhotos: [],
      agreedToTerms: false
    }
  });

  const specializations = watch('specializations');
  const references = watch('references');
  // const businessType = watch('businessType'); // Commented out - may be needed for conditional UI
  const agreedToTerms = watch('agreedToTerms');

  const handleFormSubmit = async (data: TailorApplication) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Add uploaded file URLs to form data
      data.workspacePhotos = uploadedFiles.workspace;
      if (uploadedFiles.documents.length > 0) {
        data.businessRegistration = uploadedFiles.documents[0];
      }

      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecializationChange = (specialization: string, checked: boolean) => {
    const current = specializations || [];
    if (checked) {
      setValue('specializations', [...current, specialization]);
    } else {
      setValue('specializations', current.filter(s => s !== specialization));
    }
    trigger('specializations');
  };

  const handleReferenceChange = (index: number, field: keyof typeof references[0], value: string) => {
    const current = references || [];
    current[index] = { ...current[index], [field]: value };
    setValue('references', current);
    trigger('references');
  };

  const addReference = () => {
    const current = references || [];
    if (current.length < 5) {
      setValue('references', [...current, { name: '', phone: '', relationship: '' }]);
    }
  };

  const removeReference = (index: number) => {
    const current = references || [];
    if (current.length > 2) {
      setValue('references', current.filter((_, i) => i !== index));
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof TailorApplication)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['businessName', 'businessType', 'yearsOfExperience'];
        break;
      case 2:
        fieldsToValidate = ['specializations', 'portfolioDescription'];
        break;
      case 3:
        fieldsToValidate = ['businessLocation'];
        break;
      case 4:
        fieldsToValidate = ['references'];
        break;
    }

    const isStepValid = await trigger(fieldsToValidate as any);
    if (isStepValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const tailorSpecializations = [
    'Traditional Wear (Kente, Dashiki)',
    'Formal Suits & Business Wear',
    'Wedding Dresses & Bridal Wear',
    'Casual & Everyday Clothing',
    'School & Corporate Uniforms',
    'Cultural & Ceremonial Attire',
    'Alterations & Repairs',
    'Children\'s Clothing',
    'Plus Size Clothing',
    'Accessories (Bags, Hats)'
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Business Information</h3>
              <p className="text-sm text-muted-foreground">Tell us about your tailoring business</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  {...register('businessName')}
                  placeholder="e.g., Akosua's Fashion House"
                  className={errors.businessName ? 'border-destructive' : ''}
                />
                {errors.businessName && (
                  <p className="text-sm text-destructive mt-1">{errors.businessName.message}</p>
                )}
              </div>

              <div>
                <Label>Business Type *</Label>
                <div className="flex gap-4 mt-2">
                  {[
                    { value: 'individual', label: 'Individual Tailor' },
                    { value: 'company', label: 'Tailoring Company' },
                    { value: 'cooperative', label: 'Tailoring Cooperative' }
                  ].map(option => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={option.value}
                        value={option.value}
                        {...register('businessType')}
                        className="w-4 h-4 text-primary"
                      />
                      <Label htmlFor={option.value} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  max="50"
                  {...register('yearsOfExperience', { valueAsNumber: true })}
                  placeholder="5"
                  className={errors.yearsOfExperience ? 'border-destructive' : ''}
                />
                {errors.yearsOfExperience && (
                  <p className="text-sm text-destructive mt-1">{errors.yearsOfExperience.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Specializations & Portfolio</h3>
              <p className="text-sm text-muted-foreground">What type of clothing do you specialize in?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Specializations * (Select at least one)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {tailorSpecializations.map(spec => (
                    <div key={spec} className="flex items-center space-x-2">
                      <Checkbox
                        id={spec}
                        checked={specializations?.includes(spec) || false}
                        onCheckedChange={(checked) => handleSpecializationChange(spec, checked as boolean)}
                      />
                      <Label htmlFor={spec} className="text-sm cursor-pointer">
                        {spec}
                      </Label>
                    </div>
                  ))}
                </div>
                {errors.specializations && (
                  <p className="text-sm text-destructive mt-1">{errors.specializations.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="portfolioDescription">Portfolio Description *</Label>
                <textarea
                  id="portfolioDescription"
                  {...register('portfolioDescription')}
                  placeholder="Describe your work experience, notable projects, and what makes you unique as a tailor..."
                  className={`w-full min-h-32 px-3 py-2 border rounded-md ${errors.portfolioDescription ? 'border-destructive' : 'border-input'}`}
                />
                {errors.portfolioDescription && (
                  <p className="text-sm text-destructive mt-1">{errors.portfolioDescription.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Location & Workspace</h3>
              <p className="text-sm text-muted-foreground">Where do you operate your business?</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="businessLocation">Business Location *</Label>
                <Input
                  id="businessLocation"
                  {...register('businessLocation')}
                  placeholder="e.g., Osu, Accra or Kumasi Central Market"
                  className={errors.businessLocation ? 'border-destructive' : ''}
                />
                {errors.businessLocation && (
                  <p className="text-sm text-destructive mt-1">{errors.businessLocation.message}</p>
                )}
              </div>

              <div>
                <Label>Workspace Photos * (1-5 photos)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Upload photos of your workspace, tools, and recent work
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-2">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photos
                  </Button>
                </div>
                {uploadedFiles.workspace.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {uploadedFiles.workspace.map((_url, index) => (
                      <div key={index} className="relative">
                        <FileImage className="h-8 w-8 text-green-600" />
                        <CheckCircle className="h-4 w-4 text-green-600 absolute -top-1 -right-1" />
                      </div>
                    ))}
                  </div>
                )}
                {errors.workspacePhotos && (
                  <p className="text-sm text-destructive mt-1">{errors.workspacePhotos.message}</p>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">References</h3>
              <p className="text-sm text-muted-foreground">Provide contacts who can vouch for your work</p>
            </div>

            <div className="space-y-4">
              {references?.map((reference, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Reference {index + 1}</h4>
                    {index >= 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReference(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input
                      placeholder="Full Name"
                      value={reference.name}
                      onChange={(e) => handleReferenceChange(index, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Phone Number"
                      value={reference.phone}
                      onChange={(e) => handleReferenceChange(index, 'phone', e.target.value)}
                    />
                    <Input
                      placeholder="Relationship (e.g., Customer, Colleague)"
                      value={reference.relationship}
                      onChange={(e) => handleReferenceChange(index, 'relationship', e.target.value)}
                    />
                  </div>
                </Card>
              ))}
              
              {(references?.length || 0) < 5 && (
                <Button type="button" variant="outline" onClick={addReference}>
                  Add Another Reference
                </Button>
              )}
              
              {errors.references && (
                <p className="text-sm text-destructive">{errors.references.message}</p>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Additional Documentation</h3>
              <p className="text-sm text-muted-foreground">Upload any relevant business documents</p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Business Registration (Optional)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <FileText className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">
                    Upload business certificate or registration if available
                  </p>
                  <Button type="button" variant="outline" size="sm" className="mt-2">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="taxId">Tax ID (Optional)</Label>
                <Input
                  id="taxId"
                  {...register('taxId')}
                  placeholder="Business Tax Identification Number"
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreedToTerms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setValue('agreedToTerms', checked as boolean)}
                />
                <Label htmlFor="agreedToTerms" className="text-sm cursor-pointer">
                  I agree to the{' '}
                  <a href="/terms/tailors" className="text-primary hover:underline">
                    Tailor Terms and Conditions
                  </a>{' '}
                  and understand that my application will be reviewed by the Sew4Mi team.
                </Label>
              </div>
              {errors.agreedToTerms && (
                <p className="text-sm text-destructive">{errors.agreedToTerms.message}</p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Tailor Application</CardTitle>
        <CardDescription>
          Complete your application to become a verified expert tailor on Sew4Mi
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
              </div>
              {step < 5 && (
                <div
                  className={`w-8 h-0.5 ${
                    step < currentStep ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          {renderStepContent()}

          <div className="flex justify-between mt-8">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {onSkip && currentStep === 1 && (
                <Button type="button" variant="ghost" onClick={onSkip}>
                  Skip for Now
                </Button>
              )}

              {currentStep < 5 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isLoading || !agreedToTerms}
                  className="min-w-32"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
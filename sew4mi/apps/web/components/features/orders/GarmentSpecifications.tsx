'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Info, ShoppingBag, Scissors } from 'lucide-react';
import { 
  GarmentTypeOption, 
  FabricChoice,
  FabricType,
  OrderCreationValidation 
} from '@sew4mi/shared/types';
import { MAX_SPECIAL_INSTRUCTIONS_LENGTH } from '@sew4mi/shared/constants';

interface GarmentSpecificationsProps {
  garmentType?: GarmentTypeOption;
  fabricChoice?: FabricChoice;
  specialInstructions?: string;
  onFabricChoiceChange: (fabricChoice: FabricChoice) => void;
  onSpecialInstructionsChange: (specialInstructions: string) => void;
  errors: Record<string, string>;
}

interface FabricChoiceCardProps {
  choice: FabricChoice;
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
}

function FabricChoiceCard({
  choice,
  title,
  description,
  pros,
  cons,
  icon,
  isSelected,
  onClick
}: FabricChoiceCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-primary border-primary bg-primary/5' 
          : 'hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-green-600 mb-1">Advantages:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {pros.map((pro, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{pro}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-orange-600 mb-1">Consider:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {cons.map((con, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>{con}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GarmentSpecifications({
  garmentType,
  fabricChoice,
  specialInstructions = '',
  onFabricChoiceChange,
  onSpecialInstructionsChange,
  errors
}: GarmentSpecificationsProps) {
  const [uploadedFabrics, setUploadedFabrics] = useState<File[]>([]);

  const fabricChoices = [
    {
      choice: FabricChoice.CUSTOMER_PROVIDED,
      title: "I'll Provide Fabric",
      description: 'Bring your own fabric or have it delivered to the tailor',
      icon: <ShoppingBag className="h-6 w-6 text-blue-600" />,
      pros: [
        'Choose exactly what you want',
        'Often more cost-effective',
        'Ensure quality meets your standards',
        'Personal control over fabric selection'
      ],
      cons: [
        'Need to source and purchase fabric yourself',
        'Must ensure correct quantity and specifications',
        'Delivery coordination required'
      ]
    },
    {
      choice: FabricChoice.TAILOR_SOURCED,
      title: 'Tailor Sources Fabric',
      description: 'Let the tailor select and purchase appropriate fabric',
      icon: <Scissors className="h-6 w-6 text-purple-600" />,
      pros: [
        'Professional fabric selection',
        'Guaranteed compatibility with design',
        'Tailor handles all sourcing',
        'Often bulk pricing advantages'
      ],
      cons: [
        'Less control over exact fabric choice',
        'May be more expensive',
        'Limited to tailor\'s supplier network'
      ]
    }
  ];

  const handleFabricUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFabrics([...uploadedFabrics, ...files]);
  };

  const removeFabricUpload = (index: number) => {
    setUploadedFabrics(uploadedFabrics.filter((_, i) => i !== index));
  };

  const characterCount = specialInstructions.length;
  const isOverLimit = characterCount > MAX_SPECIAL_INSTRUCTIONS_LENGTH;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Garment Specifications</h2>
        <p className="text-muted-foreground">
          Specify fabric preferences and any special requirements for your {garmentType?.name?.toLowerCase() || 'garment'}.
        </p>
      </div>

      {/* Garment Type Summary */}
      {garmentType && (
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Selected: {garmentType.name}</h3>
                <p className="text-sm text-muted-foreground">{garmentType.description}</p>
              </div>
              <Badge variant="secondary">
                {garmentType.fabricRequirements?.yardsNeeded} yards needed
              </Badge>
            </div>
            
            {garmentType.fabricRequirements?.supportedTypes && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Recommended fabric types:</p>
                <div className="flex flex-wrap gap-2">
                  {garmentType.fabricRequirements.supportedTypes.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Fabric Choice Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Fabric Sourcing</h3>
        
        {errors.fabricChoice && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{errors.fabricChoice}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {fabricChoices.map((option) => (
            <FabricChoiceCard
              key={option.choice}
              choice={option.choice}
              title={option.title}
              description={option.description}
              pros={option.pros}
              cons={option.cons}
              icon={option.icon}
              isSelected={fabricChoice === option.choice}
              onClick={() => onFabricChoiceChange(option.choice)}
            />
          ))}
        </div>
      </div>

      {/* Fabric Upload (for customer-provided option) */}
      {fabricChoice === FabricChoice.CUSTOMER_PROVIDED && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Upload className="h-5 w-5" />
              Upload Fabric Photos
            </CardTitle>
            <p className="text-sm text-blue-700">
              Share photos of your fabric to help the tailor plan the design
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  id="fabric-upload"
                  multiple
                  accept="image/*"
                  onChange={handleFabricUpload}
                  className="hidden"
                />
                <label
                  htmlFor="fabric-upload"
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-blue-600">Click to upload fabric photos</p>
                    <p className="text-xs text-blue-500">PNG, JPG up to 10MB each</p>
                  </div>
                </label>
              </div>

              {uploadedFabrics.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Uploaded Files:</h4>
                  {uploadedFabrics.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeFabricUpload(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-white p-3 rounded border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Fabric Delivery Tips:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Ensure you have enough fabric plus 10-15% extra</li>
                      <li>• Pre-wash fabric if it might shrink</li>
                      <li>• Coordinate delivery timing with your tailor</li>
                      <li>• Include fabric care instructions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Special Instructions */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Special Instructions</h3>
          <p className="text-sm text-muted-foreground">
            Any specific requirements, preferences, or details for your tailor
          </p>
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Enter any special instructions, style preferences, or important details for your tailor..."
            value={specialInstructions}
            onChange={(e) => onSpecialInstructionsChange(e.target.value)}
            rows={4}
            className={`resize-none ${isOverLimit ? 'border-red-300 focus:border-red-400' : ''}`}
          />
          
          <div className="flex justify-between items-center text-sm">
            <span className={`${isOverLimit ? 'text-red-600' : 'text-muted-foreground'}`}>
              {characterCount} / {MAX_SPECIAL_INSTRUCTIONS_LENGTH} characters
            </span>
            {isOverLimit && (
              <span className="text-red-600">Too many characters</span>
            )}
          </div>
        </div>

        {errors.specialInstructions && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{errors.specialInstructions}</p>
          </div>
        )}

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700">
                <p className="font-medium mb-1">Helpful to include:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Preferred fit (slim, regular, loose)</li>
                  <li>• Color preferences or restrictions</li>
                  <li>• Specific occasion or use case</li>
                  <li>• Any alterations from standard design</li>
                  <li>• Cultural or religious requirements</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Summary */}
      {fabricChoice && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <h4 className="font-semibold text-green-800 mb-2">Specifications Summary</h4>
            <div className="space-y-1 text-sm text-green-700">
              <p>
                <strong>Fabric:</strong> {
                  fabricChoice === FabricChoice.CUSTOMER_PROVIDED 
                    ? 'Customer provided' 
                    : 'Tailor sourced'
                }
              </p>
              {specialInstructions && (
                <p>
                  <strong>Special instructions:</strong> {
                    specialInstructions.length > 50 
                      ? `${specialInstructions.substring(0, 50)}...` 
                      : specialInstructions
                  }
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search } from 'lucide-react';
import { 
  GarmentTypeOption, 
  GarmentCategory
} from '@sew4mi/shared/types';
import { GARMENT_TYPES, GARMENT_CATEGORIES } from '@sew4mi/shared/constants';

interface GarmentTypeSelectionProps {
  selectedGarmentType?: GarmentTypeOption;
  onSelect: (garmentType: GarmentTypeOption) => void;
  errors: Record<string, string>;
}

interface GarmentTypeCardProps {
  garmentType: GarmentTypeOption;
  isSelected: boolean;
  onClick: () => void;
}

function GarmentTypeCard({ garmentType, isSelected, onClick }: GarmentTypeCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-primary border-primary bg-primary/5' 
          : 'hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Image placeholder - will be replaced with actual images */}
          <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
            <span className="text-4xl">{GARMENT_CATEGORIES[garmentType.category].icon}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{garmentType.name}</h3>
              <Badge variant="secondary" className="text-xs">
                {GARMENT_CATEGORIES[garmentType.category].label}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-2">
              {garmentType.description}
            </p>
            
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-green-600">
                From GHS {garmentType.basePrice.toFixed(2)}
              </span>
              <span className="text-muted-foreground">
                ~{garmentType.estimatedDays} days
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function GarmentTypeSelection({
  selectedGarmentType,
  onSelect,
  errors
}: GarmentTypeSelectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GarmentCategory | 'ALL'>('ALL');
  const [garmentTypes, setGarmentTypes] = useState<GarmentTypeOption[]>([]);

  // Load garment types (would come from API in real implementation)
  useEffect(() => {
    const types = Object.values(GARMENT_TYPES).filter(type => type.isActive);
    setGarmentTypes(types);
  }, []);

  // Filter garment types based on search and category
  const filteredGarmentTypes = garmentTypes.filter(garmentType => {
    const matchesSearch = garmentType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         garmentType.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || garmentType.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const groupedByCategory = filteredGarmentTypes.reduce((acc, garmentType) => {
    if (!acc[garmentType.category]) {
      acc[garmentType.category] = [];
    }
    acc[garmentType.category].push(garmentType);
    return acc;
  }, {} as Record<GarmentCategory, GarmentTypeOption[]>);

  const categoryTabs = [
    { value: 'ALL', label: 'All', icon: '👗' },
    ...Object.entries(GARMENT_CATEGORIES).map(([key, config]) => ({
      value: key,
      label: config.label,
      icon: config.icon
    }))
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Choose Your Garment Type</h2>
        <p className="text-muted-foreground">
          Select the type of garment you want to have made. Each option shows the base price and typical timeline.
        </p>
      </div>

      {/* Error Display */}
      {errors.garmentType && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{errors.garmentType}</p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search garment types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as GarmentCategory | 'ALL')}>
        <TabsList className="w-full">
          {categoryTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="ALL" className="mt-6">
          {Object.entries(groupedByCategory).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedByCategory).map(([category, types]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{GARMENT_CATEGORIES[category as GarmentCategory].icon}</span>
                    <h3 className="text-lg font-semibold">
                      {GARMENT_CATEGORIES[category as GarmentCategory].label}
                    </h3>
                    <Badge variant="outline">{types.length}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {types.map((garmentType) => (
                      <GarmentTypeCard
                        key={garmentType.id}
                        garmentType={garmentType}
                        isSelected={selectedGarmentType?.id === garmentType.id}
                        onClick={() => onSelect(garmentType)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No garment types found matching your search.</p>
              {searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => setSearchQuery('')}
                  className="mt-2"
                >
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        {Object.entries(GARMENT_CATEGORIES).map(([category, config]) => (
          <TabsContent key={category} value={category} className="mt-6">
            {groupedByCategory[category as GarmentCategory]?.length > 0 ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span>{config.icon}</span>
                    {config.label}
                  </h3>
                  <p className="text-muted-foreground text-sm">{config.description}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {groupedByCategory[category as GarmentCategory].map((garmentType) => (
                    <GarmentTypeCard
                      key={garmentType.id}
                      garmentType={garmentType}
                      isSelected={selectedGarmentType?.id === garmentType.id}
                      onClick={() => onSelect(garmentType)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No {config.label.toLowerCase()} garments found.
                </p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Selection Summary */}
      {selectedGarmentType && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-800">Selected: {selectedGarmentType.name}</h4>
                <p className="text-green-600 text-sm">
                  Base price: GHS {selectedGarmentType.basePrice.toFixed(2)} • 
                  Estimated: {selectedGarmentType.estimatedDays} days
                </p>
              </div>
              <Badge className="bg-green-600">Selected</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="font-semibold text-blue-800 mb-2">💡 Helpful Tips</h4>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Base prices may vary depending on your chosen tailor</li>
          <li>• Delivery times are estimates and may change based on complexity</li>
          <li>• Traditional garments may require specific fabric types</li>
          <li>• Express delivery options available with surcharge</li>
        </ul>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import { X, MapPin, Star, DollarSign, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  TailorSearchFilters,
  GHANA_MAJOR_CITIES,
  GHANA_SPECIALIZATIONS,
  PRICE_RANGES,
} from '@sew4mi/shared';
import { GHANA_REGIONS } from '@sew4mi/shared/constants/tailors';

interface FilterPanelProps {
  filters: TailorSearchFilters;
  onFiltersChange: (filters: Partial<TailorSearchFilters>) => void;
  onClear: () => void;
  className?: string;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onClear,
  className,
}: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState({
    location: true,
    rating: true,
    price: true,
    specializations: false,
    other: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Count active filters
  const activeFiltersCount = [
    filters.city,
    filters.region,
    filters.minRating,
    filters.minPrice,
    filters.maxPrice,
    filters.specializations?.length,
    filters.verified,
    filters.acceptsRushOrders,
  ].filter(Boolean).length;

  // Handle specialization toggle
  const handleSpecializationToggle = (specialization: string, checked: boolean) => {
    const current = filters.specializations || [];
    const updated = checked
      ? [...current, specialization]
      : current.filter(s => s !== specialization);
    
    onFiltersChange({ specializations: updated });
  };

  // Handle price range selection
  const handlePriceRangeSelect = (range: typeof PRICE_RANGES[number]) => {
    onFiltersChange({
      minPrice: range.min,
      maxPrice: range.max === 10000 ? undefined : range.max,
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs text-gray-600 hover:text-gray-800"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Location */}
      <Collapsible
        open={expandedSections.location}
        onOpenChange={() => toggleSection('location')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Location</span>
            </div>
            {expandedSections.location ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3 px-3 pb-3">
          {/* City */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">City</Label>
            <Select
              value={filters.city || ''}
              onValueChange={(value) => onFiltersChange({ city: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Cities</SelectItem>
                {GHANA_MAJOR_CITIES.map(city => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Region</Label>
            <Select
              value={filters.region || ''}
              onValueChange={(value) => onFiltersChange({ region: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Regions</SelectItem>
                {GHANA_REGIONS.map(region => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Rating */}
      <Collapsible
        open={expandedSections.rating}
        onOpenChange={() => toggleSection('rating')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
              <span className="font-medium">Minimum Rating</span>
            </div>
            {expandedSections.rating ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map(rating => (
              <label key={rating} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={filters.minRating === rating}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ minRating: checked ? rating : undefined })
                  }
                />
                <div className="flex items-center gap-1">
                  {Array.from({ length: rating }, (_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-yellow-400 fill-current"
                    />
                  ))}
                  {Array.from({ length: 5 - rating }, (_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 text-gray-300"
                    />
                  ))}
                  <span className="text-sm ml-1">& up</span>
                </div>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible
        open={expandedSections.price}
        onOpenChange={() => toggleSection('price')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-medium">Price Range</span>
            </div>
            {expandedSections.price ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-3">
            {/* Quick Price Ranges */}
            <div className="space-y-2">
              {PRICE_RANGES.map((range, index) => (
                <label key={index} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={
                      filters.minPrice === range.min &&
                      (range.max === 10000 ? !filters.maxPrice : filters.maxPrice === range.max)
                    }
                    onCheckedChange={(checked) =>
                      checked ? handlePriceRangeSelect(range) : onFiltersChange({ minPrice: undefined, maxPrice: undefined })
                    }
                  />
                  <span className="text-sm">{range.label}</span>
                </label>
              ))}
            </div>

            {/* Custom Range Display */}
            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                Selected: ₵{filters.minPrice || 0} - ₵{filters.maxPrice || '∞'}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Specializations */}
      <Collapsible
        open={expandedSections.specializations}
        onOpenChange={() => toggleSection('specializations')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">Specializations</span>
              {filters.specializations && filters.specializations.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.specializations.length}
                </Badge>
              )}
            </div>
            {expandedSections.specializations ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {GHANA_SPECIALIZATIONS.map(specialization => (
              <label key={specialization} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={filters.specializations?.includes(specialization) || false}
                  onCheckedChange={(checked) =>
                    handleSpecializationToggle(specialization, !!checked)
                  }
                />
                <span className="text-sm">{specialization}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Other Options */}
      <Collapsible
        open={expandedSections.other}
        onOpenChange={() => toggleSection('other')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="font-medium">Other Options</span>
            </div>
            {expandedSections.other ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filters.verified || false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ verified: checked || undefined })
                }
              />
              <span className="text-sm">Verified tailors only</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filters.acceptsRushOrders || false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ acceptsRushOrders: checked || undefined })
                }
              />
              <span className="text-sm">Accepts rush orders</span>
            </label>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Applied Filters Summary */}
      {activeFiltersCount > 0 && (
        <Card className="p-3 bg-blue-50 border-blue-200">
          <div className="space-y-2">
            <div className="text-sm font-medium text-blue-900">Applied Filters:</div>
            <div className="flex flex-wrap gap-1">
              {filters.city && (
                <Badge variant="secondary" className="text-xs">
                  {filters.city}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => onFiltersChange({ city: undefined })}
                  />
                </Badge>
              )}
              {filters.region && (
                <Badge variant="secondary" className="text-xs">
                  {filters.region}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => onFiltersChange({ region: undefined })}
                  />
                </Badge>
              )}
              {filters.minRating && (
                <Badge variant="secondary" className="text-xs">
                  ★ {filters.minRating}+
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => onFiltersChange({ minRating: undefined })}
                  />
                </Badge>
              )}
              {filters.specializations?.map(spec => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => 
                      onFiltersChange({ 
                        specializations: filters.specializations?.filter(s => s !== spec) 
                      })
                    }
                  />
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
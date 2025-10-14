'use client';

import React, { useState } from 'react';
import {
  X, MapPin, Star, DollarSign, Filter, ChevronDown, ChevronUp,
  Calendar, Clock, Palette, Package, Users, Languages, Ruler
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  TailorSearchFilters,
  GHANA_MAJOR_CITIES,
  GHANA_SPECIALIZATIONS,
  PRICE_RANGES,
  GHANA_OCCASIONS,
  STYLE_CATEGORIES,
  GHANA_FABRICS,
  SIZE_RANGES,
  GHANA_LANGUAGES,
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
    occasions: false,
    deliveryTimeframe: false,
    styleCategories: false,
    fabricPreferences: false,
    colorPreferences: false,
    sizeRanges: false,
    languages: false,
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
    filters.occasions?.length,
    filters.deliveryTimeframeMin,
    filters.deliveryTimeframeMax,
    filters.styleCategories?.length,
    filters.fabricPreferences?.length,
    filters.colorPreferences?.length,
    filters.sizeRanges?.length,
    filters.languages?.length,
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

  // Story 4.4: Handle array filter toggles
  const handleArrayFilterToggle = (
    filterKey: 'occasions' | 'styleCategories' | 'fabricPreferences' | 'colorPreferences' | 'sizeRanges' | 'languages',
    value: string,
    checked: boolean
  ) => {
    const current = filters[filterKey] || [];
    const updated = checked
      ? [...current, value]
      : current.filter(v => v !== value);

    onFiltersChange({ [filterKey]: updated });
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

      {/* Story 4.4: Occasions */}
      <Collapsible
        open={expandedSections.occasions}
        onOpenChange={() => toggleSection('occasions')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <span className="font-medium">Occasions</span>
              {filters.occasions && filters.occasions.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.occasions.length}
                </Badge>
              )}
            </div>
            {expandedSections.occasions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {GHANA_OCCASIONS.map(occasion => (
              <label key={occasion} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={filters.occasions?.includes(occasion) || false}
                  onCheckedChange={(checked) =>
                    handleArrayFilterToggle('occasions', occasion, !!checked)
                  }
                />
                <span className="text-sm">{occasion}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Story 4.4: Delivery Timeframe */}
      <Collapsible
        open={expandedSections.deliveryTimeframe}
        onOpenChange={() => toggleSection('deliveryTimeframe')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Delivery Time</span>
            </div>
            {expandedSections.deliveryTimeframe ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Minimum Days</Label>
              <Select
                value={filters.deliveryTimeframeMin?.toString() || ''}
                onValueChange={(value) =>
                  onFiltersChange({ deliveryTimeframeMin: value ? Number(value) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="14">2 weeks</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Maximum Days</Label>
              <Select
                value={filters.deliveryTimeframeMax?.toString() || ''}
                onValueChange={(value) =>
                  onFiltersChange({ deliveryTimeframeMax: value ? Number(value) : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any</SelectItem>
                  <SelectItem value="7">1 week</SelectItem>
                  <SelectItem value="14">2 weeks</SelectItem>
                  <SelectItem value="21">3 weeks</SelectItem>
                  <SelectItem value="30">1 month</SelectItem>
                  <SelectItem value="60">2 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Story 4.4: Style Categories */}
      <Collapsible
        open={expandedSections.styleCategories}
        onOpenChange={() => toggleSection('styleCategories')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-pink-600" />
              <span className="font-medium">Style</span>
              {filters.styleCategories && filters.styleCategories.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.styleCategories.length}
                </Badge>
              )}
            </div>
            {expandedSections.styleCategories ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2">
            {STYLE_CATEGORIES.map(style => (
              <label key={style.value} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={filters.styleCategories?.includes(style.value) || false}
                  onCheckedChange={(checked) =>
                    handleArrayFilterToggle('styleCategories', style.value, !!checked)
                  }
                />
                <span className="text-sm">
                  {style.icon} {style.label}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Story 4.4: Fabric Preferences */}
      <Collapsible
        open={expandedSections.fabricPreferences}
        onOpenChange={() => toggleSection('fabricPreferences')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              <span className="font-medium">Fabrics</span>
              {filters.fabricPreferences && filters.fabricPreferences.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.fabricPreferences.length}
                </Badge>
              )}
            </div>
            {expandedSections.fabricPreferences ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {GHANA_FABRICS.map(fabric => (
              <label key={fabric} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={filters.fabricPreferences?.includes(fabric) || false}
                  onCheckedChange={(checked) =>
                    handleArrayFilterToggle('fabricPreferences', fabric, !!checked)
                  }
                />
                <span className="text-sm">{fabric}</span>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Story 4.4: Color Preferences */}
      <Collapsible
        open={expandedSections.colorPreferences}
        onOpenChange={() => toggleSection('colorPreferences')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-red-600" />
              <span className="font-medium">Colors</span>
              {filters.colorPreferences && filters.colorPreferences.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.colorPreferences.length}
                </Badge>
              )}
            </div>
            {expandedSections.colorPreferences ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Custom Input</Label>
            <input
              type="text"
              placeholder="Enter color (e.g., Gold, Blue)"
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = e.currentTarget.value.trim();
                  if (value && !filters.colorPreferences?.includes(value)) {
                    handleArrayFilterToggle('colorPreferences', value, true);
                    e.currentTarget.value = '';
                  }
                }
              }}
            />
            {filters.colorPreferences && filters.colorPreferences.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filters.colorPreferences.map(color => (
                  <Badge key={color} variant="secondary" className="text-xs">
                    {color}
                    <X
                      className="h-3 w-3 ml-1 cursor-pointer"
                      onClick={() => handleArrayFilterToggle('colorPreferences', color, false)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Story 4.4: Size Ranges */}
      <Collapsible
        open={expandedSections.sizeRanges}
        onOpenChange={() => toggleSection('sizeRanges')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-indigo-600" />
              <span className="font-medium">Size Ranges</span>
              {filters.sizeRanges && filters.sizeRanges.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.sizeRanges.length}
                </Badge>
              )}
            </div>
            {expandedSections.sizeRanges ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2">
            {SIZE_RANGES.map(size => (
              <label key={size.value} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={filters.sizeRanges?.includes(size.value) || false}
                  onCheckedChange={(checked) =>
                    handleArrayFilterToggle('sizeRanges', size.value, !!checked)
                  }
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{size.label}</span>
                  <span className="text-xs text-gray-500">{size.description}</span>
                </div>
              </label>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Story 4.4: Languages */}
      <Collapsible
        open={expandedSections.languages}
        onOpenChange={() => toggleSection('languages')}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-teal-600" />
              <span className="font-medium">Languages</span>
              {filters.languages && filters.languages.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {filters.languages.length}
                </Badge>
              )}
            </div>
            {expandedSections.languages ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 pb-3">
          <div className="space-y-2">
            {GHANA_LANGUAGES.map(lang => (
              <label key={lang.code} className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={filters.languages?.includes(lang.code) || false}
                  onCheckedChange={(checked) =>
                    handleArrayFilterToggle('languages', lang.code, !!checked)
                  }
                />
                <span className="text-sm">{lang.label}</span>
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
                  onFiltersChange({ verified: checked === true ? true : undefined })
                }
              />
              <span className="text-sm">Verified tailors only</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filters.acceptsRushOrders || false}
                onCheckedChange={(checked) =>
                  onFiltersChange({ acceptsRushOrders: checked === true ? true : undefined })
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
              {/* Story 4.4: New filter badges */}
              {filters.occasions?.map(occasion => (
                <Badge key={occasion} variant="secondary" className="text-xs">
                  {occasion}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        occasions: filters.occasions?.filter(o => o !== occasion)
                      })
                    }
                  />
                </Badge>
              ))}
              {filters.styleCategories?.map(style => (
                <Badge key={style} variant="secondary" className="text-xs">
                  {STYLE_CATEGORIES.find(s => s.value === style)?.icon} {style}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        styleCategories: filters.styleCategories?.filter(s => s !== style)
                      })
                    }
                  />
                </Badge>
              ))}
              {filters.fabricPreferences?.map(fabric => (
                <Badge key={fabric} variant="secondary" className="text-xs">
                  {fabric}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        fabricPreferences: filters.fabricPreferences?.filter(f => f !== fabric)
                      })
                    }
                  />
                </Badge>
              ))}
              {filters.colorPreferences?.map(color => (
                <Badge key={color} variant="secondary" className="text-xs">
                  {color}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        colorPreferences: filters.colorPreferences?.filter(c => c !== color)
                      })
                    }
                  />
                </Badge>
              ))}
              {filters.sizeRanges?.map(size => (
                <Badge key={size} variant="secondary" className="text-xs">
                  {SIZE_RANGES.find(s => s.value === size)?.label}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        sizeRanges: filters.sizeRanges?.filter(s => s !== size)
                      })
                    }
                  />
                </Badge>
              ))}
              {filters.languages?.map(lang => (
                <Badge key={lang} variant="secondary" className="text-xs">
                  {GHANA_LANGUAGES.find(l => l.code === lang)?.label}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        languages: filters.languages?.filter(l => l !== lang)
                      })
                    }
                  />
                </Badge>
              ))}
              {(filters.deliveryTimeframeMin || filters.deliveryTimeframeMax) && (
                <Badge variant="secondary" className="text-xs">
                  Delivery: {filters.deliveryTimeframeMin || 0}-{filters.deliveryTimeframeMax || '∞'} days
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        deliveryTimeframeMin: undefined,
                        deliveryTimeframeMax: undefined,
                      })
                    }
                  />
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
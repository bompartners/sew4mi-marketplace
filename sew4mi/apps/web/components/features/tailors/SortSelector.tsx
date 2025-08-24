'use client';

import React from 'react';
import { ArrowUpDown, Star, DollarSign, Clock, MapPin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { SORT_OPTIONS } from '@sew4mi/shared';

interface SortSelectorProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  className?: string;
}

export function SortSelector({
  sortBy,
  sortOrder,
  onSortChange,
  className,
}: SortSelectorProps) {
  const currentOption = SORT_OPTIONS.find(option => option.value === sortBy);
  
  const handleSortChange = (value: string) => {
    const option = SORT_OPTIONS.find(opt => opt.value === value);
    if (option) {
      onSortChange(option.value, option.order);
    }
  };

  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    onSortChange(sortBy, newOrder);
  };

  const getSortIcon = (value: string) => {
    switch (value) {
      case 'rating':
        return <Star className="h-4 w-4" />;
      case 'price':
        return <DollarSign className="h-4 w-4" />;
      case 'responseTime':
        return <Clock className="h-4 w-4" />;
      case 'distance':
        return <MapPin className="h-4 w-4" />;
      default:
        return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  const getSortLabel = (value: string, order: string) => {
    const option = SORT_OPTIONS.find(opt => opt.value === value);
    if (!option) return 'Sort by';
    
    // For some sorts, the order affects the label
    switch (value) {
      case 'rating':
        return order === 'desc' ? 'Highest Rated' : 'Lowest Rated';
      case 'price':
        return order === 'asc' ? 'Lowest Price' : 'Highest Price';
      case 'responseTime':
        return order === 'asc' ? 'Fastest Response' : 'Slowest Response';
      case 'distance':
        return order === 'asc' ? 'Nearest' : 'Farthest';
      default:
        return option.label;
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sort By Selector */}
      <Select value={sortBy} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <div className="flex items-center gap-2">
            {getSortIcon(sortBy)}
            <SelectValue>
              {getSortLabel(sortBy, sortOrder)}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {getSortIcon(option.value)}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort Order Toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSortOrder}
        className="px-2"
        title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
      >
        <ArrowUpDown 
          className={`h-4 w-4 transition-transform ${
            sortOrder === 'desc' ? 'rotate-180' : ''
          }`} 
        />
      </Button>
    </div>
  );
}
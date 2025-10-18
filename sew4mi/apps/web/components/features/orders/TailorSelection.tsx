'use client';

import React, { useState, useEffect } from 'react';
import { Search, Star, MapPin, Heart, Eye, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TailorProfile } from '@sew4mi/shared/types';
import { useDebounce } from '@/hooks/useDebounce';
import { createClient } from '@/lib/supabase/client';

interface TailorSelectionProps {
  selectedTailor?: TailorProfile;
  onSelect: (tailor: TailorProfile) => void;
  errors?: Record<string, string>;
}

export function TailorSelection({ selectedTailor, onSelect, errors }: TailorSelectionProps) {
  const [tailors, setTailors] = useState<TailorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [specializationFilter, setSpecializationFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch tailors
  useEffect(() => {
    async function fetchTailors() {
      setIsLoading(true);
      try {
        const supabase = createClient();
        let query = supabase
          .from('tailor_profiles')
          .select(`
            id,
            user_id,
            business_name,
            bio,
            location_name,
            specializations,
            years_of_experience,
            total_orders,
            rating,
            profile_photo,
            vacation_mode
          `)
          .eq('vacation_mode', false);

        // Apply filters
        if (debouncedSearchTerm) {
          query = query.or(`business_name.ilike.%${debouncedSearchTerm}%,bio.ilike.%${debouncedSearchTerm}%`);
        }

        if (locationFilter && locationFilter !== 'all') {
          query = query.eq('location_name', locationFilter);
        }

        if (specializationFilter && specializationFilter !== 'all') {
          query = query.contains('specializations', [specializationFilter]);
        }

        // Apply sorting
        switch (sortBy) {
          case 'rating':
            query = query.order('rating', { ascending: false, nullsFirst: false });
            break;
          case 'experience':
            query = query.order('years_of_experience', { ascending: false });
            break;
          case 'orders':
            query = query.order('total_orders', { ascending: false, nullsFirst: false });
            break;
          default:
            query = query.order('rating', { ascending: false, nullsFirst: false });
        }

        const { data, error } = await query.limit(12);

        if (error) {
          console.error('Supabase query error:', error.message, error.details, error.hint);
          setTailors([]);
          return;
        }

        setTailors((data as TailorProfile[]) || []);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error fetching tailors:', error.message);
        } else {
          console.error('Error fetching tailors:', error);
        }
        setTailors([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTailors();
  }, [debouncedSearchTerm, locationFilter, specializationFilter, sortBy]);

  const handleSelectTailor = (tailor: TailorProfile) => {
    onSelect(tailor);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Select a Tailor</h3>
        <p className="text-muted-foreground text-sm">
          Choose a tailor to create your order with. You can search by name, location, or specialization.
        </p>
      </div>

      {errors?.tailorId && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errors.tailorId}
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="Accra">Accra</SelectItem>
              <SelectItem value="Kumasi">Kumasi</SelectItem>
              <SelectItem value="Tamale">Tamale</SelectItem>
              <SelectItem value="Cape Coast">Cape Coast</SelectItem>
            </SelectContent>
          </Select>

          <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Specializations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Specializations</SelectItem>
              <SelectItem value="Kaba & Slit">Kaba & Slit</SelectItem>
              <SelectItem value="Men's Suits">Men's Suits</SelectItem>
              <SelectItem value="Traditional Wear">Traditional Wear</SelectItem>
              <SelectItem value="Bridal Wear">Bridal Wear</SelectItem>
              <SelectItem value="Casual Wear">Casual Wear</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="experience">Most Experienced</SelectItem>
              <SelectItem value="orders">Most Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Tailor Display */}
      {selectedTailor && (
        <Card className="border-2 border-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  {selectedTailor.profile_photo ? (
                    <img
                      src={selectedTailor.profile_photo}
                      alt={selectedTailor.business_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold">
                      {selectedTailor.business_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-green-900">{selectedTailor.business_name}</p>
                  <p className="text-sm text-green-700">Selected Tailor ✓</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(undefined as any)}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tailors Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : tailors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tailors found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tailors.map((tailor) => {
            const isSelected = selectedTailor?.user_id === tailor.user_id;
            
            return (
              <Card
                key={tailor.user_id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-green-500 bg-green-50' : ''
                }`}
                onClick={() => handleSelectTailor(tailor)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      {tailor.profile_photo ? (
                        <img
                          src={tailor.profile_photo}
                          alt={tailor.business_name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold">
                          {tailor.business_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{tailor.business_name}</h3>
                      {tailor.location_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          <span>{tailor.location_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {tailor.bio || 'No description available'}
                  </p>

                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-current text-yellow-400" />
                      <span className="font-medium">
                        {tailor.rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {tailor.total_orders || 0} orders
                    </span>
                  </div>

                  {tailor.specializations && tailor.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tailor.specializations.slice(0, 2).map((specialization: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialization}
                        </Badge>
                      ))}
                      {tailor.specializations.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{tailor.specializations.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium text-green-600 text-center">
                        ✓ Selected
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


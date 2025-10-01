'use client'

import React, { useState, useEffect } from 'react';
import { useAccessibilityContext } from '@/components/ui/AccessibilityProvider';
import { useKeyboardNavigation, useAnnouncement } from '@/hooks/useAccessibility';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  User,
  Users,
  Plus,
  Check,
  Search,
  Ruler,
  Calendar,
  ChevronRight,
  Edit,
  Copy,
  AlertCircle
} from 'lucide-react';
import { FamilyMeasurementProfile, RelationshipType } from '@sew4mi/shared/types/family-profiles';
import { Gender } from '@sew4mi/shared/types/order-creation';
import { cn } from '@/lib/utils';

export interface FamilyProfileSelectorProps {
  profiles: FamilyMeasurementProfile[];
  selectedProfileId?: string;
  onSelectProfile: (profile: FamilyMeasurementProfile) => void;
  onCreateNewProfile?: () => void;
  onEditProfile?: (profileId: string) => void;
  onCopyMeasurements?: (profile: FamilyMeasurementProfile) => void;
  showQuickActions?: boolean;
  className?: string;
}

const RELATIONSHIP_COLORS = {
  [RelationshipType.SELF]: 'bg-blue-100 text-blue-800 border-blue-200',
  [RelationshipType.SPOUSE]: 'bg-pink-100 text-pink-800 border-pink-200',
  [RelationshipType.CHILD]: 'bg-green-100 text-green-800 border-green-200',
  [RelationshipType.PARENT]: 'bg-purple-100 text-purple-800 border-purple-200',
  [RelationshipType.SIBLING]: 'bg-orange-100 text-orange-800 border-orange-200',
  [RelationshipType.OTHER]: 'bg-gray-100 text-gray-800 border-gray-200'
};

const RELATIONSHIP_LABELS = {
  [RelationshipType.SELF]: 'Myself',
  [RelationshipType.SPOUSE]: 'My Spouse',
  [RelationshipType.CHILD]: 'My Child',
  [RelationshipType.PARENT]: 'My Parent',
  [RelationshipType.SIBLING]: 'My Sibling',
  [RelationshipType.OTHER]: 'Other Family'
};

export function FamilyProfileSelector({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onCreateNewProfile,
  onEditProfile,
  onCopyMeasurements,
  showQuickActions = true,
  className
}: FamilyProfileSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRelationship, setFilterRelationship] = useState<RelationshipType | 'all'>('all');
  
  // Accessibility hooks
  const { addSkipLink, removeSkipLink } = useAccessibilityContext();
  const { announce } = useAnnouncement();
  const gridContainerRef = useKeyboardNavigation('[data-profile-card]', {
    gridNavigation: true,
    columnsPerRow: 2,
    onSelect: (item) => {
      const profileId = item.dataset.profileId;
      const profile = profiles.find(p => p.id === profileId);
      if (profile) {
        onSelectProfile(profile);
        announce(`Selected ${profile.nickname} for this order`, 'polite');
      }
    }
  });

  // Filter profiles based on search and relationship
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = searchQuery === '' || 
      profile.nickname.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRelationship = filterRelationship === 'all' || 
      profile.relationship === filterRelationship;
    
    return matchesSearch && matchesRelationship && profile.isActive;
  });

  // Group profiles by relationship for better organization
  const groupedProfiles = filteredProfiles.reduce((acc, profile) => {
    const relationship = profile.relationship;
    if (!acc[relationship]) {
      acc[relationship] = [];
    }
    acc[relationship].push(profile);
    return acc;
  }, {} as Record<RelationshipType, FamilyMeasurementProfile[]>);

  // Calculate measurement completeness
  const getMeasurementCompleteness = (profile: FamilyMeasurementProfile): number => {
    const requiredMeasurements = ['chest', 'waist', 'hips', 'shoulderWidth'];
    const completedMeasurements = requiredMeasurements.filter(
      key => profile.measurements && profile.measurements[key]
    );
    return Math.round((completedMeasurements.length / requiredMeasurements.length) * 100);
  };

  // Format last updated date
  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  // Check if measurements are outdated
  const isMeasurementsOutdated = (profile: FamilyMeasurementProfile): boolean => {
    const now = new Date();
    const lastUpdated = new Date(profile.lastUpdated);
    const diffMonths = (now.getFullYear() - lastUpdated.getFullYear()) * 12 + 
                      (now.getMonth() - lastUpdated.getMonth());
    
    // For children, measurements older than 3 months are outdated
    if (profile.relationship === RelationshipType.CHILD && profile.age && profile.age < 18) {
      return diffMonths > 3;
    }
    
    // For adults, measurements older than 6 months are outdated
    return diffMonths > 6;
  };

  // Register skip link and announce changes
  useEffect(() => {
    addSkipLink('family-profiles', 'Family Profile Selection');
    
    return () => {
      removeSkipLink('family-profiles');
    };
  }, [addSkipLink, removeSkipLink]);

  // Announce filter changes
  useEffect(() => {
    if (searchQuery || filterRelationship !== 'all') {
      const count = filteredProfiles.length;
      const filterDescription = filterRelationship !== 'all' 
        ? `filtered by ${RELATIONSHIP_LABELS[filterRelationship as RelationshipType]}` 
        : '';
      const searchDescription = searchQuery ? `matching "${searchQuery}"` : '';
      
      let message = `${count} family member${count !== 1 ? 's' : ''} found`;
      if (filterDescription && searchDescription) {
        message += ` ${filterDescription} and ${searchDescription}`;
      } else if (filterDescription) {
        message += ` ${filterDescription}`;
      } else if (searchDescription) {
        message += ` ${searchDescription}`;
      }
      
      announce(message, 'polite');
    }
  }, [filteredProfiles.length, searchQuery, filterRelationship, announce]);

  return (
    <div className={cn("space-y-6", className)} role="main" aria-labelledby="family-selector-heading">
      {/* Header */}
      <div id="family-profiles">
        <h3 id="family-selector-heading" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" aria-hidden="true" />
          Select Family Member
        </h3>
        <p className="text-sm text-gray-600 mt-1" id="family-selector-description">
          Choose whose measurements to use for this order. {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} available.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center" role="search" aria-labelledby="search-filters-heading">
        <h4 id="search-filters-heading" className="sr-only">Search and filter family members</h4>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
          <Input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            aria-label="Search family members by name"
            aria-describedby="search-help"
          />
          <div id="search-help" className="sr-only">
            Type to search family members by their nickname or name
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="relationship-filter" className="text-sm whitespace-nowrap">
            Filter by:
          </Label>
          <select
            id="relationship-filter"
            value={filterRelationship}
            onChange={(e) => setFilterRelationship(e.target.value as RelationshipType | 'all')}
            className="px-3 py-1 border rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-primary"
            aria-label="Filter family members by relationship type"
            aria-describedby="filter-help"
          >
            <option value="all">All Members</option>
            {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div id="filter-help" className="sr-only">
            Select a relationship type to filter the family member list
          </div>
        </div>
      </div>

      {/* Quick Selection for Common Profiles */}
      {profiles.length > 3 && (
        <div 
          className="p-3 bg-blue-50 border border-blue-200 rounded-lg"
          role="group"
          aria-labelledby="quick-select-heading"
        >
          <p id="quick-select-heading" className="text-sm font-medium text-blue-900 mb-2">Quick Select</p>
          <div className="flex flex-wrap gap-2" role="list">
            {profiles.slice(0, 3).map(profile => (
              <Button
                key={profile.id}
                variant={selectedProfileId === profile.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onSelectProfile(profile)}
                aria-pressed={selectedProfileId === profile.id}
                aria-describedby={`quick-${profile.id}-desc`}
                role="listitem"
              >
                <User className="h-3 w-3 mr-1" aria-hidden="true" />
                {profile.nickname}
                <span id={`quick-${profile.id}-desc`} className="sr-only">
                  {RELATIONSHIP_LABELS[profile.relationship as RelationshipType]} - Quick select for order
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Profile Selection Grid */}
      <RadioGroup 
        value={selectedProfileId} 
        onValueChange={(value) => {
          const profile = profiles.find(p => p.id === value);
          if (profile) onSelectProfile(profile);
        }}
        aria-labelledby="family-selector-heading"
        aria-describedby="family-selector-description"
      >
        <div className="grid gap-4 md:grid-cols-2" ref={gridContainerRef}>
          {Object.entries(groupedProfiles).map(([relationship, relationshipProfiles]) => (
            <React.Fragment key={relationship}>
              {relationshipProfiles.map(profile => {
                const completeness = getMeasurementCompleteness(profile);
                const isOutdated = isMeasurementsOutdated(profile);
                const isSelected = selectedProfileId === profile.id;
                
                return (
                  <Card 
                    key={profile.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                      isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => onSelectProfile(profile)}
                    role="article"
                    aria-labelledby={`profile-name-${profile.id}`}
                    aria-describedby={`profile-details-${profile.id}`}
                    data-profile-card
                    data-profile-id={profile.id}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem 
                          value={profile.id} 
                          id={profile.id}
                          className="mt-1"
                          aria-describedby={`profile-summary-${profile.id}`}
                        />
                        
                        <div className="flex-1 min-w-0">
                          {/* Profile Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <Label 
                                htmlFor={profile.id}
                                id={`profile-name-${profile.id}`}
                                className="text-base font-medium cursor-pointer"
                              >
                                {profile.nickname}
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={RELATIONSHIP_COLORS[profile.relationship as RelationshipType]}>
                                  {RELATIONSHIP_LABELS[profile.relationship as RelationshipType]}
                                </Badge>
                                {profile.age && (
                                  <span className="text-sm text-gray-600">
                                    {profile.age} years
                                  </span>
                                )}
                                {profile.gender && (
                                  <Badge variant="outline" className="text-xs">
                                    {profile.gender}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {isSelected && (
                              <Check className="h-5 w-5 text-primary" aria-label="Selected profile" />
                            )}
                            <div id={`profile-summary-${profile.id}`} className="sr-only">
                              {profile.nickname}, {RELATIONSHIP_LABELS[profile.relationship as RelationshipType]}, 
                              {profile.age && ` ${profile.age} years old,`} 
                              measurements {completeness}% complete
                              {isOutdated && ', measurements need updating'}
                              {isSelected && ', currently selected'}
                            </div>
                          </div>

                          {/* Measurement Info */}
                          <div className="space-y-2" id={`profile-details-${profile.id}`}>
                            {/* Completeness Bar */}
                            <div>
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-gray-600">Measurements</span>
                                <span className={cn(
                                  "font-medium",
                                  completeness === 100 ? "text-green-600" : "text-orange-600"
                                )}>
                                  {completeness}% complete
                                </span>
                              </div>
                              <div 
                                className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
                                role="progressbar"
                                aria-valuenow={completeness}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`Measurements completion: ${completeness} percent`}
                              >
                                <div 
                                  className={cn(
                                    "h-full transition-all",
                                    completeness === 100 ? "bg-green-500" : "bg-orange-500"
                                  )}
                                  style={{ width: `${completeness}%` }}
                                />
                              </div>
                            </div>

                            {/* Key Measurements */}
                            {profile.measurements && (
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(profile.measurements)
                                  .slice(0, 4)
                                  .map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                      <span className="text-gray-500 capitalize">{key}:</span>
                                      <span className="font-medium">{value}cm</span>
                                    </div>
                                  ))
                                }
                              </div>
                            )}

                            {/* Last Updated */}
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" aria-hidden="true" />
                                <span>Updated {formatLastUpdated(profile.lastUpdated)}</span>
                              </div>
                              
                              {isOutdated && (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border-orange-200 text-orange-700"
                                  role="status"
                                  aria-label="Measurements are outdated and need updating"
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                                  Needs update
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          {showQuickActions && (
                            <div className="flex items-center gap-2 mt-3 pt-3 border-t" role="group" aria-label={`Actions for ${profile.nickname}`}>
                              {onEditProfile && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditProfile(profile.id);
                                  }}
                                  aria-label={`Edit profile for ${profile.nickname}`}
                                >
                                  <Edit className="h-3 w-3 mr-1" aria-hidden="true" />
                                  Edit
                                </Button>
                              )}
                              
                              {onCopyMeasurements && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onCopyMeasurements(profile);
                                  }}
                                  aria-label={`Copy measurements from ${profile.nickname}`}
                                >
                                  <Copy className="h-3 w-3 mr-1" aria-hidden="true" />
                                  Copy
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectProfile(profile);
                                }}
                                aria-label={`Select ${profile.nickname} for this order`}
                              >
                                Select
                                <ChevronRight className="h-3 w-3 ml-1" aria-hidden="true" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </RadioGroup>

      {/* Empty State */}
      {filteredProfiles.length === 0 && (
        <Card role="status" aria-live="polite">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || filterRelationship !== 'all' 
                  ? 'No family members found'
                  : 'No family profiles yet'}
              </h4>
              <p className="text-gray-600 mb-4">
                {searchQuery || filterRelationship !== 'all' 
                  ? 'Try adjusting your search terms or filter settings'
                  : 'Create your first family member profile to get started'}
              </p>
              {onCreateNewProfile && (
                <Button onClick={onCreateNewProfile} aria-describedby="add-member-help">
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Family Member
                </Button>
              )}
              <div id="add-member-help" className="sr-only">
                Click to create a new family member profile with measurements
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Profile Option */}
      {onCreateNewProfile && filteredProfiles.length > 0 && (
        <Card 
          className="border-dashed border-2 hover:border-primary cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2"
          onClick={onCreateNewProfile}
          role="button"
          tabIndex={0}
          aria-label="Add new family member profile"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCreateNewProfile();
            }
          }}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Plus className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h4 className="font-medium text-gray-900">Add New Family Member</h4>
              <p className="text-sm text-gray-600 mt-1">
                Create a new profile with measurements
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
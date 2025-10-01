/**
 * Constants and mappings for family relationships
 * Includes Ghana-specific relationship terms and cultural considerations
 */

import { RelationshipType } from '../types/family-profiles';

// Ghana cultural relationship terms mapping
export const GHANA_RELATIONSHIP_TERMS: Record<RelationshipType, {
  english: string;
  twi: string;
  ga: string;
  displayName: string;
  shortName: string;
}> = {
  [RelationshipType.SELF]: {
    english: 'Self',
    twi: 'Me',
    ga: 'Mi',
    displayName: 'Myself',
    shortName: 'Me'
  },
  [RelationshipType.SPOUSE]: {
    english: 'Spouse',
    twi: 'Wo yere/wo kun',
    ga: 'Wo yoo/wo tsoo',
    displayName: 'My Spouse',
    shortName: 'Spouse'
  },
  [RelationshipType.CHILD]: {
    english: 'Child',
    twi: 'Wo ba',
    ga: 'Wo tso',
    displayName: 'My Child',
    shortName: 'Child'
  },
  [RelationshipType.PARENT]: {
    english: 'Parent',
    twi: 'Wo maam/wo papa',
    ga: 'Wo maa/wo da',
    displayName: 'My Parent',
    shortName: 'Parent'
  },
  [RelationshipType.SIBLING]: {
    english: 'Sibling',
    twi: 'Wo nua',
    ga: 'Wo nɔ',
    displayName: 'My Sibling',
    shortName: 'Sibling'
  },
  [RelationshipType.OTHER]: {
    english: 'Other',
    twi: 'Foforo',
    ga: 'Bubu',
    displayName: 'Other Family',
    shortName: 'Other'
  }
};

// Specific relationship subtypes for better UI
export const RELATIONSHIP_SUBTYPES: Record<RelationshipType, string[]> = {
  [RelationshipType.SELF]: ['Myself'],
  [RelationshipType.SPOUSE]: ['Husband', 'Wife', 'Partner'],
  [RelationshipType.CHILD]: [
    'Son', 'Daughter', 'Stepson', 'Stepdaughter',
    'Adopted Son', 'Adopted Daughter'
  ],
  [RelationshipType.PARENT]: [
    'Father', 'Mother', 'Dad', 'Mum', 'Daddy', 'Mummy',
    'Stepfather', 'Stepmother', 'Adoptive Father', 'Adoptive Mother'
  ],
  [RelationshipType.SIBLING]: [
    'Brother', 'Sister', 'Big Brother', 'Big Sister',
    'Little Brother', 'Little Sister', 'Twin Brother', 'Twin Sister',
    'Half Brother', 'Half Sister', 'Stepbrother', 'Stepsister'
  ],
  [RelationshipType.OTHER]: [
    'Grandfather', 'Grandmother', 'Grandpa', 'Grandma',
    'Uncle', 'Aunt', 'Nephew', 'Niece', 'Cousin',
    'Father-in-law', 'Mother-in-law', 'Brother-in-law', 'Sister-in-law',
    'Godfather', 'Godmother', 'Family Friend'
  ]
};

// Ghana-specific family terms (commonly used nicknames)
export const GHANA_FAMILY_NICKNAMES: Record<RelationshipType, string[]> = {
  [RelationshipType.SELF]: ['Me', 'Myself'],
  [RelationshipType.SPOUSE]: ['My Love', 'Honey', 'Darling'],
  [RelationshipType.CHILD]: [
    'Baby', 'Little One', 'Princess', 'Prince',
    'Junior', 'Small Boy', 'Small Girl'
  ],
  [RelationshipType.PARENT]: [
    'Daddy', 'Mummy', 'Papa', 'Mama',
    'Old Man', 'Old Lady', 'Boss'
  ],
  [RelationshipType.SIBLING]: [
    'Big Bro', 'Big Sis', 'Little Bro', 'Little Sis',
    'Twin', 'Brother', 'Sister'
  ],
  [RelationshipType.OTHER]: [
    'Grandpa', 'Grandma', 'Uncle', 'Auntie',
    'Cousin', 'In-law', 'Family'
  ]
};

// Relationship hierarchy for family permissions
export const RELATIONSHIP_HIERARCHY: Record<RelationshipType, number> = {
  [RelationshipType.SELF]: 0, // Highest authority
  [RelationshipType.SPOUSE]: 1,
  [RelationshipType.PARENT]: 2,
  [RelationshipType.SIBLING]: 3,
  [RelationshipType.CHILD]: 4,
  [RelationshipType.OTHER]: 5 // Lowest authority
};

// Age-based relationship validation
export const RELATIONSHIP_AGE_CONSTRAINTS: Record<RelationshipType, {
  minAge?: number;
  maxAge?: number;
  relativeToOwner?: 'YOUNGER' | 'OLDER' | 'EITHER';
}> = {
  [RelationshipType.SELF]: {
    minAge: 13, // Minimum age to have own profile
    maxAge: 120
  },
  [RelationshipType.SPOUSE]: {
    minAge: 18, // Legal marriage age in Ghana
    maxAge: 120,
    relativeToOwner: 'EITHER'
  },
  [RelationshipType.CHILD]: {
    minAge: 0,
    maxAge: 25, // Adult children
    relativeToOwner: 'YOUNGER'
  },
  [RelationshipType.PARENT]: {
    minAge: 15, // Young parent scenario
    maxAge: 120,
    relativeToOwner: 'OLDER'
  },
  [RelationshipType.SIBLING]: {
    minAge: 0,
    maxAge: 120,
    relativeToOwner: 'EITHER'
  },
  [RelationshipType.OTHER]: {
    minAge: 0,
    maxAge: 120,
    relativeToOwner: 'EITHER'
  }
};

// Default measurement templates by relationship and age
export const DEFAULT_MEASUREMENT_TEMPLATES: Record<RelationshipType, {
  ageRanges: {
    minAge: number;
    maxAge: number;
    measurements: Record<string, number>;
    description: string;
  }[];
}> = {
  [RelationshipType.SELF]: {
    ageRanges: [
      {
        minAge: 18,
        maxAge: 120,
        measurements: { chest: 90, waist: 80, hips: 95, shoulderWidth: 45 },
        description: 'Adult measurements'
      }
    ]
  },
  [RelationshipType.SPOUSE]: {
    ageRanges: [
      {
        minAge: 18,
        maxAge: 120,
        measurements: { chest: 85, waist: 75, hips: 90, shoulderWidth: 42 },
        description: 'Adult spouse measurements'
      }
    ]
  },
  [RelationshipType.CHILD]: {
    ageRanges: [
      {
        minAge: 0,
        maxAge: 2,
        measurements: { chest: 50, waist: 48, shoulderWidth: 22 },
        description: 'Infant measurements'
      },
      {
        minAge: 3,
        maxAge: 7,
        measurements: { chest: 60, waist: 55, shoulderWidth: 28 },
        description: 'Toddler measurements'
      },
      {
        minAge: 8,
        maxAge: 12,
        measurements: { chest: 70, waist: 65, shoulderWidth: 32 },
        description: 'Child measurements'
      },
      {
        minAge: 13,
        maxAge: 17,
        measurements: { chest: 80, waist: 70, shoulderWidth: 38 },
        description: 'Teen measurements'
      }
    ]
  },
  [RelationshipType.PARENT]: {
    ageRanges: [
      {
        minAge: 40,
        maxAge: 120,
        measurements: { chest: 95, waist: 85, hips: 100, shoulderWidth: 47 },
        description: 'Parent measurements'
      }
    ]
  },
  [RelationshipType.SIBLING]: {
    ageRanges: [
      {
        minAge: 0,
        maxAge: 12,
        measurements: { chest: 65, waist: 60, shoulderWidth: 30 },
        description: 'Young sibling measurements'
      },
      {
        minAge: 13,
        maxAge: 120,
        measurements: { chest: 85, waist: 75, shoulderWidth: 40 },
        description: 'Adult sibling measurements'
      }
    ]
  },
  [RelationshipType.OTHER]: {
    ageRanges: [
      {
        minAge: 0,
        maxAge: 120,
        measurements: { chest: 85, waist: 80, shoulderWidth: 42 },
        description: 'General family member measurements'
      }
    ]
  }
};

// Growth tracking configurations by relationship
export const GROWTH_TRACKING_DEFAULTS: Record<RelationshipType, {
  defaultFrequency: string;
  autoEnable: boolean;
  trackUntilAge?: number;
}> = {
  [RelationshipType.SELF]: {
    defaultFrequency: 'NEVER',
    autoEnable: false
  },
  [RelationshipType.SPOUSE]: {
    defaultFrequency: 'NEVER',
    autoEnable: false
  },
  [RelationshipType.CHILD]: {
    defaultFrequency: 'QUARTERLY',
    autoEnable: true,
    trackUntilAge: 18
  },
  [RelationshipType.PARENT]: {
    defaultFrequency: 'NEVER',
    autoEnable: false
  },
  [RelationshipType.SIBLING]: {
    defaultFrequency: 'BIANNUALLY',
    autoEnable: true,
    trackUntilAge: 16
  },
  [RelationshipType.OTHER]: {
    defaultFrequency: 'NEVER',
    autoEnable: false
  }
};

// Privacy defaults by relationship
export const PRIVACY_DEFAULTS: Record<RelationshipType, {
  defaultVisibility: string;
  defaultSharing: boolean;
  defaultEditing: boolean;
}> = {
  [RelationshipType.SELF]: {
    defaultVisibility: 'FAMILY_ONLY',
    defaultSharing: true,
    defaultEditing: false
  },
  [RelationshipType.SPOUSE]: {
    defaultVisibility: 'FAMILY_ONLY',
    defaultSharing: true,
    defaultEditing: true
  },
  [RelationshipType.CHILD]: {
    defaultVisibility: 'FAMILY_ONLY',
    defaultSharing: true,
    defaultEditing: true
  },
  [RelationshipType.PARENT]: {
    defaultVisibility: 'PRIVATE',
    defaultSharing: false,
    defaultEditing: false
  },
  [RelationshipType.SIBLING]: {
    defaultVisibility: 'FAMILY_ONLY',
    defaultSharing: true,
    defaultEditing: false
  },
  [RelationshipType.OTHER]: {
    defaultVisibility: 'PRIVATE',
    defaultSharing: false,
    defaultEditing: false
  }
};

// Utility functions for relationship handling
export const getRelationshipDisplayName = (
  relationship: RelationshipType, 
  language: 'en' | 'twi' | 'ga' = 'en'
): string => {
  const terms = GHANA_RELATIONSHIP_TERMS[relationship];
  switch (language) {
    case 'twi':
      return terms.twi;
    case 'ga':
      return terms.ga;
    default:
      return terms.displayName;
  }
};

export const getRelationshipSubtypes = (relationship: RelationshipType): string[] => {
  return RELATIONSHIP_SUBTYPES[relationship] || [];
};

export const canEditProfile = (
  userRelationship: RelationshipType,
  profileRelationship: RelationshipType
): boolean => {
  const userLevel = RELATIONSHIP_HIERARCHY[userRelationship];
  const profileLevel = RELATIONSHIP_HIERARCHY[profileRelationship];
  
  // Users can edit profiles of equal or lower hierarchy
  return userLevel <= profileLevel;
};

export const getDefaultMeasurements = (
  relationship: RelationshipType,
  age: number
): Record<string, number> => {
  const template = DEFAULT_MEASUREMENT_TEMPLATES[relationship];
  const ageRange = template.ageRanges.find(
    range => age >= range.minAge && age <= range.maxAge
  );
  
  return ageRange?.measurements || {};
};

export const shouldEnableGrowthTracking = (
  relationship: RelationshipType,
  age?: number
): boolean => {
  const config = GROWTH_TRACKING_DEFAULTS[relationship];
  
  if (!config.autoEnable) return false;
  if (!age) return relationship === RelationshipType.CHILD;
  if (config.trackUntilAge && age >= config.trackUntilAge) return false;
  
  return true;
};

export const getDefaultPrivacySettings = (relationship: RelationshipType) => {
  return PRIVACY_DEFAULTS[relationship];
};

// Export all constants as a collection
export const RelationshipConstants = {
  GHANA_RELATIONSHIP_TERMS,
  RELATIONSHIP_SUBTYPES,
  GHANA_FAMILY_NICKNAMES,
  RELATIONSHIP_HIERARCHY,
  RELATIONSHIP_AGE_CONSTRAINTS,
  DEFAULT_MEASUREMENT_TEMPLATES,
  GROWTH_TRACKING_DEFAULTS,
  PRIVACY_DEFAULTS
} as const;
/**
 * Garment types constants for the Sew4Mi platform
 * Ghana-specific garment types with cultural considerations
 */

import { GarmentTypeOption, GarmentCategory, FabricType } from '../types/order-creation';

export const GARMENT_TYPES: Record<string, GarmentTypeOption> = {
  CUSTOM_SUIT: {
    id: 'custom-suit',
    name: 'Custom Suit',
    description: 'Tailored business suit with jacket and trousers',
    category: GarmentCategory.FORMAL,
    imageUrl: '/images/garments/custom-suit.jpg',
    basePrice: 300.00,
    estimatedDays: 21,
    fabricRequirements: {
      yardsNeeded: 3.5,
      supportedTypes: [FabricType.WOOL, FabricType.COTTON, FabricType.BLEND],
      preferredWidth: 60
    },
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength', 'inseam', 'outseam'],
    isActive: true
  },
  
  KENTE_SHIRT: {
    id: 'kente-shirt',
    name: 'Kente Shirt',
    description: 'Traditional Ghanaian shirt with authentic Kente patterns',
    category: GarmentCategory.TRADITIONAL,
    imageUrl: '/images/garments/kente-shirt.jpg',
    basePrice: 80.00,
    estimatedDays: 7,
    fabricRequirements: {
      yardsNeeded: 2.0,
      supportedTypes: [FabricType.KENTE, FabricType.COTTON],
      preferredWidth: 45
    },
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
    isActive: true
  },

  DASHIKI: {
    id: 'dashiki',
    name: 'Dashiki',
    description: 'African traditional shirt with colorful patterns',
    category: GarmentCategory.TRADITIONAL,
    imageUrl: '/images/garments/dashiki.jpg',
    basePrice: 60.00,
    estimatedDays: 5,
    fabricRequirements: {
      yardsNeeded: 2.0,
      supportedTypes: [FabricType.COTTON, FabricType.BATIK, FabricType.BLEND],
      preferredWidth: 45
    },
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
    isActive: true
  },

  CASUAL_SHIRT: {
    id: 'casual-shirt',
    name: 'Casual Shirt',
    description: 'Everyday dress shirt for casual wear',
    category: GarmentCategory.CASUAL,
    imageUrl: '/images/garments/casual-shirt.jpg',
    basePrice: 40.00,
    estimatedDays: 7,
    fabricRequirements: {
      yardsNeeded: 2.5,
      supportedTypes: [FabricType.COTTON, FabricType.LINEN, FabricType.BLEND],
      preferredWidth: 45
    },
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
    isActive: true
  },

  WEDDING_DRESS: {
    id: 'wedding-dress',
    name: 'Wedding Dress',
    description: 'Custom bridal gown for special occasions',
    category: GarmentCategory.SPECIAL_OCCASION,
    imageUrl: '/images/garments/wedding-dress.jpg',
    basePrice: 500.00,
    estimatedDays: 30,
    fabricRequirements: {
      yardsNeeded: 6.0,
      supportedTypes: [FabricType.SILK, FabricType.COTTON, FabricType.LINEN],
      preferredWidth: 45
    },
    measurementsRequired: ['chest', 'waist', 'hips', 'shoulderWidth', 'sleeveLength', 'outseam'],
    isActive: true
  },

  FUNERAL_CLOTH: {
    id: 'funeral-cloth',
    name: 'Funeral Cloth',
    description: 'Traditional mourning attire for funeral ceremonies',
    category: GarmentCategory.TRADITIONAL,
    imageUrl: '/images/garments/funeral-cloth.jpg',
    basePrice: 120.00,
    estimatedDays: 10,
    fabricRequirements: {
      yardsNeeded: 4.0,
      supportedTypes: [FabricType.COTTON, FabricType.BLEND],
      preferredWidth: 45
    },
    measurementsRequired: ['chest', 'waist', 'hips', 'shoulderWidth'],
    isActive: true
  },

  OFFICE_DRESS: {
    id: 'office-dress',
    name: 'Office Dress',
    description: 'Professional dress for office wear',
    category: GarmentCategory.FORMAL,
    imageUrl: '/images/garments/office-dress.jpg',
    basePrice: 150.00,
    estimatedDays: 14,
    fabricRequirements: {
      yardsNeeded: 3.0,
      supportedTypes: [FabricType.COTTON, FabricType.POLYESTER, FabricType.BLEND],
      preferredWidth: 45
    },
    measurementsRequired: ['chest', 'waist', 'hips', 'shoulderWidth', 'outseam'],
    isActive: true
  },

  TRADITIONAL_SMOCK: {
    id: 'traditional-smock',
    name: 'Traditional Smock',
    description: 'Northern Ghana traditional smock',
    category: GarmentCategory.TRADITIONAL,
    imageUrl: '/images/garments/traditional-smock.jpg',
    basePrice: 100.00,
    estimatedDays: 10,
    fabricRequirements: {
      yardsNeeded: 3.0,
      supportedTypes: [FabricType.COTTON, FabricType.BLEND],
      preferredWidth: 45
    },
    measurementsRequired: ['chest', 'waist', 'shoulderWidth', 'sleeveLength'],
    isActive: true
  }
};

export const GARMENT_CATEGORIES = {
  [GarmentCategory.FORMAL]: {
    label: 'Formal Wear',
    description: 'Professional and business attire',
    icon: '👔'
  },
  [GarmentCategory.CASUAL]: {
    label: 'Casual Wear',
    description: 'Everyday comfortable clothing',
    icon: '👕'
  },
  [GarmentCategory.TRADITIONAL]: {
    label: 'Traditional Wear',
    description: 'Authentic Ghanaian cultural attire',
    icon: '🇬🇭'
  },
  [GarmentCategory.SPECIAL_OCCASION]: {
    label: 'Special Occasion',
    description: 'Wedding, ceremony, and celebration attire',
    icon: '✨'
  }
};

export const URGENCY_SURCHARGE_MULTIPLIER = 1.25; // 25% surcharge for express delivery

export const DEFAULT_MEASUREMENT_UNITS = 'cm';

export const MIN_ORDER_AMOUNT = 30.00; // Minimum order amount in GHS

export const MAX_SPECIAL_INSTRUCTIONS_LENGTH = 500;
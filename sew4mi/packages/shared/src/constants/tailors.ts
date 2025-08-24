export const TAILOR_SPECIALIZATIONS = [
  'Kaba & Slit',
  'Men\'s Suits',
  'Women\'s Dresses',
  'Traditional Wear',
  'Wedding Gowns',
  'Bridesmaid Dresses',
  'School Uniforms',
  'Corporate Wear',
  'Casual Wear',
  'Children\'s Clothing',
  'Embroidery',
  'Alterations',
  'Custom Design',
  'African Print',
  'Kente Designs',
] as const;

export const TAILOR_GARMENT_CATEGORIES = [
  'Shirt',
  'Dress',
  'Suit',
  'Kaba & Slit',
  'Trousers',
  'Skirt',
  'Blouse',
  'Jacket',
  'Traditional Outfit',
  'Wedding Gown',
  'Bridesmaid Dress',
  'School Uniform',
  'Corporate Uniform',
  'Children\'s Wear',
  'Alterations',
] as const;

export const PRICE_FACTORS = [
  'fabric',
  'complexity',
  'urgency',
  'embellishments',
  'lining',
  'customization',
  'embroidery',
  'style',
  'design',
] as const;

export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Eastern',
  'Central',
  'Northern',
  'Upper East',
  'Upper West',
  'Volta',
  'Brong Ahafo',
  'Western North',
  'Ahafo',
  'Bono East',
  'Oti',
  'North East',
  'Savannah',
] as const;

export const MAJOR_CITIES = {
  'Greater Accra': ['Accra', 'Tema', 'Kasoa', 'Madina', 'Ashaiman'],
  'Ashanti': ['Kumasi', 'Obuasi', 'Ejisu', 'Tafo', 'Konongo'],
  'Western': ['Takoradi', 'Sekondi', 'Tarkwa', 'Prestea', 'Axim'],
  'Eastern': ['Koforidua', 'Akim Oda', 'Akwatia', 'Kade', 'Suhum'],
  'Central': ['Cape Coast', 'Kasoa', 'Winneba', 'Agona Swedru', 'Mankessim'],
  'Northern': ['Tamale', 'Yendi', 'Damongo', 'Salaga', 'Bimbilla'],
  'Upper East': ['Bolgatanga', 'Bawku', 'Navrongo', 'Paga', 'Zebilla'],
  'Upper West': ['Wa', 'Tumu', 'Lawra', 'Jirapa', 'Nadowli'],
  'Volta': ['Ho', 'Aflao', 'Keta', 'Hohoe', 'Kpando'],
  'Brong Ahafo': ['Sunyani', 'Techiman', 'Berekum', 'Wenchi', 'Kintampo'],
} as const;

export const DEFAULT_WORKING_HOURS = {
  monday: { open: '08:00', close: '18:00', isOpen: true },
  tuesday: { open: '08:00', close: '18:00', isOpen: true },
  wednesday: { open: '08:00', close: '18:00', isOpen: true },
  thursday: { open: '08:00', close: '18:00', isOpen: true },
  friday: { open: '08:00', close: '18:00', isOpen: true },
  saturday: { open: '09:00', close: '16:00', isOpen: true },
  sunday: { open: '00:00', close: '00:00', isOpen: false },
};

export const RATING_CATEGORIES = {
  overall: 'Overall Rating',
  quality: 'Quality of Work',
  communication: 'Communication',
  timeliness: 'Timeliness',
  value: 'Value for Money',
} as const;

export const AVAILABILITY_STATUS = {
  AVAILABLE: {
    label: 'Available',
    color: 'green',
    description: 'Accepting new orders',
  },
  BUSY: {
    label: 'Busy',
    color: 'yellow',
    description: 'Limited availability',
  },
  BLOCKED: {
    label: 'Unavailable',
    color: 'red',
    description: 'Not accepting orders',
  },
} as const;

export const VERIFICATION_STATUS = {
  PENDING: {
    label: 'Pending Verification',
    color: 'yellow',
    icon: '⏳',
  },
  VERIFIED: {
    label: 'Verified',
    color: 'green',
    icon: '✓',
  },
  SUSPENDED: {
    label: 'Suspended',
    color: 'red',
    icon: '⚠',
  },
} as const;

export const PORTFOLIO_CATEGORIES = [
  'All Work',
  'Traditional',
  'Modern',
  'Wedding',
  'Corporate',
  'Casual',
  'Children',
  'Alterations',
] as const;

export const RESPONSE_TIME_RANGES = {
  EXCELLENT: { max: 2, label: 'Within 2 hours' },
  GOOD: { max: 6, label: 'Within 6 hours' },
  AVERAGE: { max: 24, label: 'Within 24 hours' },
  SLOW: { max: 48, label: 'Within 2 days' },
  VERY_SLOW: { max: Infinity, label: 'More than 2 days' },
} as const;

export const DELIVERY_TIME_RANGES = {
  EXPRESS: { max: 3, label: '1-3 days' },
  FAST: { max: 7, label: '4-7 days' },
  STANDARD: { max: 14, label: '1-2 weeks' },
  EXTENDED: { max: 21, label: '2-3 weeks' },
  CUSTOM: { max: Infinity, label: 'More than 3 weeks' },
} as const;

export const TAILOR_PROFILE_LIMITS = {
  MAX_PORTFOLIO_IMAGES: 20,
  MAX_REVIEW_PHOTOS: 5,
  MAX_SPECIALIZATIONS: 10,
  MIN_PORTFOLIO_IMAGES: 5,
  MAX_BIO_LENGTH: 500,
  MAX_VACATION_MESSAGE_LENGTH: 200,
  MAX_REVIEW_TEXT_LENGTH: 1000,
  MAX_PRICING_ITEMS: 20,
} as const;

export const WHATSAPP_MESSAGE_TEMPLATES = {
  INITIAL_CONTACT: `Hello! I found your profile on Sew4Mi and I'm interested in your tailoring services.`,
  ORDER_INQUIRY: `Hi! I'd like to inquire about getting a {garmentType} made. My budget is around GHS {budget} and I need it by {deliveryDate}.`,
  AVAILABILITY_CHECK: `Hello! Are you available to take on a new order for {garmentType}? I need it completed by {date}.`,
  PRICE_INQUIRY: `Hi! Could you please provide a quote for {garmentType}? I'm looking for {details}.`,
} as const;

export const STATISTICS_UPDATE_INTERVALS = {
  REAL_TIME: ['rating', 'totalReviews'],
  HOURLY: ['averageResponseHours', 'currentLoad'],
  DAILY: ['completedOrders', 'onTimeDeliveryRate'],
  WEEKLY: ['completionRate'],
} as const;
export * from './database'
export * from './repository'
export * from './payment'
export * from './escrow'
export * from './milestone'
export * from './dispute'
export * from './tailor'
export * from './order-creation'
export * from './family-profiles'
export * from './group-order'
export * from './loyalty'
export * from './favorites'
export * from './reorder'
// Search types are exported separately to avoid conflicts
export type {
  TailorSearchResult,
  TailorSearchItem,
  AutocompleteResult,
  AutocompleteSuggestion,
  CustomerFavorite,
  FeaturedTailorCriteria,
  FeaturedTailor,
  SearchAnalytics,
  TailorSearchStats,
} from './search';

import { UserRole } from '../constants/roles';
import { EscrowStage } from './escrow';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  tailorId: string;
  status: OrderStatus;
  totalAmount: number;
  escrowAmount: number; // Legacy field, kept for backward compatibility
  escrowStage: EscrowStage;
  depositAmount: number;
  fittingAmount: number;
  finalAmount: number;
  escrowBalance: number;
  depositPaidAt?: Date;
  fittingPaidAt?: Date;
  finalPaidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PENDING_DEPOSIT = 'PENDING_DEPOSIT',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  IN_PROGRESS = 'in_progress',
  READY_FOR_FITTING = 'READY_FOR_FITTING',
  FITTING_APPROVED = 'FITTING_APPROVED',
  COMPLETING = 'COMPLETING',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export * from './database'
export * from './repository'

export interface User {
  id: string;
  email: string;
  role: 'customer' | 'tailor' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  customerId: string;
  tailorId: string;
  status: OrderStatus;
  totalAmount: number;
  escrowAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

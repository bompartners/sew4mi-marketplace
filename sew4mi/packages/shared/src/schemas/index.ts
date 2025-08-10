import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['customer', 'tailor', 'admin']),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  tailorId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed']),
  totalAmount: z.number().positive(),
  escrowAmount: z.number().positive(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type UserInput = z.infer<typeof UserSchema>;
export type OrderInput = z.infer<typeof OrderSchema>;
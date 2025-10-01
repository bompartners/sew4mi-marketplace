/**
 * Bulk Discount Calculation API Route
 * POST /api/orders/group/bulk-discount - Calculate bulk discount for group order
 */

import { NextRequest, NextResponse } from 'next/server';
import { bulkDiscountService } from '@/lib/services/bulk-discount.service';
import { createErrorResponse } from '@/lib/utils/api-error-handler';
import { CalculateBulkDiscountRequestSchema } from '@sew4mi/shared/schemas/group-order.schema';
import type { CalculateBulkDiscountRequest } from '@sew4mi/shared/types/group-order';

/**
 * POST /api/orders/group/bulk-discount
 * Calculate bulk discount for a set of order amounts
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = CalculateBulkDiscountRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    const discountRequest: CalculateBulkDiscountRequest = validationResult.data;
    
    // Additional validation
    const { isValid, errors } = bulkDiscountService.validateDiscountRequest(discountRequest);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid discount request',
          errors,
        },
        { status: 400 }
      );
    }
    
    // Calculate discount
    const discountResult = bulkDiscountService.calculateDiscount(discountRequest);
    
    // Get tier information
    const tierInfo = bulkDiscountService.getDiscountTierInfo(discountRequest.itemCount);
    
    // Calculate potential savings
    const potentialSavings = bulkDiscountService.calculatePotentialSavings(
      discountRequest.itemCount,
      discountResult.originalTotal
    );
    
    return NextResponse.json({
      success: true,
      ...discountResult,
      tierInfo,
      potentialSavings,
    });
    
  } catch (error) {
    console.error('Error calculating bulk discount:', error);
    return createErrorResponse(
      error as Error,
      500
    );
  }
}

